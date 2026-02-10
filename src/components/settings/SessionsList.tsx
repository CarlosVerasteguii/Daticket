'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
    Monitor, 
    Smartphone, 
    Tablet, 
    Chrome, 
    Globe, 
    Shield, 
    Trash2, 
    RefreshCw,
    AlertCircle,
    CheckCircle,
    X,
    LogOut
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SessionDevice {
    browser: string
    os: string
    type: 'desktop' | 'mobile' | 'tablet'
}

interface SessionInfo {
    id: string
    device: SessionDevice
    ipAddress: string
    location?: {
        city?: string
        country?: string
    }
    lastActive: string
    isCurrent: boolean
    createdAt: string
    userAgent: string
}

interface SessionsListProps {
    className?: string
}

function getDeviceIcon(type: string) {
    switch (type) {
        case 'mobile':
            return <Smartphone className="w-5 h-5" />
        case 'tablet':
            return <Tablet className="w-5 h-5" />
        default:
            return <Monitor className="w-5 h-5" />
    }
}

function getBrowserIcon(browser: string) {
    const lowerBrowser = browser.toLowerCase()
    if (lowerBrowser.includes('chrome')) {
        return <Chrome className="w-4 h-4 text-blue-500" />
    }
    return <Globe className="w-4 h-4 text-gray-500" />
}

function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'justo ahora'
    if (diffMins < 60) return `hace ${diffMins} min`
    if (diffHours < 24) return `hace ${diffHours} hora${diffHours === 1 ? '' : 's'}`
    if (diffDays < 7) return `hace ${diffDays} día${diffDays === 1 ? '' : 's'}`
    return date.toLocaleDateString('es-MX')
}

