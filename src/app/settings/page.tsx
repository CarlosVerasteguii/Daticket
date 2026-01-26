'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import DashboardShell from '@/components/layout/DashboardShell'
import { Settings as SettingsIcon, Bell, Moon, Globe, Database, Shield, ChevronRight } from 'lucide-react'

export default function SettingsPage() {
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login')
            }
        }
        checkAuth()
    }, [router, supabase])

    const SettingRow = ({ icon: Icon, title, description, action }: any) => (
        <div className="flex items-center justify-between p-4 border-b border-black last:border-b-0 hover:bg-neutral-50 transition-colors">
            <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-neutral-100 border border-black flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <p className="font-bold">{title}</p>
                    <p className="text-sm text-neutral-500">{description}</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {action}
                <ChevronRight className="h-5 w-5 text-neutral-400" />
            </div>
        </div>
    )

    return (
        <DashboardShell>
            {/* Header */}
            <div className="p-6 border-b border-black bg-white">
                <h1 className="text-3xl font-bold tracking-tighter">Settings</h1>
                <p className="text-sm text-neutral-500 mt-1">Configure your preferences</p>
            </div>

            {/* Main Content */}
            <div className="p-8 max-w-3xl space-y-6">
                {/* Preferences Section */}
                <div className="border border-black bg-white">
                    <div className="p-4 border-b border-black bg-neutral-50 flex items-center gap-3">
                        <SettingsIcon className="h-5 w-5" />
                        <h2 className="font-bold uppercase text-sm tracking-wider">Preferences</h2>
                    </div>

                    <SettingRow
                        icon={Bell}
                        title="Notifications"
                        description="Email alerts for new receipts"
                        action={<span className="text-sm font-mono text-neutral-500">Enabled</span>}
                    />
                    <SettingRow
                        icon={Moon}
                        title="Appearance"
                        description="Theme and display settings"
                        action={<span className="text-sm font-mono text-neutral-500">Light</span>}
                    />
                    <SettingRow
                        icon={Globe}
                        title="Language"
                        description="Interface language"
                        action={<span className="text-sm font-mono text-neutral-500">English</span>}
                    />
                </div>

                {/* Data Section */}
                <div className="border border-black bg-white">
                    <div className="p-4 border-b border-black bg-neutral-50 flex items-center gap-3">
                        <Database className="h-5 w-5" />
                        <h2 className="font-bold uppercase text-sm tracking-wider">Data & Storage</h2>
                    </div>

                    <SettingRow
                        icon={Database}
                        title="Export Data"
                        description="Download all your receipts as CSV"
                        action={<button className="px-3 py-1 border border-black text-xs font-bold hover:bg-neutral-100">Export</button>}
                    />
                    <SettingRow
                        icon={Shield}
                        title="Privacy"
                        description="Manage your data and privacy settings"
                        action={null}
                    />
                </div>

                {/* Info */}
                <div className="border border-black bg-white p-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">App Version</p>
                    <p className="font-mono">Daticket v1.0.0</p>
                    <p className="text-xs text-neutral-400 mt-2">Swiss International Edition</p>
                </div>
            </div>
        </DashboardShell>
    )
}
