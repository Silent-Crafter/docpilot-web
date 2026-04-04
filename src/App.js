import React, { useState } from 'react';
import { ChatProvider } from './context/ChatContext';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import KnowledgeHub from './components/KnowledgeHub';
import './styles/ChatStyles.css';

import { Routes, Route } from 'react-router-dom';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  return (
    <ChatProvider>
      <div className="app-container">

        <Sidebar
          isOpen={sidebarOpen}
          onToggle={toggleSidebar}
        />

        <Routes>
          <Route
            path="/"
            element={
              <ChatArea
                sidebarOpen={sidebarOpen}
                onToggleSidebar={toggleSidebar}
              />
            }
          />

          <Route
            path="/knowledgehub"
            element={
              <KnowledgeHub
                sidebarOpen={sidebarOpen}
                onToggleSidebar={toggleSidebar}
              />
            }
          />
        </Routes>

      </div>
    </ChatProvider>
  );
}

export default App;