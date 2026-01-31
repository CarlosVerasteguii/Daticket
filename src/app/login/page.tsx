'use client'

import { Suspense } from 'react'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

// Componente que usa useSearchParams debe estar envuelto en Suspense
function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const supabase = createClient()

    const registered = searchParams.get('registered')
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    })

    const onSubmit = async (data: LoginFormData) => {
        setIsLoading(true)
        setError(null)

        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            })

            if (signInError) {
                throw signInError
            }

            router.push('/dashboard')
            router.refresh()
        } catch (err: any) {
            setError(err.message || 'Invalid email or password')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="w-full max-w-md space-y-8 border border-black bg-white p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
            <div className="text-center">
                <h1 className="text-4xl font-bold tracking-tighter text-black">
                    Daticket
                </h1>
                <p className="mt-2 text-sm font-bold uppercase tracking-widest text-black">
                    Sign in to your account
                </p>
            </div>

            {registered && (
                <div className="border border-swiss-green bg-green-50 p-4 text-sm text-swiss-green text-center font-bold animate-fade-in-up">
                    ✓ Registration successful! Please sign in.
                </div>
            )}

            {error && (
                <div className="border border-swiss-orange bg-orange-50 p-4 text-sm text-swiss-orange font-bold animate-fade-in-up">
                    ✗ {error}
                </div>
            )}

            <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-black mb-2">
                            Email address
                        </label>
                        <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            className="block w-full border border-black px-4 py-3 text-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-swiss-blue transition-all hover:border-neutral-600"
                            {...register('email')}
                        />
                        {errors.email && (
                            <p className="mt-1 text-sm text-swiss-orange font-bold">{errors.email.message}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-black mb-2">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            autoComplete="current-password"
                            className="block w-full border border-black px-4 py-3 text-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-swiss-blue transition-all hover:border-neutral-600"
                            {...register('password')}
                        />
                        {errors.password && (
                            <p className="mt-1 text-sm text-swiss-orange font-bold">{errors.password.message}</p>
                        )}
                    </div>
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
                                Signing in...
                            </>
                        ) : (
                            'Sign in'
                        )}
                    </button>
                </div>

                <div className="text-center text-sm">
                    <Link href="/register" className="font-bold text-black underline decoration-2 underline-offset-4 hover:text-swiss-blue transition-colors">
                        Don&apos;t have an account? Sign up
                    </Link>
                </div>

                <div className="text-center text-sm">
                    <Link href="/forgot-password" className="font-bold text-neutral-600 hover:text-black transition-colors">
                        Forgot your password?
                    </Link>
                </div>
            </form>

            {process.env.NODE_ENV === 'development' && (
                <div className="mt-6 border-t border-black pt-6">
                    <button
                        type="button"
                        onClick={() => {
                            setValue('email', 'c.verastegui.cc@gmail.com')
                            setValue('password', 'Admin123')
                        }}
                        className="flex w-full items-center justify-center gap-2 border border-black bg-white px-4 py-3 text-sm font-bold text-black hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-black transition-all"
                    >
                        <span>🔧</span>
                        Prefill Credentials (Dev Only)
                    </button>
                </div>
            )}
        </div>
    )
}

// Loading fallback
function LoginFormSkeleton() {
    return (
        <div className="w-full max-w-md space-y-8 border border-black bg-white p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
            <div className="text-center space-y-4">
                <div className="h-10 w-32 bg-neutral-200 mx-auto animate-pulse" />
                <div className="h-4 w-48 bg-neutral-200 mx-auto animate-pulse" />
            </div>
            <div className="space-y-4">
                <div className="h-12 bg-neutral-200 animate-pulse" />
                <div className="h-12 bg-neutral-200 animate-pulse" />
                <div className="h-12 bg-neutral-300 animate-pulse" />
            </div>
        </div>
    )
}

// Main page component
export default function LoginPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
            <Suspense fallback={<LoginFormSkeleton />}>
                <LoginForm />
            </Suspense>
        </div>
    )
}
