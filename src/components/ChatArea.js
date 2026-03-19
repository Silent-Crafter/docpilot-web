import React, { useRef, useEffect, useMemo } from 'react';
import { useChat } from '../context/ChatContext';
import MessageBubble from './MessageBubble';
import WelcomeScreen from './WelcomeScreen';
import MessageInput from './MessageInput';
import { HiOutlineBars3, HiOutlineHome } from 'react-icons/hi2'; // ✅ added Home icon

function ChatArea({ sidebarOpen, onToggleSidebar }) {
    const { state } = useChat();
    const messagesEndRef = useRef(null);

    const activeConversation = state.conversations.find(
        (c) => c.id === state.activeConversationId
    );

    const messages = useMemo(() => {
        return activeConversation?.messages ?? [];
    }, [activeConversation]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    return (
        <main className={`chat-area ${sidebarOpen ? 'with-sidebar' : 'full'}`}>

            {/* ✅ HEADER FIXED */}
            <div className="chat-header">

                {/* LEFT SIDE */}
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
                        onClick={() => window.location.reload()}
                        title="Go to Home"
                    >
                        <HiOutlineHome size={20} />
                    </button>
                </div>

                {/* CENTER */}
                <div className="model-label">
                    <span className="dot" />
                    Docpilot
                </div>

            </div>


            {messages.length === 0 ? (
                <WelcomeScreen />
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