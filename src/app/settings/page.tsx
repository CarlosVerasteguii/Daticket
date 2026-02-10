'use client'

import { useEffect, useState, useRef } from 'react'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import DashboardShell from '@/components/layout/DashboardShell'
import { Settings as SettingsIcon, Bell, Moon, Sun, Monitor, Globe, Database, ChevronRight, Check, DollarSign, Mail, TrendingUp, Calendar, AlertTriangle, Download, Upload, Trash2, AlertCircle, Lock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import SessionsList from '@/components/settings/SessionsList'
import PasswordChange from '@/components/settings/PasswordChange'
import AuditLog from '@/components/settings/AuditLog'
import { useTheme } from '@/lib/theme'
import { useCurrency, CURRENCIES } from '@/lib/currency'
import { useNotifications, NotificationPreferences } from '@/lib/notifications'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

function extractReceiptsObjectPath(value: string): string | null {
    const trimmed = value.trim()
    if (!trimmed) return null

    // Already looks like a storage object path: "{userId}/..."
    if (!trimmed.startsWith('http')) return trimmed

    try {
        const url = new URL(trimmed)
        const parts = url.pathname.split('/').filter(Boolean)
        const bucketIndex = parts.findIndex((p) => p === 'receipts')
        if (bucketIndex === -1) return null
        const objectPath = parts.slice(bucketIndex + 1).join('/')
        return objectPath || null
    } catch {
        return null
    }
}

function isNonNull<T>(value: T | null | undefined): value is T {
    return value !== null && value !== undefined
}

export default function SettingsPage() {
    const router = useRouter()
    const supabase = createClient()
    const { theme, setTheme, resolvedTheme } = useTheme()
    const { currency, setCurrency } = useCurrency()
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

            const [receiptsRes, receiptFilesRes, receiptItemsRes, categoriesRes] = await Promise.all([
                supabase
                    .from('receipts')
                    .select('id, store_name, purchase_date, total_amount, notes, created_at, category_id, primary_file_id, thumbnail_file_id')
                    .eq('user_id', session.user.id)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('receipt_files')
                    .select('id, receipt_id, bucket_id, path, kind, mime_type, size_bytes, created_at, source_file_id')
                    .eq('user_id', session.user.id),
                supabase
                    .from('receipt_items')
                    .select('id, receipt_id, name, quantity, unit_price, total_price')
                    .eq('user_id', session.user.id),
                supabase
                    .from('categories')
                    .select('id, name, color, created_at')
                    .eq('user_id', session.user.id),
            ])

            const exportData = {
                version: '2.1.0',
                exportedAt: new Date().toISOString(),
                user: {
                    email: session.user.email,
                    id: session.user.id
                },
                receipts: receiptsRes.data || [],
                receipt_files: receiptFilesRes.data || [],
                receipt_items: receiptItemsRes.data || [],
                categories: categoriesRes.data || [],
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
            const data: unknown = JSON.parse(text)

            // Validate structure
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid backup file format')
            }

            const backup = data as Record<string, unknown>

            if (typeof backup.version !== 'string') {
                throw new Error('Invalid backup file format')
            }

            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            const version = backup.version

            const { data: existingReceipts } = await supabase
                .from('receipts')
                .select('id')
                .eq('user_id', session.user.id)

            const existingReceiptIds = new Set((existingReceipts ?? []).map((r) => r.id))

            // Import categories first (best-effort, preserves IDs when present)
            const rawCategories = Array.isArray(backup.categories) ? backup.categories : []
            const categoriesPayload = rawCategories
                .filter((c) => c && typeof c === 'object')
                .map((c) => {
                    const obj = c as Record<string, unknown>
                    const name = typeof obj.name === 'string' ? obj.name : null
                    if (!name) return null

                    return {
                        id: typeof obj.id === 'string' ? obj.id : undefined,
                        user_id: session.user.id,
                        name,
                        color: typeof obj.color === 'string' ? obj.color : null,
                    }
                })
                .filter(isNonNull)

            if (categoriesPayload.length > 0) {
                const { error } = await supabase.from('categories').upsert(categoriesPayload, { onConflict: 'id' })
                if (error) {
                    console.warn('Category import failed:', error)
                }
            }

            if (version.startsWith('2')) {
                const rawReceipts = Array.isArray(backup.receipts) ? backup.receipts : []
                const receiptsToInsert = rawReceipts
                    .filter((r) => r && typeof r === 'object')
                    .map((r) => {
                        const obj = r as Record<string, unknown>
                        const id = typeof obj.id === 'string' ? obj.id : null
                        if (!id || existingReceiptIds.has(id)) return null

                        return {
                            id,
                            user_id: session.user.id,
                            store_name: typeof obj.store_name === 'string' ? obj.store_name : null,
                            purchase_date: typeof obj.purchase_date === 'string' ? obj.purchase_date : null,
                            total_amount: typeof obj.total_amount === 'number' ? obj.total_amount : null,
                            notes: typeof obj.notes === 'string' ? obj.notes : null,
                            category_id: typeof obj.category_id === 'string' ? obj.category_id : null,
                            primary_file_id: null,
                            thumbnail_file_id: null,
                        }
                    })
                    .filter(isNonNull)

                const receiptIdsToInsert = receiptsToInsert.map((r) => r.id)

                if (receiptsToInsert.length > 0) {
                    const { error } = await supabase.from('receipts').insert(receiptsToInsert)
                    if (error) throw error
                }

                // Import receipt files (metadata only). Only import paths that belong to the current user folder.
                const rawFiles = Array.isArray(backup.receipt_files) ? backup.receipt_files : []
                const filesToInsert = rawFiles
                    .filter((f) => f && typeof f === 'object')
                    .map((f) => {
                        const obj = f as Record<string, unknown>
                        const receiptId = typeof obj.receipt_id === 'string' ? obj.receipt_id : null
                        if (!receiptId || !receiptIdsToInsert.includes(receiptId)) return null

                        const bucketId = typeof obj.bucket_id === 'string' ? obj.bucket_id : 'receipts'
                        const path = typeof obj.path === 'string' ? obj.path : null
                        if (bucketId !== 'receipts' || !path || !path.startsWith(`${session.user.id}/`)) return null

                        const kind = typeof obj.kind === 'string' ? obj.kind : 'original'
                        const sourceFileId = typeof obj.source_file_id === 'string' ? obj.source_file_id : null
                        if (kind === 'thumbnail' && !sourceFileId) return null

                        return {
                            id: typeof obj.id === 'string' ? obj.id : undefined,
                            receipt_id: receiptId,
                            user_id: session.user.id,
                            bucket_id: 'receipts',
                            path,
                            kind,
                            mime_type: typeof obj.mime_type === 'string' ? obj.mime_type : null,
                            size_bytes: typeof obj.size_bytes === 'number' ? obj.size_bytes : null,
                            source_file_id: sourceFileId,
                        }
                    })
                    .filter(isNonNull)

                if (filesToInsert.length > 0) {
                    const originals = filesToInsert.filter((f) => f.kind === 'original')
                    const derived = filesToInsert.filter((f) => f.kind !== 'original')

                    if (originals.length > 0) {
                        const { error } = await supabase.from('receipt_files').insert(originals)
                        if (error) throw error
                    }

                    if (derived.length > 0) {
                        const { error } = await supabase.from('receipt_files').insert(derived)
                        if (error) throw error
                    }
                }

                // Link primary files after file import
                for (const r of rawReceipts) {
                    if (!r || typeof r !== 'object') continue
                    const obj = r as Record<string, unknown>
                    const receiptId = typeof obj.id === 'string' ? obj.id : null
                    const primaryFileId = typeof obj.primary_file_id === 'string' ? obj.primary_file_id : null
                    if (!receiptId || !primaryFileId || !receiptIdsToInsert.includes(receiptId)) continue

                    // Only link if this file was imported (belongs to this user folder)
                    const filePath = filesToInsert.find((f) => f.id === primaryFileId && f.receipt_id === receiptId)?.path
                    if (!filePath) continue

                    const { error } = await supabase
                        .from('receipts')
                        .update({ primary_file_id: primaryFileId })
                        .eq('id', receiptId)

                    if (error) {
                        console.warn('Failed to link primary_file_id for receipt:', receiptId, error)
                    }
                }

                // Link thumbnail files after file import
                for (const r of rawReceipts) {
                    if (!r || typeof r !== 'object') continue
                    const obj = r as Record<string, unknown>
                    const receiptId = typeof obj.id === 'string' ? obj.id : null
                    const thumbnailFileId = typeof obj.thumbnail_file_id === 'string' ? obj.thumbnail_file_id : null
                    if (!receiptId || !thumbnailFileId || !receiptIdsToInsert.includes(receiptId)) continue

                    const filePath = filesToInsert.find((f) => f.id === thumbnailFileId && f.receipt_id === receiptId)?.path
                    if (!filePath) continue

                    const { error } = await supabase
                        .from('receipts')
                        .update({ thumbnail_file_id: thumbnailFileId })
                        .eq('id', receiptId)

                    if (error) {
                        console.warn('Failed to link thumbnail_file_id for receipt:', receiptId, error)
                    }
                }

                // Import receipt items (only for newly inserted receipts)
                const rawItems = Array.isArray(backup.receipt_items) ? backup.receipt_items : []
                const itemsToInsert = rawItems
                    .filter((it) => it && typeof it === 'object')
                    .map((it) => {
                        const obj = it as Record<string, unknown>
                        const receiptId = typeof obj.receipt_id === 'string' ? obj.receipt_id : null
                        if (!receiptId || !receiptIdsToInsert.includes(receiptId)) return null

                        return {
                            receipt_id: receiptId,
                            user_id: session.user.id,
                            name: typeof obj.name === 'string' ? obj.name : '',
                            quantity: typeof obj.quantity === 'number' ? obj.quantity : 1,
                            unit_price: typeof obj.unit_price === 'number' ? obj.unit_price : 0,
                            total_price: typeof obj.total_price === 'number' ? obj.total_price : 0,
                        }
                    })
                    .filter(isNonNull)

                if (itemsToInsert.length > 0) {
                    const { error } = await supabase.from('receipt_items').insert(itemsToInsert)
                    if (error) throw error
                }
            } else {
                // Legacy backup (v1): map old column names and convert `image_url` (if present) into `receipt_files` metadata.
                const rawReceipts = Array.isArray(backup.receipts) ? backup.receipts : []

                for (const receipt of rawReceipts) {
                    if (!receipt || typeof receipt !== 'object') continue
                    const obj = receipt as Record<string, unknown>

                    const id = typeof obj.id === 'string' ? obj.id : crypto.randomUUID()
                    if (existingReceiptIds.has(id)) continue

                    const totalAmount = typeof obj.total_amount === 'number'
                        ? obj.total_amount
                        : typeof obj.amount === 'number'
                            ? obj.amount
                            : null

                    const purchaseDate = typeof obj.purchase_date === 'string'
                        ? obj.purchase_date
                        : typeof obj.receipt_date === 'string'
                            ? obj.receipt_date
                            : null

                    const { error: insertError } = await supabase.from('receipts').insert({
                        id,
                        user_id: session.user.id,
                        store_name: typeof obj.store_name === 'string' ? obj.store_name : null,
                        purchase_date: purchaseDate,
                        total_amount: totalAmount,
                        notes: typeof obj.notes === 'string' ? obj.notes : null,
                        category_id: null,
                    })

                    if (insertError) {
                        console.warn('Failed to import legacy receipt:', insertError)
                        continue
                    }

                    existingReceiptIds.add(id)

                    const legacyImageUrl = typeof obj.image_url === 'string' ? obj.image_url : null
                    const objectPath = legacyImageUrl ? extractReceiptsObjectPath(legacyImageUrl) : null

                    if (objectPath && objectPath.startsWith(`${session.user.id}/`)) {
                        const { data: fileRow, error: fileError } = await supabase
                            .from('receipt_files')
                            .insert({
                                receipt_id: id,
                                user_id: session.user.id,
                                bucket_id: 'receipts',
                                path: objectPath,
                                kind: 'original',
                                mime_type: null,
                                size_bytes: null,
                            })
                            .select('id')
                            .single()

                        if (!fileError && fileRow?.id) {
                            await supabase.from('receipts').update({ primary_file_id: fileRow.id }).eq('id', id)
                        }
                    }
                }
            }

            // Import preferences
            const rawPreferences = backup.preferences && typeof backup.preferences === 'object'
                ? (backup.preferences as Record<string, unknown>)
                : null

            if (rawPreferences) {
                if (rawPreferences.theme === 'light' || rawPreferences.theme === 'dark' || rawPreferences.theme === 'system') {
                    setTheme(rawPreferences.theme)
                }
                if (typeof rawPreferences.currency === 'string') setCurrency(rawPreferences.currency)

                const rawNotifications = rawPreferences.notifications && typeof rawPreferences.notifications === 'object'
                    ? (rawPreferences.notifications as Record<string, unknown>)
                    : null

                if (rawNotifications) {
                    Object.entries(rawNotifications).forEach(([key, value]) => {
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
        { value: 'light' as const, label: 'Claro', icon: Sun },
        { value: 'dark' as const, label: 'Oscuro', icon: Moon },
        { value: 'system' as const, label: 'Sistema', icon: Monitor },
    ]

    const notificationOptions: { key: keyof NotificationPreferences; label: string; description: string; icon: LucideIcon }[] = [
        { key: 'emailDigest', label: 'Resumen por correo', description: 'Resumen diario de recibos', icon: Mail },
        { key: 'spendingAlerts', label: 'Alertas de gasto', description: 'Cuando los gastos superan el umbral', icon: TrendingUp },
        { key: 'weeklyReports', label: 'Reportes semanales', description: 'Resumen semanal (domingo)', icon: Calendar },
        { key: 'budgetWarnings', label: 'Avisos de presupuesto', description: 'Alerta al acercarte al límite', icon: AlertTriangle },
    ]

    const enabledCount = Object.values(preferences).filter(Boolean).length

    type SettingRowProps = {
        icon: LucideIcon
        title: string
        description: string
        action?: ReactNode
        onClick?: () => void
    }

    const SettingRow = ({ icon: Icon, title, description, action, onClick }: SettingRowProps) => (
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
                <h1 className="text-3xl font-bold tracking-tighter">Ajustes</h1>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Configura tus preferencias</p>
            </div>

            {/* Main Content */}
            <div className="p-8 max-w-3xl space-y-6">
                {/* Preferences Section */}
                <div className="border border-black dark:border-neutral-700 bg-white dark:bg-neutral-900">
                    <div className="p-4 border-b border-black dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 flex items-center gap-3">
                        <SettingsIcon className="h-5 w-5" />
                        <h2 className="font-bold uppercase text-sm tracking-wider">Preferencias</h2>
                    </div>

                    {/* Notifications Toggle */}
                    <div className="relative">
                        <SettingRow
                            icon={Bell}
                            title="Notificaciones"
                            description="Alertas por correo y notificaciones de gasto"
                            action={
                                <span className="text-sm font-mono text-neutral-500 dark:text-neutral-400">
                                    {enabledCount}/{notificationOptions.length} activadas
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
                            title="Apariencia"
                            description="Tema y ajustes de pantalla"
                            action={
                                <span className="text-sm font-mono text-neutral-500 dark:text-neutral-400 capitalize">
                                    {themeOptions.find((option) => option.value === theme)?.label ?? theme}
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
                            title="Moneda"
                            description="Formato para mostrar importes"
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
                        title="Idioma"
                        description="Idioma de la interfaz"
                        action={<span className="text-sm font-mono text-neutral-500 dark:text-neutral-400">Español</span>}
                    />
                </div>

                {/* Security Section */}
                <div className="border border-black dark:border-neutral-700 bg-white dark:bg-neutral-900">
                    <div className="p-4 border-b border-black dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 flex items-center gap-3">
                        <Lock className="h-5 w-5" />
                        <h2 className="font-bold uppercase text-sm tracking-wider">Seguridad</h2>
                    </div>

                    <div className="p-4">
                        <div className="mb-4">
                            <h3 className="font-bold text-sm mb-1">Sesiones activas</h3>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                Ve y administra los dispositivos donde tienes una sesión iniciada
                            </p>
                        </div>
                        <SessionsList />
                        
                        <PasswordChange />

                        <AuditLog />
                    </div>
                </div>

                {/* Data Section */}
                <div className="border border-black dark:border-neutral-700 bg-white dark:bg-neutral-900">
                    <div className="p-4 border-b border-black dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 flex items-center gap-3">
                        <Database className="h-5 w-5" />
                        <h2 className="font-bold uppercase text-sm tracking-wider">Datos y almacenamiento</h2>
                    </div>

                    <div className="flex items-center justify-between p-4 border-b border-black dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-neutral-100 dark:bg-neutral-800 border border-black dark:border-neutral-700 flex items-center justify-center">
                                <Download className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-bold">Exportar datos</p>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">Descarga todos tus recibos en un respaldo JSON</p>
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
                            {exportStatus === 'idle' && 'Exportar JSON'}
                            {exportStatus === 'exporting' && 'Exportando...'}
                            {exportStatus === 'done' && '✓ Descargado'}
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-4 border-b border-black dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-neutral-100 dark:bg-neutral-800 border border-black dark:border-neutral-700 flex items-center justify-center">
                                <Upload className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-bold">Importar datos</p>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">Restaura desde un archivo de respaldo JSON</p>
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
                                {importStatus === 'idle' && 'Importar JSON'}
                                {importStatus === 'importing' && 'Importando...'}
                                {importStatus === 'done' && '✓ Importado'}
                                {importStatus === 'error' && '✗ Falló'}
                            </label>
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="border border-red-500 dark:border-red-700 bg-white dark:bg-neutral-900">
                    <div className="p-4 border-b border-red-500 dark:border-red-700 bg-red-50 dark:bg-red-900/20 flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        <h2 className="font-bold uppercase text-sm tracking-wider text-red-600 dark:text-red-400">Zona de peligro</h2>
                    </div>

                    <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-red-100 dark:bg-red-900/30 border border-red-500 dark:border-red-700 flex items-center justify-center">
                                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <p className="font-bold text-red-600 dark:text-red-400">Eliminar cuenta</p>
                                <p className="text-sm text-red-500/70 dark:text-red-400/70">Elimina tu cuenta y todos tus datos permanentemente</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setShowDeleteModal(true)}
                            className="px-4 py-2 bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors"
                        >
                            Eliminar cuenta
                        </button>
                    </div>
                </div>

                {/* Info */}
                <div className="border border-black dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">Versión de la app</p>
                    <p className="font-mono">Daticket v1.0.0</p>
                    <p className="text-xs text-neutral-400 mt-2">Edición Internacional Suiza</p>
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
                                    <h3 className="font-bold text-lg">Eliminar cuenta</h3>
                                    <p className="text-sm text-neutral-500">Esta acción no se puede deshacer</p>
                                </div>
                            </div>

                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 mb-4">
                                <p className="text-sm text-red-700 dark:text-red-300">
                                    <strong>Advertencia:</strong> Esto eliminará permanentemente:
                                </p>
                                <ul className="text-sm text-red-600 dark:text-red-400 mt-2 space-y-1 list-disc list-inside">
                                    <li>Todos tus recibos e imágenes</li>
                                    <li>Todas tus categorías</li>
                                    <li>Todas tus preferencias y ajustes</li>
                                    <li>Tu cuenta y credenciales de acceso</li>
                                </ul>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">
                                    Escribe <span className="font-mono font-bold">ELIMINAR</span> para confirmar:
                                </label>
                                <input
                                    type="text"
                                    value={deleteConfirmation}
                                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                                    placeholder="ELIMINAR"
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
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleDeleteAccount}
                                    disabled={deleteConfirmation !== 'ELIMINAR' || deleteStatus === 'deleting'}
                                    className={cn(
                                        "flex-1 px-4 py-2 font-bold text-white transition-colors",
                                        deleteConfirmation === 'ELIMINAR' 
                                            ? "bg-red-600 hover:bg-red-700" 
                                            : "bg-neutral-300 dark:bg-neutral-700 cursor-not-allowed",
                                        deleteStatus === 'deleting' && "cursor-wait"
                                    )}
                                >
                                    {deleteStatus === 'idle' && 'Eliminar definitivamente'}
                                    {deleteStatus === 'deleting' && 'Eliminando...'}
                                    {deleteStatus === 'error' && 'Error - Intenta de nuevo'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </DashboardShell>
    )
}
