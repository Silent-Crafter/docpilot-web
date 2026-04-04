import React from 'react';
import { useChat } from '../context/ChatContext';
import {
    HiOutlinePlus,
    HiOutlineChatBubbleLeftRight,
    HiOutlineTrash,
    HiOutlineBars3,
    HiOutlineFolder,
} from 'react-icons/hi2';

import { useNavigate, useLocation } from 'react-router-dom';

function Sidebar({ isOpen, onToggle }) {
    const { state, dispatch } = useChat();
    const { conversations, activeConversationId } = state;

    const navigate = useNavigate();
    const location = useLocation();

    const handleNewChat = () => {
        dispatch({ type: 'NEW_CHAT' });
        navigate('/');
    };

    const handleSelect = (id) => {
        dispatch({ type: 'SET_ACTIVE', id });
        navigate('/');
        if (window.innerWidth < 768) onToggle();
    };

    const handleDelete = (e, id) => {
        e.stopPropagation();
        dispatch({ type: 'DELETE_CHAT', id });
    };

    const handleKnowledgeHub = () => {
        navigate('/knowledgehub');
        if (window.innerWidth < 768) onToggle();
    };

    const grouped = groupByDate(conversations);

    return (
        <>
            {/* Overlay */}
            <div
                className={`sidebar-overlay ${isOpen ? 'visible' : ''}`}
                onClick={onToggle}
            />

            {/* Sidebar */}
            <aside className={`sidebar ${isOpen ? 'expanded' : 'collapsed'}`}>
                
                {/* HEADER (RESTORED ORIGINAL) */}
                <div className="sidebar-header">
                    <button
                        className="sidebar-toggle-btn"
                        onClick={onToggle}
                        title="Close sidebar"
                    >
                        <HiOutlineBars3 size={20} />
                    </button>

                    <button className="new-chat-btn" onClick={handleNewChat}>
                        <HiOutlinePlus className="icon" />
                        New chat
                    </button>
                </div>

                {/* CHAT LIST */}
                <nav className="sidebar-conversations">
                    {grouped.map((group) => (
                        <div key={group.label}>
                            <div className="conversation-group-label">
                                {group.label}
                            </div>

                            {group.items.map((conv) => (
                                <div
                                    key={conv.id}
                                    className={`conversation-item ${
                                        conv.id === activeConversationId &&
                                        location.pathname === '/'
                                            ? 'active'
                                            : ''
                                    }`}
                                    onClick={() => handleSelect(conv.id)}
                                >
                                    <HiOutlineChatBubbleLeftRight
                                        size={16}
                                        style={{
                                            marginRight: 10,
                                            flexShrink: 0,
                                            opacity: 0.5,
                                        }}
                                    />

                                    <span className="conv-title">
                                        {conv.title}
                                    </span>

                                    <button
                                        className="delete-btn"
                                        onClick={(e) =>
                                            handleDelete(e, conv.id)
                                        }
                                        title="Delete conversation"
                                    >
                                        <HiOutlineTrash />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ))}

                    {conversations.length === 0 && (
                        <div
                            style={{
                                padding: '20px 12px',
                                color: 'var(--text-tertiary)',
                                fontSize: 13,
                                textAlign: 'center',
                            }}
                        >
                            No conversations yet.
                            <br />
                            Start a new chat!
                        </div>
                    )}
                </nav>

                {/* FOOTER */}
                <div className="sidebar-footer">
                    <button
                        className={`sidebar-footer-btn ${
                            location.pathname === '/knowledgehub'
                                ? 'active'
                                : ''
                        }`}
                        onClick={handleKnowledgeHub}
                    >
                        <HiOutlineFolder className="icon" />
                        <span className="footer-text">Knowledge Hub</span>
                    </button>
                </div>
            </aside>
        </>
    );
}

function groupByDate(conversations) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const groups = { Today: [], 'Previous 7 days': [], Older: [] };

    conversations.forEach((conv) => {
        const created = new Date(conv.createdAt);
        if (created >= today) groups['Today'].push(conv);
        else if (created >= weekAgo)
            groups['Previous 7 days'].push(conv);
        else groups['Older'].push(conv);
    });

    return Object.entries(groups)
        .filter(([, items]) => items.length > 0)
        .map(([label, items]) => ({ label, items }));
}

export default Sidebar;
