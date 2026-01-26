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
            <div className="p-6 border-b border-black bg-white">
                <h1 className="text-3xl font-bold tracking-tighter">Account Settings</h1>
                <p className="text-sm text-neutral-500 mt-1">Manage your profile and preferences</p>
            </div>

            {/* Main Content */}
            <div className="p-8 max-w-3xl">
                {/* Profile Card */}
                <div className="border border-black bg-white mb-6">
                    <div className="p-4 border-b border-black bg-neutral-50 flex items-center gap-3">
                        <UserIcon className="h-5 w-5" />
                        <h2 className="font-bold uppercase text-sm tracking-wider">Profile Information</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        {/* Email */}
                        <div className="flex items-start gap-4">
                            <div className="h-10 w-10 bg-neutral-100 border border-black flex items-center justify-center">
                                <Mail className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Email Address</p>
                                <p className="text-lg font-medium mt-1">{user?.email || 'Loading...'}</p>
                            </div>
                        </div>

                        {/* User ID */}
                        <div className="flex items-start gap-4">
                            <div className="h-10 w-10 bg-neutral-100 border border-black flex items-center justify-center">
                                <Key className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">User ID</p>
                                <p className="font-mono text-sm text-neutral-700 mt-1 break-all">{user?.id || '...'}</p>
                            </div>
                        </div>

                        {/* Created At */}
                        <div className="flex items-start gap-4">
                            <div className="h-10 w-10 bg-neutral-100 border border-black flex items-center justify-center">
                                <Shield className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Account Created</p>
                                <p className="text-sm text-neutral-700 mt-1">
                                    {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
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
                <div className="border border-red-600 bg-white">
                    <div className="p-4 border-b border-red-600 bg-red-50 flex items-center gap-3">
                        <LogOut className="h-5 w-5 text-red-600" />
                        <h2 className="font-bold uppercase text-sm tracking-wider text-red-600">Session</h2>
                    </div>
                    <div className="p-6 flex items-center justify-between">
                        <div>
                            <p className="font-bold">Sign Out</p>
                            <p className="text-sm text-neutral-500">End your current session and return to login</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="px-6 py-3 bg-red-600 text-white font-bold hover:bg-red-700 border border-black transition-colors"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </DashboardShell>
    )
}
