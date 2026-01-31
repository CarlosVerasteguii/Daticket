'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Loader2, ArrowLeft, Mail, Check } from 'lucide-react'

const forgotPasswordSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
    const supabase = createClient()
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [emailSent, setEmailSent] = useState(false)
    const [submittedEmail, setSubmittedEmail] = useState('')

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
    })

    const onSubmit = async (data: ForgotPasswordFormData) => {
        setIsLoading(true)
        setError(null)

        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(
                data.email,
                {
                    redirectTo: `${window.location.origin}/reset-password`,
                }
            )

            if (resetError) {
                throw resetError
            }

            setSubmittedEmail(data.email)
            setEmailSent(true)
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to send reset email'
            setError(errorMessage)
        } finally {
            setIsLoading(false)
        }
    }

    if (emailSent) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
                <div className="w-full max-w-md space-y-8 border border-black bg-white p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                    <div className="text-center">
                        <div className="mx-auto w-16 h-16 border border-black bg-green-50 flex items-center justify-center mb-4">
                            <Check className="h-8 w-8 text-green-600" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tighter text-black">
                            Check Your Email
                        </h1>
                        <p className="mt-4 text-sm text-neutral-600">
                            We sent a password reset link to:
                        </p>
                        <p className="mt-2 font-bold text-black">
                            {submittedEmail}
                        </p>
                    </div>

                    <div className="border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
                        <p className="mb-2">
                            <strong>Didn&apos;t receive the email?</strong>
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-xs">
                            <li>Check your spam folder</li>
                            <li>Make sure you entered the correct email</li>
                            <li>Wait a few minutes and try again</li>
                        </ul>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={() => {
                                setEmailSent(false)
                                setSubmittedEmail('')
                            }}
                            className="flex w-full justify-center border border-black bg-black px-4 py-3 text-sm font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-all"
                        >
                            Try Another Email
                        </button>
                        <Link
                            href="/login"
                            className="flex w-full justify-center items-center gap-2 border border-black bg-white px-4 py-3 text-sm font-bold uppercase tracking-wider text-black hover:bg-neutral-100 transition-all"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Login
                        </Link>
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
                        <Mail className="h-8 w-8" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tighter text-black">
                        Forgot Password?
                    </h1>
                    <p className="mt-2 text-sm text-neutral-600">
                        Enter your email and we&apos;ll send you a reset link
                    </p>
                </div>

                {error && (
                    <div className="border border-swiss-orange bg-orange-50 p-4 text-sm text-swiss-orange font-bold animate-fade-in-up">
                        ✗ {error}
                    </div>
                )}

                <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
                    <div>
                        <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-black mb-2">
                            Email address
                        </label>
                        <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            className="block w-full border border-black px-4 py-3 text-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-swiss-blue transition-all hover:border-neutral-600"
                            placeholder="your@email.com"
                            {...register('email')}
                        />
                        {errors.email && (
                            <p className="mt-1 text-sm text-swiss-orange font-bold">{errors.email.message}</p>
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
                                    Sending...
                                </>
                            ) : (
                                'Send Reset Link'
                            )}
                        </button>
                    </div>

                    <div className="text-center text-sm">
                        <Link href="/login" className="flex items-center justify-center gap-2 font-bold text-neutral-600 hover:text-black transition-colors">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Login
                        </Link>
                    </div>
                </form>
            </div>
        </main>
    )
}
