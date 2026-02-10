'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Check, X, Loader2, KeyRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface PasswordRequirement {
    label: string
    test: (password: string) => boolean
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
    { label: 'Al menos 8 caracteres', test: (p) => p.length >= 8 },
    { label: 'Al menos un número', test: (p) => /\d/.test(p) },
    { label: 'Al menos una letra mayúscula', test: (p) => /[A-Z]/.test(p) },
]

export default function PasswordChange() {
    const supabase = createClient()
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)

    const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0
    const allRequirementsMet = PASSWORD_REQUIREMENTS.every((req) => req.test(newPassword))
    const isFormValid = currentPassword.length > 0 && allRequirementsMet && passwordsMatch

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isFormValid || isSubmitting) return

        setIsSubmitting(true)
        setError(null)

        try {
            // First, verify current password by attempting to sign in
            const { data: { user } } = await supabase.auth.getUser()
            if (!user?.email) {
                setError('No se pudo verificar el usuario. Intenta de nuevo.')
                setIsSubmitting(false)
                return
            }

            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: currentPassword,
            })

            if (signInError) {
                setError('La contraseña actual es incorrecta')
                setIsSubmitting(false)
                return
            }

            // Update password
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
            })

            if (updateError) {
                setError(updateError.message || 'No se pudo actualizar la contraseña')
                setIsSubmitting(false)
                return
            }

            // Success - log audit event
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.access_token) {
                fetch('/api/audit', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        type: 'password_change',
                        details: 'Contraseña cambiada desde ajustes',
                    }),
                }).catch(() => {/* Audit logging is best-effort */})
            }

            setSuccess(true)
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
            
            // Hide success message after 3 seconds and collapse
            setTimeout(() => {
                setSuccess(false)
                setIsExpanded(false)
            }, 3000)

        } catch {
            setError('Ocurrió un error inesperado. Intenta de nuevo.')
        } finally {
            setIsSubmitting(false)
        }
    }, [supabase, currentPassword, newPassword, isFormValid, isSubmitting])

    const handleReset = () => {
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setError(null)
        setSuccess(false)
    }

    return (
        <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700">
            <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => !isExpanded && setIsExpanded(true)}
            >
                <div>
                    <h3 className="font-bold text-sm mb-1 flex items-center gap-2">
                        <KeyRound className="h-4 w-4" />
                        Cambiar contraseña
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Actualiza tu contraseña para mayor seguridad
                    </p>
                </div>
                {!isExpanded && (
                    <button
                        type="button"
                        onClick={() => setIsExpanded(true)}
                        className="px-4 py-2 border border-black dark:border-neutral-600 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                    >
                        CAMBIAR
                    </button>
                )}
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                            {/* Current Password */}
                            <div>
                                <label className="block text-xs font-bold uppercase mb-2">
                                    Contraseña actual
                                </label>
                                <div className="relative">
                                    <input
                                        type={showCurrentPassword ? 'text' : 'password'}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="w-full p-3 pr-10 border border-black dark:border-neutral-600 bg-white dark:bg-neutral-800 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                                        placeholder="Ingresa tu contraseña actual"
                                        disabled={isSubmitting}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                                    >
                                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* New Password */}
                            <div>
                                <label className="block text-xs font-bold uppercase mb-2">
                                    Nueva contraseña
                                </label>
                                <div className="relative">
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full p-3 pr-10 border border-black dark:border-neutral-600 bg-white dark:bg-neutral-800 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                                        placeholder="Ingresa tu nueva contraseña"
                                        disabled={isSubmitting}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                                    >
                                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>

                                {/* Password Requirements */}
                                {newPassword.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                        {PASSWORD_REQUIREMENTS.map((req) => {
                                            const isMet = req.test(newPassword)
                                            return (
                                                <div
                                                    key={req.label}
                                                    className={cn(
                                                        'flex items-center gap-2 text-xs',
                                                        isMet ? 'text-green-600 dark:text-green-400' : 'text-neutral-500'
                                                    )}
                                                >
                                                    {isMet ? (
                                                        <Check className="h-3 w-3" />
                                                    ) : (
                                                        <X className="h-3 w-3" />
                                                    )}
                                                    <span>{req.label}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-xs font-bold uppercase mb-2">
                                    Confirmar nueva contraseña
                                </label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className={cn(
                                            'w-full p-3 pr-10 border bg-white dark:bg-neutral-800 font-mono text-sm focus:outline-none focus:ring-2',
                                            confirmPassword.length > 0 && !passwordsMatch
                                                ? 'border-red-500 focus:ring-red-500'
                                                : confirmPassword.length > 0 && passwordsMatch
                                                ? 'border-green-500 focus:ring-green-500'
                                                : 'border-black dark:border-neutral-600 focus:ring-black dark:focus:ring-white'
                                        )}
                                        placeholder="Confirma tu nueva contraseña"
                                        disabled={isSubmitting}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                {confirmPassword.length > 0 && !passwordsMatch && (
                                    <p className="mt-1 text-xs text-red-500">Las contraseñas no coinciden</p>
                                )}
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Success Message */}
                            {success && (
                                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm flex items-center gap-2">
                                    <Check className="h-4 w-4" />
                                    ¡Contraseña actualizada!
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    disabled={!isFormValid || isSubmitting}
                                    className={cn(
                                        'flex-1 px-4 py-3 font-bold text-sm uppercase transition-colors flex items-center justify-center gap-2',
                                        isFormValid && !isSubmitting
                                            ? 'bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200'
                                            : 'bg-neutral-300 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 cursor-not-allowed'
                                    )}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Actualizando...
                                        </>
                                    ) : (
                                        'Actualizar contraseña'
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        handleReset()
                                        setIsExpanded(false)
                                    }}
                                    disabled={isSubmitting}
                                    className="px-4 py-3 border border-black dark:border-neutral-600 font-bold text-sm uppercase hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
