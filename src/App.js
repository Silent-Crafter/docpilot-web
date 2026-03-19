import React, { useState } from 'react';
import { ChatProvider } from './context/ChatContext';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import KnowledgeHub from './components/KnowledgeHub';
import './styles/ChatStyles.css';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState('chat');

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  return (
    <ChatProvider>
      <div className="app-container">

        <Sidebar
          isOpen={sidebarOpen}
          onToggle={toggleSidebar}
          activeView={activeView}
          onSetActiveView={setActiveView}
        />

        {activeView === 'chat' ? (
          <ChatArea
            sidebarOpen={sidebarOpen}
            onToggleSidebar={toggleSidebar}
          />
        ) : (
          <KnowledgeHub
            sidebarOpen={sidebarOpen}
            onToggleSidebar={toggleSidebar}
          />
        )}

      </div>
    </ChatProvider>
  );
}

export default App;