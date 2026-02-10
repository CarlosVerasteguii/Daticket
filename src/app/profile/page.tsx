'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import DashboardShell from '@/components/layout/DashboardShell'
import { User as UserIcon, Mail, Key, LogOut, Shield } from 'lucide-react'

export default function ProfilePage() {
    const supabase = createClient()
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)

    useEffect(() => {
        async function getUser() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }
            setUser(user)
        }
        getUser()
    }, [router, supabase])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <DashboardShell>
            {/* Header */}
            <div className="p-6 border-b border-foreground/20 bg-background">
                <h1 className="text-3xl font-bold tracking-tighter text-foreground">Ajustes de cuenta</h1>
                <p className="text-sm text-foreground/60 mt-1">Administra tu perfil y preferencias</p>
            </div>

            {/* Main Content */}
            <div className="p-8 max-w-3xl">
                {/* Profile Card */}
                <div className="border border-foreground/20 bg-background mb-6">
                    <div className="p-4 border-b border-foreground/20 bg-foreground/5 flex items-center gap-3">
                        <UserIcon className="h-5 w-5 text-foreground" />
                        <h2 className="font-bold uppercase text-sm tracking-wider text-foreground">Información del perfil</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        {/* Email */}
                        <div className="flex items-start gap-4">
                            <div className="h-10 w-10 bg-foreground/10 border border-foreground/20 flex items-center justify-center">
                                <Mail className="h-5 w-5 text-foreground" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-bold uppercase tracking-wider text-foreground/60">Correo electrónico</p>
                                <p className="text-lg font-medium mt-1 text-foreground">{user?.email || 'Cargando...'}</p>
                            </div>
                        </div>

                        {/* User ID */}
                        <div className="flex items-start gap-4">
                            <div className="h-10 w-10 bg-foreground/10 border border-foreground/20 flex items-center justify-center">
                                <Key className="h-5 w-5 text-foreground" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-bold uppercase tracking-wider text-foreground/60">ID de usuario</p>
                                <p className="font-mono text-sm text-foreground/70 mt-1 break-all">{user?.id || '...'}</p>
                            </div>
                        </div>

                        {/* Created At */}
                        <div className="flex items-start gap-4">
                            <div className="h-10 w-10 bg-foreground/10 border border-foreground/20 flex items-center justify-center">
                                <Shield className="h-5 w-5 text-foreground" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-bold uppercase tracking-wider text-foreground/60">Cuenta creada</p>
                                <p className="text-sm text-foreground/70 mt-1">
                                    {user?.created_at ? new Date(user.created_at).toLocaleDateString('es-MX', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    }) : '...'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="border border-swiss-orange bg-background">
                    <div className="p-4 border-b border-swiss-orange bg-orange-50 dark:bg-orange-900/20 flex items-center gap-3">
                        <LogOut className="h-5 w-5 text-swiss-orange" />
                        <h2 className="font-bold uppercase text-sm tracking-wider text-swiss-orange">Sesión</h2>
                    </div>
                    <div className="p-6 flex items-center justify-between">
                        <div>
                            <p className="font-bold text-foreground">Cerrar sesión</p>
                            <p className="text-sm text-foreground/60">Finaliza tu sesión actual y vuelve al inicio de sesión</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="px-6 py-3 bg-swiss-orange text-white font-bold hover:opacity-90 border border-black transition-colors"
                        >
                            Cerrar sesión
                        </button>
                    </div>
                </div>
            </div>
        </DashboardShell>
    )
}
