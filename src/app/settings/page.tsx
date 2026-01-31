'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import DashboardShell from '@/components/layout/DashboardShell'
import { Settings as SettingsIcon, Bell, Moon, Sun, Monitor, Globe, Database, Shield, ChevronRight, Check, DollarSign, Mail, TrendingUp, Calendar, AlertTriangle, Download, Upload, Trash2, AlertCircle, Lock } from 'lucide-react'
import SessionsList from '@/components/settings/SessionsList'
import { useTheme } from '@/lib/theme'
import { useCurrency, CURRENCIES } from '@/lib/currency'
import { useNotifications, NotificationPreferences } from '@/lib/notifications'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

export default function SettingsPage() {
    const router = useRouter()
    const supabase = createClient()
    const { theme, setTheme, resolvedTheme } = useTheme()
    const { currency, setCurrency, formatAmount } = useCurrency()
    const { preferences, updatePreference } = useNotifications()
    const [showThemeMenu, setShowThemeMenu] = useState(false)
    const [showCurrencyMenu, setShowCurrencyMenu] = useState(false)
    const [showNotificationMenu, setShowNotificationMenu] = useState(false)
    const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'done'>('idle')
    const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'done' | 'error'>('idle')
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteConfirmation, setDeleteConfirmation] = useState('')
    const [deleteStatus, setDeleteStatus] = useState<'idle' | 'deleting' | 'error'>('idle')
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login')
            }
        }
        checkAuth()
    }, [router, supabase])

    // Export user data as JSON
    const handleExport = async () => {
        setExportStatus('exporting')
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            // Fetch all user receipts
            const { data: receipts } = await supabase
                .from('receipts')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false })

            // Fetch user categories
            const { data: categories } = await supabase
                .from('categories')
                .select('*')
                .eq('user_id', session.user.id)

            const exportData = {
                version: '1.0.0',
                exportedAt: new Date().toISOString(),
                user: {
                    email: session.user.email,
                    id: session.user.id
                },
                receipts: receipts || [],
                categories: categories || [],
                preferences: {
                    theme,
                    currency: currency.code,
                    notifications: preferences
                }
            }

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `daticket-backup-${new Date().toISOString().split('T')[0]}.json`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)

            setExportStatus('done')
            setTimeout(() => setExportStatus('idle'), 2000)
        } catch (error) {
            console.error('Export failed:', error)
            setExportStatus('idle')
        }
    }

    // Import user data from JSON
    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        setImportStatus('importing')
        try {
            const text = await file.text()
            const data = JSON.parse(text)

            // Validate structure
            if (!data.version || !data.receipts) {
                throw new Error('Invalid backup file format')
            }

            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            // Import receipts (skip if they already exist by matching store+amount+date)
            if (data.receipts?.length > 0) {
                for (const receipt of data.receipts) {
                    // Check if receipt exists
                    const { data: existing } = await supabase
                        .from('receipts')
                        .select('id')
                        .eq('user_id', session.user.id)
                        .eq('store_name', receipt.store_name)
                        .eq('amount', receipt.amount)
                        .eq('receipt_date', receipt.receipt_date)
                        .single()

                    if (!existing) {
                        await supabase.from('receipts').insert({
                            user_id: session.user.id,
                            store_name: receipt.store_name,
                            amount: receipt.amount,
                            receipt_date: receipt.receipt_date,
                            category: receipt.category,
                            notes: receipt.notes,
                            image_url: receipt.image_url
                        })
                    }
                }
            }

            // Import preferences
            if (data.preferences) {
                if (data.preferences.theme) setTheme(data.preferences.theme)
                if (data.preferences.currency) setCurrency(data.preferences.currency)
                if (data.preferences.notifications) {
                    Object.entries(data.preferences.notifications).forEach(([key, value]) => {
                        updatePreference(key as keyof NotificationPreferences, value as boolean)
                    })
                }
            }

            setImportStatus('done')
            setTimeout(() => {
                setImportStatus('idle')
                router.refresh()
            }, 2000)
        } catch (error) {
            console.error('Import failed:', error)
            setImportStatus('error')
            setTimeout(() => setImportStatus('idle'), 3000)
        }

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    // Delete account and all data
    const handleDeleteAccount = async () => {
        if (deleteConfirmation !== 'DELETE') return
        
        setDeleteStatus('deleting')
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            // Delete all user receipts
            await supabase
                .from('receipts')
                .delete()
                .eq('user_id', session.user.id)

            // Delete all user categories
            await supabase
                .from('categories')
                .delete()
                .eq('user_id', session.user.id)

            // Clear local storage
            localStorage.removeItem('daticket-theme')
            localStorage.removeItem('daticket-currency')
            localStorage.removeItem('daticket-notifications')

            // Sign out (account deletion requires admin API in production)
            await supabase.auth.signOut()

            // Redirect to home
            router.push('/')
        } catch (error) {
            console.error('Delete failed:', error)
            setDeleteStatus('error')
            setTimeout(() => setDeleteStatus('idle'), 3000)
        }
    }

    const themeOptions = [
        { value: 'light' as const, label: 'Light', icon: Sun },
        { value: 'dark' as const, label: 'Dark', icon: Moon },
        { value: 'system' as const, label: 'System', icon: Monitor },
    ]

    const notificationOptions: { key: keyof NotificationPreferences; label: string; description: string; icon: any }[] = [
        { key: 'emailDigest', label: 'Email Digest', description: 'Daily summary of receipts', icon: Mail },
        { key: 'spendingAlerts', label: 'Spending Alerts', description: 'When expenses exceed threshold', icon: TrendingUp },
        { key: 'weeklyReports', label: 'Weekly Reports', description: 'Sunday expense summary', icon: Calendar },
        { key: 'budgetWarnings', label: 'Budget Warnings', description: 'Alert when nearing budget limit', icon: AlertTriangle },
    ]

    const enabledCount = Object.values(preferences).filter(Boolean).length

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

                    {/* Notifications Toggle */}
                    <div className="relative">
                        <SettingRow
                            icon={Bell}
                            title="Notifications"
                            description="Email alerts and spending notifications"
                            action={
                                <span className="text-sm font-mono text-neutral-500 dark:text-neutral-400">
                                    {enabledCount}/{notificationOptions.length} enabled
                                </span>
                            }
                            onClick={() => setShowNotificationMenu(!showNotificationMenu)}
                        />
                        
                        <AnimatePresence>
                            {showNotificationMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute right-4 top-full mt-2 z-10 border border-black dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-lg min-w-[280px]"
                                >
                                    {notificationOptions.map((option) => {
                                        const Icon = option.icon
                                        const isEnabled = preferences[option.key]
                                        return (
                                            <button
                                                key={option.key}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    updatePreference(option.key, !isEnabled)
                                                }}
                                                className={cn(
                                                    "flex items-center justify-between w-full px-4 py-3 text-left hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors border-b border-neutral-200 dark:border-neutral-700 last:border-b-0",
                                                    isEnabled && "bg-neutral-50 dark:bg-neutral-700/50"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Icon className="h-4 w-4 text-neutral-500" />
                                                    <div>
                                                        <p className="font-medium text-sm">{option.label}</p>
                                                        <p className="text-xs text-neutral-400">{option.description}</p>
                                                    </div>
                                                </div>
                                                <div className={cn(
                                                    "w-10 h-6 rounded-full relative transition-colors",
                                                    isEnabled ? "bg-black dark:bg-white" : "bg-neutral-300 dark:bg-neutral-600"
                                                )}>
                                                    <motion.div
                                                        layout
                                                        className={cn(
                                                            "absolute top-1 w-4 h-4 rounded-full",
                                                            isEnabled ? "bg-white dark:bg-black right-1" : "bg-white left-1"
                                                        )}
                                                        style={{ left: isEnabled ? 'auto' : '4px', right: isEnabled ? '4px' : 'auto' }}
                                                    />
                                                </div>
                                            </button>
                                        )
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    
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

                {/* Security Section */}
                <div className="border border-black dark:border-neutral-700 bg-white dark:bg-neutral-900">
                    <div className="p-4 border-b border-black dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 flex items-center gap-3">
                        <Lock className="h-5 w-5" />
                        <h2 className="font-bold uppercase text-sm tracking-wider">Security</h2>
                    </div>

                    <div className="p-4">
                        <div className="mb-4">
                            <h3 className="font-bold text-sm mb-1">Active Sessions</h3>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                View and manage devices where you're currently logged in
                            </p>
                        </div>
                        <SessionsList />
                    </div>
                </div>

                {/* Data Section */}
                <div className="border border-black dark:border-neutral-700 bg-white dark:bg-neutral-900">
                    <div className="p-4 border-b border-black dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 flex items-center gap-3">
                        <Database className="h-5 w-5" />
                        <h2 className="font-bold uppercase text-sm tracking-wider">Data & Storage</h2>
                    </div>

                    <div className="flex items-center justify-between p-4 border-b border-black dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-neutral-100 dark:bg-neutral-800 border border-black dark:border-neutral-700 flex items-center justify-center">
                                <Download className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-bold">Export Data</p>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">Download all receipts as JSON backup</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleExport}
                            disabled={exportStatus !== 'idle'}
                            className={cn(
                                "px-4 py-2 border border-black dark:border-neutral-600 text-xs font-bold transition-colors",
                                exportStatus === 'idle' && "hover:bg-neutral-100 dark:hover:bg-neutral-700",
                                exportStatus === 'exporting' && "bg-neutral-100 dark:bg-neutral-700 cursor-wait",
                                exportStatus === 'done' && "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                            )}
                        >
                            {exportStatus === 'idle' && 'Export JSON'}
                            {exportStatus === 'exporting' && 'Exporting...'}
                            {exportStatus === 'done' && '✓ Downloaded'}
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-4 border-b border-black dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-neutral-100 dark:bg-neutral-800 border border-black dark:border-neutral-700 flex items-center justify-center">
                                <Upload className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-bold">Import Data</p>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">Restore from JSON backup file</p>
                            </div>
                        </div>
                        <div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                onChange={handleImport}
                                className="hidden"
                                id="import-file"
                            />
                            <label 
                                htmlFor="import-file"
                                className={cn(
                                    "px-4 py-2 border border-black dark:border-neutral-600 text-xs font-bold transition-colors cursor-pointer inline-block",
                                    importStatus === 'idle' && "hover:bg-neutral-100 dark:hover:bg-neutral-700",
                                    importStatus === 'importing' && "bg-neutral-100 dark:bg-neutral-700 cursor-wait",
                                    importStatus === 'done' && "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300",
                                    importStatus === 'error' && "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                                )}
                            >
                                {importStatus === 'idle' && 'Import JSON'}
                                {importStatus === 'importing' && 'Importing...'}
                                {importStatus === 'done' && '✓ Imported'}
                                {importStatus === 'error' && '✗ Failed'}
                            </label>
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="border border-red-500 dark:border-red-700 bg-white dark:bg-neutral-900">
                    <div className="p-4 border-b border-red-500 dark:border-red-700 bg-red-50 dark:bg-red-900/20 flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        <h2 className="font-bold uppercase text-sm tracking-wider text-red-600 dark:text-red-400">Danger Zone</h2>
                    </div>

                    <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-red-100 dark:bg-red-900/30 border border-red-500 dark:border-red-700 flex items-center justify-center">
                                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <p className="font-bold text-red-600 dark:text-red-400">Delete Account</p>
                                <p className="text-sm text-red-500/70 dark:text-red-400/70">Permanently delete your account and all data</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setShowDeleteModal(true)}
                            className="px-4 py-2 bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors"
                        >
                            Delete Account
                        </button>
                    </div>
                </div>

                {/* Info */}
                <div className="border border-black dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">App Version</p>
                    <p className="font-mono">Daticket v1.0.0</p>
                    <p className="text-xs text-neutral-400 mt-2">Swiss International Edition</p>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowDeleteModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-neutral-900 border border-black dark:border-neutral-700 p-6 max-w-md w-full"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-12 w-12 bg-red-100 dark:bg-red-900/30 border border-red-500 flex items-center justify-center">
                                    <AlertCircle className="h-6 w-6 text-red-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Delete Account</h3>
                                    <p className="text-sm text-neutral-500">This action cannot be undone</p>
                                </div>
                            </div>

                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 mb-4">
                                <p className="text-sm text-red-700 dark:text-red-300">
                                    <strong>Warning:</strong> This will permanently delete:
                                </p>
                                <ul className="text-sm text-red-600 dark:text-red-400 mt-2 space-y-1 list-disc list-inside">
                                    <li>All your receipts and images</li>
                                    <li>All your categories</li>
                                    <li>All your preferences and settings</li>
                                    <li>Your account and login credentials</li>
                                </ul>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">
                                    Type <span className="font-mono font-bold">DELETE</span> to confirm:
                                </label>
                                <input
                                    type="text"
                                    value={deleteConfirmation}
                                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                                    placeholder="DELETE"
                                    className="w-full px-4 py-2 border border-black dark:border-neutral-700 bg-white dark:bg-neutral-800 font-mono"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowDeleteModal(false)
                                        setDeleteConfirmation('')
                                        setDeleteStatus('idle')
                                    }}
                                    className="flex-1 px-4 py-2 border border-black dark:border-neutral-700 font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteAccount}
                                    disabled={deleteConfirmation !== 'DELETE' || deleteStatus === 'deleting'}
                                    className={cn(
                                        "flex-1 px-4 py-2 font-bold text-white transition-colors",
                                        deleteConfirmation === 'DELETE' 
                                            ? "bg-red-600 hover:bg-red-700" 
                                            : "bg-neutral-300 dark:bg-neutral-700 cursor-not-allowed",
                                        deleteStatus === 'deleting' && "cursor-wait"
                                    )}
                                >
                                    {deleteStatus === 'idle' && 'Delete Forever'}
                                    {deleteStatus === 'deleting' && 'Deleting...'}
                                    {deleteStatus === 'error' && 'Error - Try Again'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </DashboardShell>
    )
}
