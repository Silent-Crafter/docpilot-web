import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import { streamResponse } from '../services/apiService';

const ChatContext = createContext();

function createNewConversation() {
  return {
    id: uuidv4(),
    title: 'New chat',
    messages: [],
    createdAt: new Date().toISOString(),
  };
}

// ✅ LOAD FROM LOCALSTORAGE
const initialState = (() => {
  try {
    const saved = localStorage.getItem('chatState');

    if (!saved) {
      return {
        conversations: [],
        activeConversationId: null,
        isGenerating: false,
      };
    }

    const parsed = JSON.parse(saved);

    // ✅ VALIDATION (VERY IMPORTANT)
    if (
      typeof parsed !== 'object' ||
      !Array.isArray(parsed.conversations)
    ) {
      throw new Error("Invalid state");
    }

    return {
      conversations: parsed.conversations || [],
      activeConversationId: null,
      isGenerating: false, // always reset this
    };

  } catch (e) {
    console.warn("Resetting corrupted chat state");

    return {
      conversations: [],
      activeConversationId: null,
      isGenerating: false,
    };
  }
})();

function chatReducer(state, action) {
  switch (action.type) {
    case 'NEW_CHAT': {
      const newConv = action.conversation || createNewConversation();
      return {
        ...state,
        conversations: [newConv, ...state.conversations],
        activeConversationId: newConv.id,
      };
    }

    case 'DELETE_CHAT': {
      const remaining = state.conversations.filter(c => c.id !== action.id);
      return {
        ...state,
        conversations: remaining,
        activeConversationId:
          state.activeConversationId === action.id
            ? (remaining[0]?.id || null)
            : state.activeConversationId,
      };
    }

    case 'SET_ACTIVE': {
      return { ...state, activeConversationId: action.id };
    }

    case 'SEND_MESSAGE': {
      const { conversationId, message } = action;
      return {
        ...state,
        isGenerating: true,
        conversations: state.conversations.map(c =>
          c.id === conversationId
            ? {
                ...c,
                messages: [...c.messages, message],
                title:
                  c.messages.length === 0
                    ? message.content.slice(0, 40)
                    : c.title,
              }
            : c
        ),
      };
    }

    case 'ADD_ASSISTANT_MESSAGE': {
      const { conversationId, message } = action;
      return {
        ...state,
        conversations: state.conversations.map(c =>
          c.id === conversationId
            ? { ...c, messages: [...c.messages, message] }
            : c
        ),
      };
    }

    case 'UPDATE_ASSISTANT_MESSAGE': {
      const { conversationId, messageId, updates } = action;
      return {
        ...state,
        conversations: state.conversations.map(c =>
          c.id === conversationId
            ? {
                ...c,
                messages: c.messages.map(m =>
                  m.id === messageId ? { ...m, ...updates } : m
                ),
              }
            : c
        ),
      };
    }

    case 'SET_GENERATING': {
      return { ...state, isGenerating: action.value };
    }

    default:
      return state;
  }
}

function handleStreamEvent(event, dispatch, convId, assistantMsgId) {
  switch (event.type) {
    case 'query':
      dispatch({
        type: 'UPDATE_ASSISTANT_MESSAGE',
        conversationId: convId,
        messageId: assistantMsgId,
        updates: {
          content: '',
          statusText: `Searching for: ${event.content}`,
          statusDetail: event.status || '',
        },
      });
      break;

    case 'files':
      dispatch({
        type: 'UPDATE_ASSISTANT_MESSAGE',
        conversationId: convId,
        messageId: assistantMsgId,
        updates: {
          content: '',
          statusText: `Reading files: ${event.content}`,
          statusDetail: event.status || '',
        },
      });
      break;

    case 'answer':
      dispatch({
        type: 'UPDATE_ASSISTANT_MESSAGE',
        conversationId: convId,
        messageId: assistantMsgId,
        updates: {
          content: event.content,
          statusText: event.status || '',
          statusDetail: '',
        },
      });
      break;

    case 'answer_with_images':
      dispatch({
        type: 'UPDATE_ASSISTANT_MESSAGE',
        conversationId: convId,
        messageId: assistantMsgId,
        updates: {
          content: event.content,
          statusText: '',
          statusDetail: '',
        },
      });
      dispatch({ type: 'SET_GENERATING', value: false });
      break;

    default:
      break;
  }
}

export function ChatProvider({ children }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const cleanupRef = useRef(null);

  // ✅ SAVE TO LOCALSTORAGE
  useEffect(() => {
    localStorage.setItem('chatState', JSON.stringify(state));
  }, [state]);

  const sendMessage = useCallback((content, file = null) => {
    let convId = state.activeConversationId;

    const userMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      ...(file ? { attachment: { name: file.name, size: file.size } } : {}),
    };

    if (!convId) {
      const newConv = createNewConversation();
      convId = newConv.id;
      dispatch({ type: 'NEW_CHAT', conversation: newConv });
    }

    dispatch({
      type: 'SEND_MESSAGE',
      conversationId: convId,
      message: userMessage,
    });

    const assistantMsgId = uuidv4();
    dispatch({
      type: 'ADD_ASSISTANT_MESSAGE',
      conversationId: convId,
      message: {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        statusText: '',
        timestamp: new Date().toISOString(),
      },
    });

    const cleanup = streamResponse(
      content,
      file,
      (event) => handleStreamEvent(event, dispatch, convId, assistantMsgId),
      (err) => {
        console.error('Stream error:', err);
        dispatch({
          type: 'UPDATE_ASSISTANT_MESSAGE',
          conversationId: convId,
          messageId: assistantMsgId,
          updates: {
            content:
              'Sorry, something went wrong. Please check if the API server is running at `localhost:31337`.',
            statusText: '',
          },
        });
        dispatch({ type: 'SET_GENERATING', value: false });
      },
      () => {
        dispatch({ type: 'SET_GENERATING', value: false });
      }
    );

    if (cleanupRef.current) cleanupRef.current();
    cleanupRef.current = cleanup;
  }, [state.activeConversationId]);

  return (
    <ChatContext.Provider value={{ state, dispatch, sendMessage }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}