export default function SessionsList({ className }: SessionsListProps) {
    const [sessions, setSessions] = useState<SessionInfo[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [revoking, setRevoking] = useState<string | null>(null)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [sessionToRevoke, setSessionToRevoke] = useState<SessionInfo | null>(null)
    const [showSignOutAllModal, setShowSignOutAllModal] = useState(false)
    const [signingOutAll, setSigningOutAll] = useState(false)
    const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null)
    const supabase = createClient()

    const showToast = useCallback((type: 'success' | 'error', message: string) => {
        setToast({ type, message })
        setTimeout(() => setToast(null), 3000)
    }, [])

    const fetchSessions = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            
            const response = await fetch('/api/sessions')
            
            if (!response.ok) {
                throw new Error('No se pudieron obtener las sesiones')
            }
            
            const data = await response.json()
            setSessions(data.sessions || [])
        } catch (err) {
            console.error('Error fetching sessions:', err)
            setError('No se pudieron cargar las sesiones')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchSessions()
    }, [fetchSessions])

    const handleRevokeClick = (session: SessionInfo) => {
        setSessionToRevoke(session)
        setShowConfirmModal(true)
    }

    const confirmRevoke = async () => {
        if (!sessionToRevoke) return

        try {
            setRevoking(sessionToRevoke.id)
            setShowConfirmModal(false)

            const response = await fetch(`/api/sessions?sessionId=${sessionToRevoke.id}`, {
                method: 'DELETE'
            })

            if (!response.ok) {
                throw new Error('No se pudo revocar la sesión')
            }

            showToast('success', 'Sesión revocada')
            
            // Log audit event
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.access_token) {
                fetch('/api/audit', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        type: 'session_revoked',
                        details: `${sessionToRevoke.device.browser} on ${sessionToRevoke.device.os}`,
                    }),
                }).catch(() => {/* Audit logging is best-effort */})
            }
            
            await fetchSessions()
        } catch (err) {
            console.error('Error revoking session:', err)
            showToast('error', 'No se pudo revocar la sesión')
        } finally {
            setRevoking(null)
            setSessionToRevoke(null)
        }
    }

    const handleSignOutAll = async () => {
        try {
            setSigningOutAll(true)

            const response = await fetch('/api/sessions?scope=all', {
                method: 'DELETE'
            })

            if (!response.ok) {
                throw new Error('No se pudo cerrar sesión en todos los dispositivos')
            }

            showToast('success', 'Sesión cerrada en todos los dispositivos')
            
            // Log audit event before redirect
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.access_token) {
                await fetch('/api/audit', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        type: 'session_revoked_all',
                        details: 'Todas las sesiones cerradas desde ajustes',
                    }),
                }).catch(() => {/* Audit logging is best-effort */})
            }
            
            setShowSignOutAllModal(false)
            
            // Redirect to login after signing out all
            setTimeout(() => {
                window.location.href = '/login'
            }, 1500)
        } catch (err) {
            console.error('Error signing out all:', err)
            showToast('error', 'No se pudo cerrar sesión en todos los dispositivos')
        } finally {
            setSigningOutAll(false)
        }
    }

    if (loading) {
        return (
            <div className={cn("space-y-3", className)}>
                {[1, 2].map((i) => (
                    <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg p-4 h-20" />
                ))}
            </div>
        )
    }

    if (error) {
        return (
            <div className={cn("flex items-center gap-2 text-red-500 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg", className)}>
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
                <button
                    onClick={fetchSessions}
                    className="ml-auto text-sm underline hover:no-underline"
                >
                    Reintentar
                </button>
            </div>
        )
    }

    return (
        <div className={cn("space-y-4", className)}>
            {/* Header with refresh and sign out all */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Shield className="w-4 h-4" />
                    <span>{sessions.length === 1 ? '1 sesión activa' : `${sessions.length} sesiones activas`}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchSessions}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        title="Actualizar sesiones"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    {sessions.length > 1 && (
                        <button
                            onClick={() => setShowSignOutAllModal(true)}
                            className="text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1"
                        >
                            <LogOut className="w-4 h-4" />
                            Cerrar sesión en todos
                        </button>
                    )}
                </div>
            </div>

            {/* Sessions list */}
            <div className="space-y-3">
                {sessions.map((session) => (
                    <motion.div
                        key={session.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={cn(
                            "flex items-center gap-4 p-4 rounded-lg border transition-colors",
                            session.isCurrent
                                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                        )}
                    >
                        {/* Device icon */}
                        <div className={cn(
                            "p-3 rounded-full",
                            session.isCurrent
                                ? "bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-300"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                        )}>
                            {getDeviceIcon(session.device.type)}
                        </div>

                        {/* Session info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {session.device.browser}
                                </span>
                                {getBrowserIcon(session.device.browser)}
                                {session.isCurrent && (
                                    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 rounded-full">
                                        Sesión actual
                                    </span>
                                )}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {session.device.os} • {session.ipAddress}
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">
                                Activo {formatRelativeTime(session.lastActive)}
                            </div>
                        </div>

                        {/* Revoke button */}
                        {!session.isCurrent && (
                            <button
                                onClick={() => handleRevokeClick(session)}
                                disabled={revoking === session.id}
                                className={cn(
                                    "p-2 rounded-lg transition-colors",
                                    revoking === session.id
                                        ? "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                                        : "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600"
                                )}
                                title="Revocar sesión"
                            >
                                {revoking === session.id ? (
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Trash2 className="w-5 h-5" />
                                )}
                            </button>
                        )}
                    </motion.div>
                ))}
            </div>

            {sessions.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No se encontraron sesiones activas</p>
                </div>
            )}

            {/* Confirm revoke modal */}
            <AnimatePresence>
                {showConfirmModal && sessionToRevoke && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowConfirmModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                                    <AlertCircle className="w-6 h-6 text-red-500" />
                                </div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                        ¿Revocar sesión?
                                    </h3>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 mb-6">
                                Esto cerrará la sesión del dispositivo con <strong>{sessionToRevoke.device.browser}</strong> en {sessionToRevoke.device.os}. 
                                Tendrás que iniciar sesión de nuevo en ese dispositivo.
                            </p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setShowConfirmModal(false)}
                                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmRevoke}
                                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                                >
                                    Revocar sesión
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sign out all modal */}
            <AnimatePresence>
                {showSignOutAllModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowSignOutAllModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                                    <LogOut className="w-6 h-6 text-red-500" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    ¿Cerrar sesión en todos los dispositivos?
                                </h3>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 mb-6">
                                Esto cerrará tu sesión en <strong>todos los dispositivos</strong>, incluyendo este. 
                                Tendrás que iniciar sesión de nuevo en todos tus dispositivos.
                            </p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setShowSignOutAllModal(false)}
                                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSignOutAll}
                                    disabled={signingOutAll}
                                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {signingOutAll ? 'Cerrando...' : 'Cerrar en todos'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toast notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className={cn(
                            "fixed bottom-4 right-4 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg z-50",
                            toast.type === 'success'
                                ? "bg-green-500 text-white"
                                : "bg-red-500 text-white"
                        )}
                    >
                        {toast.type === 'success' ? (
                            <CheckCircle className="w-5 h-5" />
                        ) : (
                            <AlertCircle className="w-5 h-5" />
                        )}
                        <span>{toast.message}</span>
                        <button
                            onClick={() => setToast(null)}
                            className="ml-2 p-1 hover:bg-white/20 rounded"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
