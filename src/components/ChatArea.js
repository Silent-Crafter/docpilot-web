import React, { useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import MessageBubble from './MessageBubble';
import WelcomeScreen from './WelcomeScreen';
import MessageInput from './MessageInput';
import {
    HiOutlineBars3,
} from 'react-icons/hi2';

function ChatArea({ sidebarOpen, onToggleSidebar }) {
    const { state } = useChat();
    const messagesEndRef = useRef(null);

    const activeConversation = state.conversations.find(
        (c) => c.id === state.activeConversationId
    );

    const messages = activeConversation?.messages || [];

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <main className="chat-area">
            <div className="chat-header">
                {!sidebarOpen && (
                    <button
                        className="sidebar-open-btn"
                        onClick={onToggleSidebar}
                        title="Open sidebar"
                    >
                        <HiOutlineBars3 size={20} />
                    </button>
                )}
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
