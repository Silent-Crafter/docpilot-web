import React from 'react';
import { HiOutlineSparkles } from 'react-icons/hi2';
import { useChat } from '../context/ChatContext';

const SUGGESTIONS = [
    'Explain quantum computing in simple terms',
    'Write a Python script for web scraping',
    'Help me debug my React component',
    'Create a SQL query for user analytics',
];

function WelcomeScreen() {
    const { sendMessage } = useChat();

    return (
        <div className="welcome-screen">
            <div className="welcome-logo">
                <HiOutlineSparkles />
            </div>
            <h1 className="welcome-title">How can I help you today?</h1>
            <div className="welcome-suggestions">
                {SUGGESTIONS.map((text, i) => (
                    <button
                        key={i}
                        className="suggestion-card"
                        onClick={() => sendMessage(text)}
                    >
                        {text}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default WelcomeScreen;
