import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';

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
      {/* Sidebar Navigation Drawer */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentPath={currentPath}
        onNavigate={onNavigate}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top Header Navbar with Mobile Hamburger */}
        <Navbar
          currentPath={currentPath}
          onNavigate={onNavigate}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          title={title}
        />

        {/* Scrollable Viewport Container - with bottom padding for mobile tab bar */}
        <main className="flex-1 overflow-y-auto px-3 py-4 pb-24 sm:px-6 sm:py-6 lg:p-8 lg:pb-8 bg-slate-50">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <BottomNav
          currentPath={currentPath}
          onNavigate={onNavigate}
          onToggleSidebar={() => setIsSidebarOpen(true)}
        />
      </div>
    </div>
  );
};
