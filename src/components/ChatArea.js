import React, { useRef, useEffect, useMemo } from 'react';
import { useChat } from '../context/ChatContext';
import MessageBubble from './MessageBubble';
import WelcomeScreen from './WelcomeScreen';
import MessageInput from './MessageInput';
import { HiOutlineBars3, HiOutlineHome } from 'react-icons/hi2';
import { useNavigate, useParams } from 'react-router-dom';

function ChatArea({ sidebarOpen, onToggleSidebar }) {
    const { state, dispatch, loadChatHistory } = useChat();
    const messagesEndRef = useRef(null);
    const navigate = useNavigate();
    const { chatId } = useParams(); // undefined on "/" route

    // Sync URL param → context active conversation
    useEffect(() => {
        if (chatId) {
            if (state.activeConversationId !== chatId) {
                dispatch({ type: 'SET_ACTIVE', id: chatId });
            }
            // Fetch message history from API
            loadChatHistory(chatId);
        } else {
            // On home route, deselect
            if (state.activeConversationId !== null) {
                dispatch({ type: 'SET_ACTIVE', id: null });
            }
        }
    }, [chatId]); // eslint-disable-line react-hooks/exhaustive-deps

    const activeConversation = state.conversations.find(
        (c) => c.id === chatId
    );

    const messages = useMemo(() => {
        return activeConversation?.messages ?? [];
    }, [activeConversation]);

    const isLoadingHistory = chatId ? !!state.loadingHistory[chatId] : false;

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
            {!chatId ? (
                // Home — no chat selected
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