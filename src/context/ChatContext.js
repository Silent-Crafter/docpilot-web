import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  streamResponse,
  fetchChatHistory as apiFetchHistory,
  createNewChat as apiCreateNewChat,
} from '../services/apiService';

const ChatContext = createContext();

// ─── LocalStorage helpers (metadata only, no messages) ───────────────

const STORAGE_KEY = 'chatState';

function loadConversationsMeta() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    if (typeof parsed !== 'object' || !Array.isArray(parsed.conversations)) {
      throw new Error('Invalid state');
    }

    // Strip messages — only keep metadata
    return parsed.conversations.map(({ id, title, createdAt }) => ({
      id,
      title,
      createdAt,
      messages: [], // always empty on load
    }));
  } catch (e) {
    console.warn('Resetting corrupted chat state');
    return [];
  }
}

function saveConversationsMeta(conversations) {
  const metaOnly = conversations.map(({ id, title, createdAt }) => ({
    id,
    title,
    createdAt,
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ conversations: metaOnly }));
}

// ─── Initial state ───────────────────────────────────────────────────

const initialState = {
  conversations: loadConversationsMeta(),
  activeConversationId: null,
  isGenerating: false,
  loadingHistory: {}, // { [chatId]: boolean }
};

// ─── Reducer ─────────────────────────────────────────────────────────

function chatReducer(state, action) {
  switch (action.type) {
    case 'NEW_CHAT': {
      const newConv = action.conversation;
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

    case 'SET_MESSAGES': {
      const { conversationId, messages } = action;
      return {
        ...state,
        conversations: state.conversations.map(c =>
          c.id === conversationId ? { ...c, messages } : c
        ),
      };
    }

    case 'LOAD_HISTORY_START': {
      return {
        ...state,
        loadingHistory: { ...state.loadingHistory, [action.chatId]: true },
      };
    }

    case 'LOAD_HISTORY_DONE': {
      const next = { ...state.loadingHistory };
      delete next[action.chatId];
      return { ...state, loadingHistory: next };
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

// ─── Stream event handler ────────────────────────────────────────────

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

    case 'streaming_answer':
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

// ─── Provider ────────────────────────────────────────────────────────

export function ChatProvider({ children }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const cleanupRef = useRef(null);
  const historyFetchedRef = useRef(new Set()); // track which chats have been fetched

  // Persist metadata-only to localStorage whenever conversations change
  useEffect(() => {
    saveConversationsMeta(state.conversations);
  }, [state.conversations]);

  // Load chat history from API
  const loadChatHistory = useCallback(async (chatId) => {
    if (!chatId) return;

    // Don't re-fetch if already loaded or currently loading
    if (historyFetchedRef.current.has(chatId)) return;
    if (state.loadingHistory[chatId]) return;

    historyFetchedRef.current.add(chatId);
    dispatch({ type: 'LOAD_HISTORY_START', chatId });

    try {
      const rawMessages = await apiFetchHistory(chatId);

      // API returns: [{ role, content }, ...]
      // Normalize into our internal format with id + timestamp
      const messages = rawMessages.map((msg, idx) => ({
        id: `${chatId}-hist-${idx}`,
        role: msg.role,
        content: msg.content,
        timestamp: new Date().toISOString(),
      }));

      dispatch({ type: 'SET_MESSAGES', conversationId: chatId, messages });
    } catch (err) {
      console.error('Failed to load chat history:', err);
      // Even on failure, don't block — just leave messages empty
    } finally {
      dispatch({ type: 'LOAD_HISTORY_DONE', chatId });
    }
  }, [state.loadingHistory]);

  // Create a new chat (placeholder UUID for now)
  const startNewChat = useCallback(async () => {
    const chatId = await apiCreateNewChat();
    const newConv = {
      id: chatId,
      title: 'New chat',
      messages: [],
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'NEW_CHAT', conversation: newConv });
    return chatId;
  }, []);

  const sendMessage = useCallback((content, file = null) => {
    let convId = state.activeConversationId;

    const userMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      ...(file ? { attachment: { name: file.name, size: file.size } } : {}),
    };

    // If no active conversation, create one synchronously with client-side UUID
    // (the async startNewChat is used from UI; this is a fallback)
    if (!convId) {
      convId = uuidv4();
      const newConv = {
        id: convId,
        title: 'New chat',
        messages: [],
        createdAt: new Date().toISOString(),
      };
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

    return convId;
  }, [state.activeConversationId]);

  return (
    <ChatContext.Provider
      value={{ state, dispatch, sendMessage, loadChatHistory, startNewChat }}
    >
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
