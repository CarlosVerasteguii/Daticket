'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export interface NotificationPreferences {
    emailDigest: boolean
    spendingAlerts: boolean
    weeklyReports: boolean
    budgetWarnings: boolean
}

const DEFAULT_PREFS: NotificationPreferences = {
    emailDigest: true,
    spendingAlerts: true,
    weeklyReports: false,
    budgetWarnings: true,
}

interface NotificationContextType {
    preferences: NotificationPreferences
    updatePreference: (key: keyof NotificationPreferences, value: boolean) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

const NOTIFICATION_KEY = 'daticket-notifications'

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFS)

    useEffect(() => {
        const saved = localStorage.getItem(NOTIFICATION_KEY)
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                setPreferences({ ...DEFAULT_PREFS, ...parsed })
            } catch {
                // Invalid JSON, use defaults
            }
        }
    }, [])

    const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
        const updated = { ...preferences, [key]: value }
        setPreferences(updated)
        localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(updated))
    }

    return (
        <NotificationContext.Provider value={{ preferences, updatePreference }}>
            {children}
        </NotificationContext.Provider>
    )
}

export function useNotifications() {
    const context = useContext(NotificationContext)
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider')
    }
    return context
}
