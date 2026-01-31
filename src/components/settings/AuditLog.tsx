'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AuditEvent, getAuditEventLabel, getAuditEventCategory } from '@/lib/audit'
import { Clock, Shield, Database, LogIn, ChevronDown, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

export default function AuditLog() {
    const supabase = createClient()
    const [events, setEvents] = useState<AuditEvent[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showCount, setShowCount] = useState(10)

    const fetchAuditLog = useCallback(async () => {
        setIsLoading(true)
        setError(null)

        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                setError('Not authenticated')
                return
            }

            const response = await fetch('/api/audit', {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
            })

            if (!response.ok) {
                throw new Error('Failed to fetch audit log')
            }

            const data = await response.json()
            setEvents(data.events || [])
        } catch (err) {
            console.error('Error fetching audit log:', err)
            setError('Failed to load activity log')
        } finally {
            setIsLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        fetchAuditLog()
    }, [fetchAuditLog])

    const getCategoryIcon = (type: AuditEvent['type']) => {
        const category = getAuditEventCategory(type)
        switch (category) {
            case 'auth':
                return <LogIn className="h-4 w-4" />
            case 'security':
                return <Shield className="h-4 w-4" />
            case 'data':
                return <Database className="h-4 w-4" />
            default:
                return <Clock className="h-4 w-4" />
        }
    }

    const getCategoryColor = (type: AuditEvent['type']) => {
        const category = getAuditEventCategory(type)
        switch (category) {
            case 'auth':
                return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            case 'security':
                return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            case 'data':
                return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            default:
                return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400'
        }
    }

    const visibleEvents = events.slice(0, showCount)
    const hasMore = events.length > showCount

    if (isLoading) {
        return (
            <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700">
                <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Activity Log
                </h3>
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-12 bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
                    ))}
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700">
                <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Activity Log
                </h3>
                <div className="flex items-center gap-2 text-red-500 dark:text-red-400 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                </div>
            </div>
        )
    }

    return (
        <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700">
            <h3 className="font-bold text-sm mb-1 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Activity Log
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
                Recent account activities and security events
            </p>

            {events.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No activity recorded yet</p>
                </div>
            ) : (
                <div className="space-y-1">
                    {visibleEvents.map((event) => (
                        <div
                            key={event.id}
                            className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        >
                            <div className={cn(
                                'h-8 w-8 flex items-center justify-center flex-shrink-0',
                                getCategoryColor(event.type)
                            )}>
                                {getCategoryIcon(event.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm truncate">
                                    {getAuditEventLabel(event.type)}
                                </p>
                                {event.details && (
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                                        {event.details}
                                    </p>
                                )}
                            </div>
                            <div className="text-xs text-neutral-500 dark:text-neutral-400 flex-shrink-0">
                                {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                            </div>
                        </div>
                    ))}

                    {hasMore && (
                        <button
                            onClick={() => setShowCount((prev) => prev + 10)}
                            className="w-full flex items-center justify-center gap-2 p-3 text-sm font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        >
                            <ChevronDown className="h-4 w-4" />
                            Show More ({events.length - showCount} remaining)
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
