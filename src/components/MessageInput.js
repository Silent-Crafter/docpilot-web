import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useChat } from '../context/ChatContext';
import { HiArrowUp, HiOutlinePaperClip, HiOutlineXMark } from 'react-icons/hi2';
import { useNavigate, useParams } from 'react-router-dom';

function MessageInput() {
    const { sendMessage, state } = useChat();
    const navigate = useNavigate();
    const { chatid } = useParams();
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const { isGenerating } = state;
    const [attachedFile, setAttachedFile] = useState(null);

    // Auto-resize textarea
    const adjustHeight = useCallback(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }, []);

    const handleSubmit = useCallback(async () => {
        const el = textareaRef.current;
        if (!el) return;
        const text = el.value.trim();
        if (!text || isGenerating) return;
        
        el.value = '';
        el.style.height = 'auto';
        
        const fileToAttach = attachedFile;
        setAttachedFile(null);

        const convId = await sendMessage(text, fileToAttach);

        // If we were on the home screen (no chatid), navigate to the new chat URL
        if (!chatid && convId) {
            navigate(`/chat/${convId}`);
        }
    }, [sendMessage, isGenerating, attachedFile, chatid, navigate]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    }, [handleSubmit]);

    const handleAttachClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setAttachedFile(file);
        }
        // Reset so the same file can be re-selected
        e.target.value = '';
    };

    const removeFile = () => {
        setAttachedFile(null);
    };

    // Format file size
    const formatSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    // Focus textarea on mount
    useEffect(() => {
        textareaRef.current?.focus();
    }, []);

    return (
        <div className="input-area">
            <div className="input-wrapper">
                {attachedFile && (
                    <div className="file-chip-container">
                        <div className="file-chip">
                            <HiOutlinePaperClip size={14} />
                            <span className="file-chip-name">{attachedFile.name}</span>
                            <span className="file-chip-size">{formatSize(attachedFile.size)}</span>
                            <button className="file-chip-remove" onClick={removeFile} title="Remove file">
                                <HiOutlineXMark size={14} />
                            </button>
                        </div>
                    </div>
                )}
                <div className="input-container">
                    <button
                        className="attach-btn"
                        onClick={handleAttachClick}
                        disabled={isGenerating}
                        title="Attach document"
                    >
                        <HiOutlinePaperClip size={18} />
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        accept=".pdf,.doc,.docx,.txt,.md,.csv,.json,.xml,.html,.py,.js,.ts,.java,.c,.cpp,.h,.hpp"
                    />
                    <textarea
                        ref={textareaRef}
                        rows={1}
                        placeholder="Message Docpilot..."
                        onInput={adjustHeight}
                        onKeyDown={handleKeyDown}
                        disabled={isGenerating}
                    />
                    <button
                        className="send-btn"
                        onClick={handleSubmit}
                        disabled={isGenerating}
                        title="Send message"
                    >
                        <HiArrowUp />
                    </button>
                </div>
                <div className="input-footer">
                    Docpilot can make mistakes. Consider checking important information.
                </div>
            </div>
        </div>
    );
}

export default MessageInput;
