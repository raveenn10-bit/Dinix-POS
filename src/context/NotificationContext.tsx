import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';
import { NotificationItem, NotificationType } from '@/types';

export interface NotificationContextType {
  notifications: NotificationItem[];
  addNotification: (
    type: NotificationType,
    message: string,
    title?: string,
    duration?: number
  ) => string;
  removeNotification: (id: string) => void;
  notifySuccess: (message: string, title?: string) => string;
  notifyError: (message: string, title?: string) => string;
  notifyWarning: (message: string, title?: string) => string;
  notifyInfo: (message: string, title?: string) => string;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Synthesize pleasant micro-audio cues using Web Audio API
const playNotificationSound = (type: NotificationType) => {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.05, now);

    if (type === 'success') {
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'error') {
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'warning') {
      osc.frequency.setValueAtTime(440, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else {
      osc.frequency.setValueAtTime(659.25, now); // E5
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    }
  } catch {
    // Audio autoplay restrictions or headless env
  }
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const addNotification = useCallback(
    (
      type: NotificationType,
      message: string,
      title?: string,
      duration: number = 4000
    ): string => {
      const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newItem: NotificationItem = {
        id,
        type,
        title,
        message,
        duration,
        createdAt: Date.now(),
      };

      playNotificationSound(type);

      setNotifications((prev) => [...prev, newItem]);

      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, duration);
      }

      return id;
    },
    [removeNotification]
  );

  const notifySuccess = useCallback(
    (message: string, title: string = 'Success') => addNotification('success', message, title),
    [addNotification]
  );

  const notifyError = useCallback(
    (message: string, title: string = 'Error') => addNotification('error', message, title, 5000),
    [addNotification]
  );

  const notifyWarning = useCallback(
    (message: string, title: string = 'Warning') => addNotification('warning', message, title, 4500),
    [addNotification]
  );

  const notifyInfo = useCallback(
    (message: string, title: string = 'Information') => addNotification('info', message, title),
    [addNotification]
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        notifySuccess,
        notifyError,
        notifyWarning,
        notifyInfo,
      }}
    >
      {children}

      {/* Floating Toast Notification Container */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {notifications.map((item) => {
          const typeConfig = {
            success: {
              border: 'border-emerald-500/40 bg-emerald-50/95 text-emerald-950',
              icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
              badge: 'bg-emerald-600',
            },
            error: {
              border: 'border-rose-500/40 bg-rose-50/95 text-rose-950',
              icon: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
              badge: 'bg-rose-600',
            },
            warning: {
              border: 'border-amber-500/40 bg-amber-50/95 text-amber-950',
              icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
              badge: 'bg-amber-600',
            },
            info: {
              border: 'border-brand-500/40 bg-brand-50/95 text-brand-950',
              icon: <Info className="w-5 h-5 text-brand-500 shrink-0" />,
              badge: 'bg-brand-500',
            },
          }[item.type];

          return (
            <div
              key={item.id}
              role="alert"
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 ${typeConfig.border}`}
            >
              <div className="pt-0.5">{typeConfig.icon}</div>
              <div className="flex-1 min-w-0">
                {item.title && (
                  <h4 className="font-semibold text-sm leading-tight text-slate-900 mb-0.5">
                    {item.title}
                  </h4>
                )}
                <p className="text-xs text-slate-700 leading-relaxed break-words">
                  {item.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeNotification(item.id)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
