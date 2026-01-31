'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

export interface NotificationPreferences {
    emailDigest: boolean
    spendingAlerts: boolean
    weeklyReports: boolean
    budgetWarnings: boolean
}

export interface SpendingAlert {
    id: string
    type: 'warning' | 'danger' | 'info'
    title: string
    message: string
    category?: string
    percentage?: number
    timestamp: number
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
    alerts: SpendingAlert[]
    addAlert: (alert: Omit<SpendingAlert, 'id' | 'timestamp'>) => void
    dismissAlert: (id: string) => void
    clearAlerts: () => void
    checkBudgetAlert: (spent: number, budget: number, category?: string) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

const NOTIFICATION_KEY = 'daticket-notifications'
const ALERTS_KEY = 'daticket-alerts'

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFS)
    const [alerts, setAlerts] = useState<SpendingAlert[]>([])
    const [shownAlerts, setShownAlerts] = useState<Set<string>>(new Set())

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
        
        // Load shown alerts for this session
        const savedAlerts = sessionStorage.getItem(ALERTS_KEY)
        if (savedAlerts) {
            try {
                setShownAlerts(new Set(JSON.parse(savedAlerts)))
            } catch {
                // Invalid JSON
            }
        }
    }, [])

    const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
        const updated = { ...preferences, [key]: value }
        setPreferences(updated)
        localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(updated))
    }

    const addAlert = useCallback((alert: Omit<SpendingAlert, 'id' | 'timestamp'>) => {
        const newAlert: SpendingAlert = {
            ...alert,
            id: `${alert.type}-${alert.category || 'total'}-${Date.now()}`,
            timestamp: Date.now(),
        }
        setAlerts(prev => [newAlert, ...prev].slice(0, 10)) // Keep last 10 alerts
    }, [])

    const dismissAlert = useCallback((id: string) => {
        setAlerts(prev => prev.filter(a => a.id !== id))
    }, [])

    const clearAlerts = useCallback(() => {
        setAlerts([])
    }, [])

    const checkBudgetAlert = useCallback((spent: number, budget: number, category?: string) => {
        if (!preferences.spendingAlerts || budget <= 0) return

        const percentage = (spent / budget) * 100
        const alertKey = `${category || 'total'}-${Math.floor(percentage / 10) * 10}` // Group by 10%

        // Don't show the same alert twice in a session
        if (shownAlerts.has(alertKey)) return

        let alert: Omit<SpendingAlert, 'id' | 'timestamp'> | null = null

        if (percentage >= 100) {
            alert = {
                type: 'danger',
                title: category ? `${category} Over Budget!` : 'Budget Exceeded!',
                message: category 
                    ? `You've exceeded your ${category} budget by ${(percentage - 100).toFixed(0)}%`
                    : `You've exceeded your monthly budget by ${(percentage - 100).toFixed(0)}%`,
                category,
                percentage,
            }
        } else if (percentage >= 80) {
            alert = {
                type: 'warning',
                title: category ? `${category} Budget Alert` : 'Budget Warning',
                message: category
                    ? `You've used ${percentage.toFixed(0)}% of your ${category} budget`
                    : `You've used ${percentage.toFixed(0)}% of your monthly budget`,
                category,
                percentage,
            }
        }

        if (alert) {
            addAlert(alert)
            const newShown = new Set(shownAlerts)
            newShown.add(alertKey)
            setShownAlerts(newShown)
            sessionStorage.setItem(ALERTS_KEY, JSON.stringify([...newShown]))
        }
    }, [preferences.spendingAlerts, shownAlerts, addAlert])

    return (
        <NotificationContext.Provider value={{ 
            preferences, 
            updatePreference, 
            alerts, 
            addAlert, 
            dismissAlert, 
            clearAlerts,
            checkBudgetAlert 
        }}>
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
