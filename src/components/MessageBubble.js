import React, { useState, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
    HiOutlineClipboard,
    HiOutlineCheck,
    HiOutlineUser,
} from 'react-icons/hi2';
import { HiOutlineSparkles } from 'react-icons/hi2';

function MessageBubble({ message }) {
    const isUser = message.role === 'user';
    const hasContent = !isUser && message.content;
    const isEmpty = !isUser && !message.content && !message.statusText;

    return (
        <div className={`message-row ${message.role}`}>
            {!isUser && (
                <div className="message-avatar assistant-avatar">
                    <HiOutlineSparkles size={16} />
                </div>
            )}
            <div className="message-content">
                <div className="message-bubble">
                    {isUser ? (
                        <>
                            {message.attachment && (
                                <div className="msg-attachment-chip">
                                    <HiOutlineClipboard size={13} />
                                    <span>{message.attachment.name}</span>
                                </div>
                            )}
                            <span>{message.content}</span>
                        </>
                    ) : isEmpty ? (
                        <TypingIndicator />
                    ) : (
                        <>
                            {message.statusText && (
                                <StatusIndicator
                                    statusText={message.statusText}
                                    statusDetail={message.statusDetail}
                                />
                            )}
                            {hasContent && (
                                <div className="markdown-content">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            code: CodeBlock,
                                            img: ({ src, alt }) => {
                                                if (!src) return null;
                                                return (
                                                    <img
                                                        src={src}
                                                        alt={alt || ''}
                                                        style={{ maxWidth: '400px', height: 'auto', borderRadius: '6px', margin: '8px 0', display: 'block'}}
                                                    />
                                                );
                                            },
                                        }}
                                        urlTransform={(url) => url}
                                    >
                                        {message.content}
                                    </ReactMarkdown>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
            {isUser && (
                <div className="message-avatar user-avatar">
                    <HiOutlineUser size={16} />
                </div>
            )}
        </div>
    );
}

function StatusIndicator({ statusText, statusDetail }) {
    return (
        <div className="status-indicator">
            <div className="status-indicator-icon">
                <div className="status-pulse" />
            </div>
            <div className="status-text-wrapper">
                <span className="status-text">{statusText}</span>
                {statusDetail && (
                    <span className="status-detail">{statusDetail}</span>
                )}
            </div>
        </div>
    );
}

function CodeBlock({ node, inline, className, children, ...props }) {
    const [copied, setCopied] = useState(false);
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    const codeString = String(children).replace(/\n$/, '');

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(codeString);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [codeString]);

    if (!inline && (match || codeString.includes('\n'))) {
        return (
            <div className="code-block-wrapper">
                <div className="code-block-header">
                    <span className="code-block-lang">{language || 'code'}</span>
                    <button
                        className={`code-copy-btn ${copied ? 'copied' : ''}`}
                        onClick={handleCopy}
                    >
                        {copied ? (
                            <>
                                <HiOutlineCheck size={14} />
                                Copied!
                            </>
                        ) : (
                            <>
                                <HiOutlineClipboard size={14} />
                                Copy code
                            </>
                        )}
                    </button>
                </div>
                <SyntaxHighlighter
                    style={oneDark}
                    language={language || 'text'}
                    PreTag="pre"
                    customStyle={{
                        margin: 0,
                        padding: '14px',
                        background: 'transparent',
                        fontSize: '13px',
                    }}
                    {...props}
                >
                    {codeString}
                </SyntaxHighlighter>
            </div>
        );
    }

    return (
        <code className={className} {...props}>
            {children}
        </code>
    );
}

function TypingIndicator() {
    return (
        <div className="typing-indicator">
            <div className="dot" />
            <div className="dot" />
            <div className="dot" />
        </div>
    );
}

export default React.memo(MessageBubble);
