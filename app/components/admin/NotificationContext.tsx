
"use client";

import React, { createContext, useContext, useState } from 'react';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface NotificationContextType {
    showNotification: (message: string, type: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);

    const showNotification = (message: string, type: NotificationType) => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    return (
        <NotificationContext.Provider value={{ showNotification }}>
            {children}
            {notification && (
                <div className={`fixed bottom-24 right-6 px-6 py-3 rounded-2xl shadow-2xl z-[100] animate-in slide-in-from-right-10 duration-300 font-bold border ${notification.type === 'success' ? 'bg-emerald-500 text-white border-emerald-400' :
                    notification.type === 'error' ? 'bg-rose-500 text-white border-rose-400' :
                        'bg-blue-500 text-white border-blue-400'
                    }`}>
                    {notification.type === 'success' ? '✅ ' : notification.type === 'error' ? '❌ ' : 'ℹ️ '}
                    {notification.message}
                </div>
            )}
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
}
