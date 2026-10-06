import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { isFirebaseConfigured } from '@/lib/firebase/config';
import { AlertCircle, ExternalLink, X } from 'lucide-react';

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
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);

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
        {/* Firebase Setup Alert Banner (if credentials not configured) */}
        {!isFirebaseConfigured && !isBannerDismissed && (
          <div className="relative flex items-center justify-between border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 sm:px-6">
            <div className="flex items-center gap-2 pr-6">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>
                <strong className="font-semibold">Demo Simulation Mode:</strong> Firebase configuration is pending. The system is operating seamlessly with offline & demo fallback data. Add your Firebase credentials in <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-800 font-mono">.env</code> to activate live Cloud Firestore sync.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsBannerDismissed(true)}
              className="rounded p-1 text-amber-700 hover:bg-amber-200/50 hover:text-amber-950 transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

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
