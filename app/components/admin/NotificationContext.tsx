
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
                <div className={`fixed bottom-10 right-6 px-8 py-4 rounded-[2rem] shadow-2xl z-[200] animate-in slide-in-from-right-10 duration-500 font-black uppercase text-[10px] tracking-[0.15em] border backdrop-blur-xl ${
                    notification.type === 'success' ? 'bg-[#6FD904]/90 text-white border-[#6FD904]/20 shadow-[#6FD904]/20' :
                    notification.type === 'error' ? 'bg-[#EE05F2]/90 text-white border-[#EE05F2]/20 shadow-[#EE05F2]/20' :
                    'bg-[#0511F2]/90 text-white border-[#0511F2]/20 shadow-[#0511F2]/20'
                    }`}>
                    <div className="flex items-center gap-3">
                        <span className="text-lg">
                            {notification.type === 'success' ? '✅' : notification.type === 'error' ? '❌' : 'ℹ️'}
                        </span>
                        {notification.message}
                    </div>
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
