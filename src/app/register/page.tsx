'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

const registerSchema = z.object({
    email: z.string().email('Correo electrónico inválido'),
    password: z
        .string()
        .min(8, 'La contraseña debe tener al menos 8 caracteres')
        .regex(/[A-Z]/, 'La contraseña debe incluir al menos una letra mayúscula')
        .regex(/[0-9]/, 'La contraseña debe incluir al menos un número'),
})

type RegisterFormData = z.infer<typeof registerSchema>

export default function RegisterPage() {
    const router = useRouter()
    const supabase = createClient()
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
    })

    const onSubmit = async (data: RegisterFormData) => {
        setIsLoading(true)
        setError(null)

        try {
            const { error: signUpError } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
            })

            if (signUpError) {
                throw signUpError
            }

            router.push('/login?registered=true')
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Ocurrió un error durante el registro'
            setError(message || 'Ocurrió un error durante el registro')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
            <div className="w-full max-w-md space-y-8 border border-black bg-white p-8">
                <div className="text-center">
                    <h1 className="text-4xl font-bold tracking-tighter text-black">
                        Daticket
                    </h1>
                    <p className="mt-2 text-sm font-bold uppercase tracking-widest text-black">
                        Crea tu cuenta
                    </p>
                </div>

                {error && (
                    <div className="border border-swiss-orange bg-orange-50 p-4 text-sm text-swiss-orange font-medium">
                        {error}
                    </div>
                )}

                <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-black mb-2">
                                Correo electrónico
                            </label>
                            <input
                                id="email"
                                type="email"
                                autoComplete="email"
                                className="block w-full border border-black px-4 py-3 text-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-black"
                                {...register('email')}
                            />
                            {errors.email && (
                                <p className="mt-1 text-sm text-swiss-orange font-medium">{errors.email.message}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-black mb-2">
                                Contraseña
                            </label>
                            <input
                                id="password"
                                type="password"
                                autoComplete="new-password"
                                className="block w-full border border-black px-4 py-3 text-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-black"
                                {...register('password')}
                            />
                            <p className="mt-2 text-xs text-neutral-600 font-mono">
                                Mín. 8 caracteres, 1 mayúscula, 1 número
                            </p>
                            {errors.password && (
                                <p className="mt-1 text-sm text-swiss-orange font-medium">{errors.password.message}</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex w-full justify-center border border-black bg-black px-4 py-3 text-sm font-bold uppercase tracking-wider text-white hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:bg-neutral-400"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creando cuenta...
                                </>
                            ) : (
                                'Registrarse'
                            )}
                        </button>
                    </div>

                    <div className="text-center text-sm">
                        <Link href="/login" className="font-bold text-black underline decoration-2 underline-offset-4 hover:text-swiss-blue">
                            ¿Ya tienes una cuenta? Inicia sesión
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    )
}
