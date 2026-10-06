import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

interface AppLayoutProps {
  children: React.ReactNode;
  currentPath?: string;
  onNavigate?: (path: string) => void;
  title?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  currentPath = '/dashboard',
  onNavigate,
  title,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentPath={currentPath}
        onNavigate={onNavigate}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header Navbar */}
        <Navbar
          currentPath={currentPath}
          onNavigate={onNavigate}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          title={title}
        />

        {/* Scrollable Viewport Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
