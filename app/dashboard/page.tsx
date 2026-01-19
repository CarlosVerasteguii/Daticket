'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        // Basic protection check (for MVP client-side)
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login')
            }
        }
        checkUser()
    }, [router, supabase])

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="mx-auto max-w-7xl">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="mt-4 text-gray-600">Welcome to Daticket! Expense tracking coming soon.</p>

                <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <a href="/profile" className="block rounded-lg bg-white p-6 shadow hover:shadow-md transition-shadow">
                        <h3 className="text-lg font-medium text-gray-900">My Profile</h3>
                        <p className="mt-2 text-sm text-gray-500">Manage your account settings</p>
                    </a>

                    <div className="rounded-lg bg-white p-6 shadow opacity-50 cursor-not-allowed">
                        <h3 className="text-lg font-medium text-gray-900">Upload Receipt</h3>
                        <p className="mt-2 text-sm text-gray-500">Available in Sprint 1 (Epic 2)</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
