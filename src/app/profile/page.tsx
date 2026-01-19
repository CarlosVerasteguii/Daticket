'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'

export default function ProfilePage() {
    const supabase = createClient()
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)

    useEffect(() => {
        async function getUser() {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
        }
        getUser()
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <div className="flex min-h-screen flex-col items-center bg-gray-50 p-8">
            <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-md">
                <h1 className="mb-6 text-2xl font-bold text-gray-900">User Profile</h1>

                <div className="space-y-4">
                    <div className="rounded-md bg-gray-100 p-4">
                        <p className="text-sm font-medium text-gray-500">Email Address</p>
                        <p className="text-lg text-gray-900">{user?.email || 'Loading...'}</p>
                    </div>

                    <div className="rounded-md bg-gray-100 p-4">
                        <p className="text-sm font-medium text-gray-500">User ID</p>
                        <p className="font-mono text-sm text-gray-700">{user?.id || '...'}</p>
                    </div>
                </div>

                <div className="mt-8">
                    <button
                        onClick={handleLogout}
                        className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    )
}
