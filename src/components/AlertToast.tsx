'use client'

import { useNotifications, SpendingAlert } from '@/lib/notifications'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, AlertCircle, Info } from 'lucide-react'

export function AlertToast() {
    const { alerts, dismissAlert } = useNotifications()

    const getIcon = (type: SpendingAlert['type']) => {
        switch (type) {
            case 'danger':
                return <AlertCircle className="h-5 w-5" />
            case 'warning':
                return <AlertTriangle className="h-5 w-5" />
            default:
                return <Info className="h-5 w-5" />
        }
    }

    const getStyles = (type: SpendingAlert['type']) => {
        switch (type) {
            case 'danger':
                return 'bg-red-50 dark:bg-red-900/30 border-red-500 text-red-700 dark:text-red-300'
            case 'warning':
                return 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-500 text-yellow-700 dark:text-yellow-300'
            default:
                return 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
        }
    }

    return (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
            <AnimatePresence>
                {alerts.slice(0, 3).map((alert) => (
                    <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, x: 100, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 100, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                            "p-4 border-l-4 shadow-lg",
                            getStyles(alert.type)
                        )}
                    >
                        <div className="flex gap-3">
                            <div className="flex-shrink-0">
                                {getIcon(alert.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm">{alert.title}</p>
                                <p className="text-sm mt-1 opacity-90">{alert.message}</p>
                            </div>
                            <button
                                onClick={() => dismissAlert(alert.id)}
                                className="flex-shrink-0 hover:opacity-70 transition-opacity"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    )
}
