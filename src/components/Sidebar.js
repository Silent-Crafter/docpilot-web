import React from 'react';
import { useChat } from '../context/ChatContext';
import {
    HiOutlinePlus,
    HiOutlineChatBubbleLeftRight,
    HiOutlineTrash,
    HiOutlineBars3,
    HiOutlineFolder,
} from 'react-icons/hi2';

function Sidebar({ isOpen, onToggle, activeView, onSetActiveView }) {
    const { state, dispatch } = useChat();
    const { conversations, activeConversationId } = state;

    const handleNewChat = () => {
        dispatch({ type: 'NEW_CHAT' });
        onSetActiveView('chat');
    };

    const handleSelect = (id) => {
        dispatch({ type: 'SET_ACTIVE', id });
        onSetActiveView('chat');
        if (window.innerWidth < 768) {
            onToggle();
        }
    };

    const handleDelete = (e, id) => {
        e.stopPropagation();
        dispatch({ type: 'DELETE_CHAT', id });
    };

    const handleKnowledgeHub = () => {
        onSetActiveView('knowledge');
        if (window.innerWidth < 768) {
            onToggle();
        }
    };

    const grouped = groupByDate(conversations);

    return (
        <>
            <div className={`sidebar-overlay ${isOpen ? 'visible' : ''}`} onClick={onToggle} />
            <aside className={`sidebar ${!isOpen ? 'collapsed' : ''}`}>
                <div className="sidebar-header">
                    <button className="sidebar-toggle-btn" onClick={onToggle} title="Close sidebar">
                        <HiOutlineBars3 size={20} />
                    </button>
                    <button className="new-chat-btn" onClick={handleNewChat}>
                        <HiOutlinePlus className="icon" />
                        New chat
                    </button>
                </div>

                <nav className="sidebar-conversations">
                    {grouped.map((group) => (
                        <div key={group.label}>
                            <div className="conversation-group-label">{group.label}</div>
                            {group.items.map((conv) => (
                                <div
                                    key={conv.id}
                                    className={`conversation-item ${conv.id === activeConversationId && activeView === 'chat' ? 'active' : ''}`}
                                    onClick={() => handleSelect(conv.id)}
                                >
                                    <HiOutlineChatBubbleLeftRight
                                        size={16}
                                        style={{ marginRight: 10, flexShrink: 0, opacity: 0.5 }}
                                    />
                                    <span className="conv-title">{conv.title}</span>
                                    <button
                                        className="delete-btn"
                                        onClick={(e) => handleDelete(e, conv.id)}
                                        title="Delete conversation"
                                    >
                                        <HiOutlineTrash />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ))}

                    {conversations.length === 0 && (
                        <div style={{ padding: '20px 12px', color: 'var(--text-tertiary)', fontSize: 13, textAlign: 'center' }}>
                            No conversations yet.
                            <br />
                            Start a new chat!
                        </div>
                    )}
                </nav>

                <div className="sidebar-footer">
                    <button
                        className={`sidebar-footer-btn ${activeView === 'knowledge' ? 'active' : ''}`}
                        onClick={handleKnowledgeHub}
                    >
                        <HiOutlineFolder className="icon" />
                        Knowledge Hub
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
        if (created >= today) {
            groups['Today'].push(conv);
        } else if (created >= weekAgo) {
            groups['Previous 7 days'].push(conv);
        } else {
            groups['Older'].push(conv);
        }
    });

    return Object.entries(groups)
        .filter(([, items]) => items.length > 0)
        .map(([label, items]) => ({ label, items }));
}

export default Sidebar;
