'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import DashboardShell from '@/components/layout/DashboardShell'
import { Settings as SettingsIcon, Bell, Moon, Sun, Monitor, Globe, Database, Shield, ChevronRight, Check, DollarSign } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { useCurrency, CURRENCIES } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

export default function SettingsPage() {
    const router = useRouter()
    const supabase = createClient()
    const { theme, setTheme, resolvedTheme } = useTheme()
    const { currency, setCurrency, formatAmount } = useCurrency()
    const [showThemeMenu, setShowThemeMenu] = useState(false)
    const [showCurrencyMenu, setShowCurrencyMenu] = useState(false)

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login')
            }
        }
        checkAuth()
    }, [router, supabase])

    const themeOptions = [
        { value: 'light' as const, label: 'Light', icon: Sun },
        { value: 'dark' as const, label: 'Dark', icon: Moon },
        { value: 'system' as const, label: 'System', icon: Monitor },
    ]

    const SettingRow = ({ icon: Icon, title, description, action, onClick }: any) => (
        <div 
            className={cn(
                "flex items-center justify-between p-4 border-b border-black dark:border-neutral-700 last:border-b-0 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors",
                onClick && "cursor-pointer"
            )}
            onClick={onClick}
        >
            <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-neutral-100 dark:bg-neutral-800 border border-black dark:border-neutral-700 flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <p className="font-bold">{title}</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
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
            <div className="p-6 border-b border-black dark:border-neutral-700 bg-white dark:bg-neutral-900">
                <h1 className="text-3xl font-bold tracking-tighter">Settings</h1>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Configure your preferences</p>
            </div>

            {/* Main Content */}
            <div className="p-8 max-w-3xl space-y-6">
                {/* Preferences Section */}
                <div className="border border-black dark:border-neutral-700 bg-white dark:bg-neutral-900">
                    <div className="p-4 border-b border-black dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 flex items-center gap-3">
                        <SettingsIcon className="h-5 w-5" />
                        <h2 className="font-bold uppercase text-sm tracking-wider">Preferences</h2>
                    </div>

                    <SettingRow
                        icon={Bell}
                        title="Notifications"
                        description="Email alerts for new receipts"
                        action={<span className="text-sm font-mono text-neutral-500 dark:text-neutral-400">Enabled</span>}
                    />
                    
                    {/* Theme Toggle */}
                    <div className="relative">
                        <SettingRow
                            icon={resolvedTheme === 'dark' ? Moon : Sun}
                            title="Appearance"
                            description="Theme and display settings"
                            action={
                                <span className="text-sm font-mono text-neutral-500 dark:text-neutral-400 capitalize">
                                    {theme}
                                </span>
                            }
                            onClick={() => setShowThemeMenu(!showThemeMenu)}
                        />
                        
                        <AnimatePresence>
                            {showThemeMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute right-4 top-full mt-2 z-10 border border-black dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-lg"
                                >
                                    {themeOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setTheme(option.value)
                                                setShowThemeMenu(false)
                                            }}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors",
                                                theme === option.value && "bg-neutral-100 dark:bg-neutral-700"
                                            )}
                                        >
                                            <option.icon className="h-4 w-4" />
                                            <span className="font-medium">{option.label}</span>
                                            {theme === option.value && (
                                                <Check className="h-4 w-4 ml-auto text-green-600" />
                                            )}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Currency Selector */}
                    <div className="relative">
                        <SettingRow
                            icon={DollarSign}
                            title="Currency"
                            description="Display format for amounts"
                            action={
                                <span className="text-sm font-mono text-neutral-500 dark:text-neutral-400">
                                    {currency.code} ({currency.symbol})
                                </span>
                            }
                            onClick={() => setShowCurrencyMenu(!showCurrencyMenu)}
                        />
                        
                        <AnimatePresence>
                            {showCurrencyMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute right-4 top-full mt-2 z-10 border border-black dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-lg max-h-64 overflow-y-auto"
                                >
                                    {CURRENCIES.map((curr) => (
                                        <button
                                            key={curr.code}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setCurrency(curr.code)
                                                setShowCurrencyMenu(false)
                                            }}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors min-w-[200px]",
                                                currency.code === curr.code && "bg-neutral-100 dark:bg-neutral-700"
                                            )}
                                        >
                                            <span className="font-mono w-6">{curr.symbol}</span>
                                            <span className="font-medium">{curr.name}</span>
                                            <span className="text-xs text-neutral-400 ml-auto">{curr.code}</span>
                                            {currency.code === curr.code && (
                                                <Check className="h-4 w-4 text-green-600" />
                                            )}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <SettingRow
                        icon={Globe}
                        title="Language"
                        description="Interface language"
                        action={<span className="text-sm font-mono text-neutral-500 dark:text-neutral-400">English</span>}
                    />
                </div>

                {/* Data Section */}
                <div className="border border-black dark:border-neutral-700 bg-white dark:bg-neutral-900">
                    <div className="p-4 border-b border-black dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 flex items-center gap-3">
                        <Database className="h-5 w-5" />
                        <h2 className="font-bold uppercase text-sm tracking-wider">Data & Storage</h2>
                    </div>

                    <SettingRow
                        icon={Database}
                        title="Export Data"
                        description="Download all your receipts as CSV"
                        action={<button className="px-3 py-1 border border-black dark:border-neutral-600 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-700">Export</button>}
                    />
                    <SettingRow
                        icon={Shield}
                        title="Privacy"
                        description="Manage your data and privacy settings"
                        action={null}
                    />
                </div>

                {/* Info */}
                <div className="border border-black dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">App Version</p>
                    <p className="font-mono">Daticket v1.0.0</p>
                    <p className="text-xs text-neutral-400 mt-2">Swiss International Edition</p>
                </div>
            </div>
        </DashboardShell>
    )
}
