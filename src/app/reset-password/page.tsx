'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Loader2, Eye, EyeOff, Check, X, KeyRound, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

const resetPasswordSchema = z.object({
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/\d/, 'Password must contain at least one number')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
})

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

interface PasswordRequirement {
    label: string
    test: (password: string) => boolean
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
    { label: 'At least 8 characters', test: (p) => p.length >= 8 },
    { label: 'At least one number', test: (p) => /\d/.test(p) },
    { label: 'At least one uppercase letter', test: (p) => /[A-Z]/.test(p) },
]

function ResetPasswordForm() {
    const router = useRouter()
    const supabase = createClient()
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [success, setSuccess] = useState(false)
    const [isValidSession, setIsValidSession] = useState<boolean | null>(null)

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<ResetPasswordFormData>({
        resolver: zodResolver(resetPasswordSchema),
    })

    const password = watch('password', '')

    // Check if user has a valid recovery session
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            // A valid password recovery session will have a session
            setIsValidSession(!!session)
        }
        checkSession()

        // Listen for auth state changes (when user clicks email link)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setIsValidSession(true)
            }
        })

        return () => subscription.unsubscribe()
    }, [supabase])

    const onSubmit = async (data: ResetPasswordFormData) => {
        setIsLoading(true)
        setError(null)

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: data.password,
            })

            if (updateError) {
                throw updateError
            }

            setSuccess(true)
            
            // Sign out and redirect to login after 2 seconds
            setTimeout(async () => {
                await supabase.auth.signOut()
                router.push('/login?reset=success')
            }, 2000)
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to reset password'
            setError(errorMessage)
        } finally {
            setIsLoading(false)
        }
    }

    // Loading state while checking session
    if (isValidSession === null) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
                <div className="w-full max-w-md space-y-8 border border-black bg-white p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                    <div className="flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                    <p className="text-center text-sm text-neutral-600">
                        Verifying reset link...
                    </p>
                </div>
            </main>
        )
    }

    // Invalid or expired link
    if (!isValidSession) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
                <div className="w-full max-w-md space-y-8 border border-black bg-white p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                    <div className="text-center">
                        <div className="mx-auto w-16 h-16 border border-black bg-orange-50 flex items-center justify-center mb-4">
                            <AlertTriangle className="h-8 w-8 text-orange-600" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tighter text-black">
                            Invalid or Expired Link
                        </h1>
                        <p className="mt-4 text-sm text-neutral-600">
                            This password reset link is invalid or has expired. Please request a new one.
                        </p>
                    </div>

                    <Link
                        href="/forgot-password"
                        className="flex w-full justify-center border border-black bg-black px-4 py-3 text-sm font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-all"
                    >
                        Request New Link
                    </Link>
                </div>
            </main>
        )
    }

    // Success state
    if (success) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
                <div className="w-full max-w-md space-y-8 border border-black bg-white p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                    <div className="text-center">
                        <div className="mx-auto w-16 h-16 border border-black bg-green-50 flex items-center justify-center mb-4">
                            <Check className="h-8 w-8 text-green-600" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tighter text-black">
                            Password Updated!
                        </h1>
                        <p className="mt-4 text-sm text-neutral-600">
                            Your password has been successfully reset. Redirecting to login...
                        </p>
                    </div>
                    <div className="flex justify-center">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
            <div className="w-full max-w-md space-y-8 border border-black bg-white p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                <div className="text-center">
                    <div className="mx-auto w-16 h-16 border border-black bg-neutral-100 flex items-center justify-center mb-4">
                        <KeyRound className="h-8 w-8" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tighter text-black">
                        Reset Your Password
                    </h1>
                    <p className="mt-2 text-sm text-neutral-600">
                        Enter your new password below
                    </p>
                </div>

                {error && (
                    <div className="border border-swiss-orange bg-orange-50 p-4 text-sm text-swiss-orange font-bold animate-fade-in-up">
                        ✗ {error}
                    </div>
                )}

                <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
                    <div>
                        <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-black mb-2">
                            New Password
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                className="block w-full border border-black px-4 py-3 pr-10 text-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-swiss-blue transition-all hover:border-neutral-600"
                                {...register('password')}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {errors.password && (
                            <p className="mt-1 text-sm text-swiss-orange font-bold">{errors.password.message}</p>
                        )}

                        {/* Password Requirements */}
                        {password.length > 0 && (
                            <div className="mt-2 space-y-1">
                                {PASSWORD_REQUIREMENTS.map((req) => {
                                    const isMet = req.test(password)
                                    return (
                                        <div
                                            key={req.label}
                                            className={cn(
                                                'flex items-center gap-2 text-xs',
                                                isMet ? 'text-green-600' : 'text-neutral-500'
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

                    <div>
                        <label htmlFor="confirmPassword" className="block text-xs font-bold uppercase tracking-wider text-black mb-2">
                            Confirm New Password
                        </label>
                        <div className="relative">
                            <input
                                id="confirmPassword"
                                type={showConfirmPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                className="block w-full border border-black px-4 py-3 pr-10 text-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-swiss-blue transition-all hover:border-neutral-600"
                                {...register('confirmPassword')}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                            >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {errors.confirmPassword && (
                            <p className="mt-1 text-sm text-swiss-orange font-bold">{errors.confirmPassword.message}</p>
                        )}
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex w-full justify-center border border-black bg-black px-4 py-3 text-sm font-bold uppercase tracking-wider text-white hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:bg-neutral-400 transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,0.2)] hover:-translate-x-0.5 hover:-translate-y-0.5"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Resetting...
                                </>
                            ) : (
                                'Reset Password'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    )
}

function ResetPasswordSkeleton() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
            <div className="w-full max-w-md space-y-8 border border-black bg-white p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                <div className="flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            </div>
        </main>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<ResetPasswordSkeleton />}>
            <ResetPasswordForm />
        </Suspense>
    )
}
