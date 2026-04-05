import React, { useRef, useEffect, useMemo } from 'react';
import { useChat } from '../context/ChatContext';
import MessageBubble from './MessageBubble';
import WelcomeScreen from './WelcomeScreen';
import MessageInput from './MessageInput';
import { HiOutlineBars3, HiOutlineHome } from 'react-icons/hi2';
import { useNavigate, useParams } from 'react-router-dom';

function ChatArea({ sidebarOpen, onToggleSidebar }) {
    const { state, dispatch, loadChatHistory, prepareChatId } = useChat();
    const messagesEndRef = useRef(null);
    const navigate = useNavigate();
    const { chatid } = useParams(); // undefined on "/" route

    // Sync URL param → context active conversation + fetch history
    useEffect(() => {
        if (chatid) {
            if (state.activeConversationId !== chatid) {
                dispatch({ type: 'SET_ACTIVE', id: chatid });
            }

            // Only fetch history for chats that are NOT newly created in this session
            const conv = state.conversations.find(c => c.id === chatid);
            if (conv && !conv.isNew) {
                loadChatHistory(chatid);
            }
        } else {
            // Home route — deselect and prepare a new chat ID
            if (state.activeConversationId !== null) {
                dispatch({ type: 'SET_ACTIVE', id: null });
            }
            prepareChatId();
        }
    }, [chatid]); // eslint-disable-line react-hooks/exhaustive-deps

    const activeConversation = state.conversations.find(
        (c) => c.id === chatid
    );

    const messages = useMemo(() => {
        return activeConversation?.messages ?? [];
    }, [activeConversation]);

    const isLoadingHistory = chatid ? !!state.loadingHistory[chatid] : false;

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    const handleHome = () => {
        dispatch({ type: 'SET_ACTIVE', id: null });
        navigate('/');
    };

    return (
        <main className={`chat-area ${sidebarOpen ? 'with-sidebar' : 'full'}`}>

            {/* HEADER */}
            <div className="chat-header">

                <div className="header-left">
                    {!sidebarOpen && (
                        <button
                            className="sidebar-open-btn"
                            onClick={onToggleSidebar}
                        >
                            <HiOutlineBars3 size={20} />
                        </button>
                    )}

                    <button
                        className="sidebar-open-btn home-btn"
                        onClick={handleHome}
                        title="Go to Home"
                    >
                        <HiOutlineHome size={20} />
                    </button>
                </div>

                <div className="model-label">
                    <span className="dot" />
                    Docpilot
                </div>
            </div>

            {/* BODY */}
            {!chatid ? (
                // Home — no chat selected, show welcome
                <>
                    <WelcomeScreen />
                </>
            ) : isLoadingHistory && messages.length === 0 ? (
                // Loading history from API
                <div className="messages-container">
                    <div className="messages-list" style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: '40px 0',
                        color: 'var(--text-tertiary, #888)',
                        fontSize: 14,
                    }}>
                        Loading conversation…
                    </div>
                </div>
            ) : (
                <div className="messages-container">
                    <div className="messages-list">
                        {messages.map((msg) => (
                            <MessageBubble key={msg.id} message={msg} />
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                </div>
            )}

            <MessageInput />
        </main>
    );
}

export default ChatArea;