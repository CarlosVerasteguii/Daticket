'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DashboardShell from '@/components/layout/DashboardShell'
import { ReceiptsGridSkeleton } from '@/components/ui/Skeleton'
import type { SupabaseClient } from '@supabase/supabase-js'
import { 
  Plus, 
  X, 
  Image as ImageIcon, 
  Calendar, 
  DollarSign, 
  Tag, 
  Trash2,
  Filter,
  Receipt,
  Search,
  Save,
  Bookmark,
  Download,
  FileText,
  RefreshCw
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Receipt {
    id: string
    store_name: string | null
    purchase_date: string | null
    total_amount: number | null
    primary_file: ReceiptFile | null
    thumbnail_file: ReceiptFile | null
    notes: string | null
    created_at: string
    category_name: string | null
}

type ReceiptFile = {
    id: string
    bucket_id: string
    path: string
    mime_type: string | null
    size_bytes: number | null
}

type ReceiptQueryRow = Omit<Receipt, 'category_name' | 'primary_file' | 'thumbnail_file'> & {
    categories: { name: string } | { name: string }[] | null
    primary_file: ReceiptFile | ReceiptFile[] | null
    thumbnail_file: ReceiptFile | ReceiptFile[] | null
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const
    }
  }
}

type DateRange = {
    start: Date | null
    end: Date | null
    preset: string
}

type AmountRange = {
    min: number | null
    max: number | null
}

type SavedFilter = {
    id: string
    name: string
    searchQuery: string
    datePreset: string
    amountMin: number | null
    amountMax: number | null
    categories: string[]
}

const SAVED_FILTERS_KEY = 'daticket-saved-filters'

export default function ReceiptsPage() {
    const router = useRouter()
    const supabase = useMemo(() => createClient(), [])
    const [receipts, setReceipts] = useState<Receipt[]>([])
    const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)
    const [loading, setLoading] = useState(true)
    const [selectedCategories, setSelectedCategories] = useState<string[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null, preset: 'all' })
    const [showDatePicker, setShowDatePicker] = useState(false)
    const [amountRange, setAmountRange] = useState<AmountRange>({ min: null, max: null })
    const [showAmountPicker, setShowAmountPicker] = useState(false)
    const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() => {
        if (typeof window === 'undefined') return []
        const stored = window.localStorage.getItem(SAVED_FILTERS_KEY)
        if (!stored) return []
        try {
            const parsed: unknown = JSON.parse(stored)
            return Array.isArray(parsed) ? (parsed as SavedFilter[]) : []
        } catch {
            return []
        }
    })
    const [showSavedFilters, setShowSavedFilters] = useState(false)
    const [newFilterName, setNewFilterName] = useState('')
    const [showSaveDialog, setShowSaveDialog] = useState(false)
    
    // Pull-to-refresh state
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [pullDistance, setPullDistance] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)
    const touchStartY = useRef(0)
    const isPulling = useRef(false)
    const PULL_THRESHOLD = 80
    
    // Infinite scroll state
    const [visibleCount, setVisibleCount] = useState(12)
    const loadMoreRef = useRef<HTMLDivElement>(null)
    const ITEMS_PER_LOAD = 12

    const saveCurrentFilter = useCallback(() => {
        if (!newFilterName.trim()) return
        
        const newFilter: SavedFilter = {
            id: Date.now().toString(),
            name: newFilterName.trim(),
            searchQuery,
            datePreset: dateRange.preset,
            amountMin: amountRange.min,
            amountMax: amountRange.max,
            categories: selectedCategories,
        }
        
        const updated = [...savedFilters, newFilter]
        setSavedFilters(updated)
        localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updated))
        setNewFilterName('')
        setShowSaveDialog(false)
    }, [newFilterName, searchQuery, dateRange.preset, amountRange, selectedCategories, savedFilters])

    const applyFilter = useCallback((filter: SavedFilter) => {
        setSearchQuery(filter.searchQuery)
        // Apply date preset
        if (filter.datePreset !== 'all' && filter.datePreset !== 'custom') {
            // Trigger the preset logic
            const today = new Date()
            today.setHours(23, 59, 59, 999)
            let start: Date | null = null
            const end: Date | null = today
            
            switch (filter.datePreset) {
                case 'today':
                    start = new Date(today)
                    start.setHours(0, 0, 0, 0)
                    break
                case 'week':
                    start = new Date(today)
                    start.setDate(start.getDate() - 7)
                    start.setHours(0, 0, 0, 0)
                    break
                case 'month':
                    start = new Date(today)
                    start.setMonth(start.getMonth() - 1)
                    start.setHours(0, 0, 0, 0)
                    break
                case 'quarter':
                    start = new Date(today)
                    start.setMonth(start.getMonth() - 3)
                    start.setHours(0, 0, 0, 0)
                    break
                case 'year':
                    start = new Date(today)
                    start.setFullYear(start.getFullYear() - 1)
                    start.setHours(0, 0, 0, 0)
                    break
            }
            setDateRange({ start, end, preset: filter.datePreset })
        } else {
            setDateRange({ start: null, end: null, preset: 'all' })
        }
        setAmountRange({ min: filter.amountMin, max: filter.amountMax })
        setSelectedCategories(filter.categories)
        setShowSavedFilters(false)
    }, [])

    const deleteFilter = useCallback((id: string) => {
        const updated = savedFilters.filter(f => f.id !== id)
        setSavedFilters(updated)
        localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updated))
    }, [savedFilters])

    const exportToCSV = useCallback((receiptsToExport: Receipt[]) => {
        if (receiptsToExport.length === 0) return
        
        const headers = ['Store', 'Date', 'Amount', 'Category', 'Notes', 'Created At']
        const csvContent = [
            headers.join(','),
            ...receiptsToExport.map(r => [
                `"${(r.store_name || 'Unknown').replace(/"/g, '""')}"`,
                r.purchase_date || '',
                r.total_amount?.toFixed(2) || '0.00',
                `"${(r.category_name || 'Uncategorized').replace(/"/g, '""')}"`,
                `"${(r.notes || '').replace(/"/g, '""')}"`,
                r.created_at.split('T')[0]
            ].join(','))
        ].join('\n')
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        const dateStr = new Date().toISOString().split('T')[0]
        link.setAttribute('download', `receipts-export-${dateStr}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }, [])

    const fetchReceipts = useCallback(async (showLoadingState = true) => {
        if (showLoadingState) setLoading(true)
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            router.push('/login')
            return
        }

        const { data } = await supabase
            .from('receipts')
            .select(`
                id,
                store_name,
                purchase_date,
                total_amount,
                notes,
                created_at,
                categories(name),
                primary_file:receipt_files!receipts_primary_file_id_fkey(
                    id,
                    bucket_id,
                    path,
                    mime_type,
                    size_bytes
                ),
                thumbnail_file:receipt_files!receipts_thumbnail_file_id_fkey(
                    id,
                    bucket_id,
                    path,
                    mime_type,
                    size_bytes
                )
            `)
            .order('created_at', { ascending: false })

        const rows = (data ?? []) as ReceiptQueryRow[]
        const formattedData: Receipt[] = rows.map((r) => ({
            id: r.id,
            store_name: r.store_name,
            purchase_date: r.purchase_date,
            total_amount: r.total_amount,
            primary_file: Array.isArray(r.primary_file)
                ? r.primary_file[0] ?? null
                : r.primary_file ?? null,
            thumbnail_file: Array.isArray(r.thumbnail_file)
                ? r.thumbnail_file[0] ?? null
                : r.thumbnail_file ?? null,
            notes: r.notes,
            created_at: r.created_at,
            category_name: Array.isArray(r.categories)
                ? r.categories[0]?.name ?? null
                : r.categories?.name ?? null,
        }))
        setReceipts(formattedData)
        setLoading(false)
    }, [router, supabase])

    useEffect(() => {
        fetchReceipts(false)
    }, [fetchReceipts])

    // Pull-to-refresh handlers
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        const container = containerRef.current
        if (container && container.scrollTop === 0) {
            touchStartY.current = e.touches[0].clientY
            isPulling.current = true
        }
    }, [])

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isPulling.current || isRefreshing) return
        
        const currentY = e.touches[0].clientY
        const diff = currentY - touchStartY.current
        
        if (diff > 0) {
            const distance = Math.min(diff * 0.5, PULL_THRESHOLD * 1.5)
            setPullDistance(distance)
        }
    }, [isRefreshing])

    const handleTouchEnd = useCallback(async () => {
        if (!isPulling.current) return
        isPulling.current = false
        
        if (pullDistance >= PULL_THRESHOLD) {
            setIsRefreshing(true)
            await fetchReceipts(false)
            setIsRefreshing(false)
        }
        setPullDistance(0)
    }, [pullDistance, fetchReceipts])

    // Infinite scroll: load more when reaching bottom
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setVisibleCount(prev => prev + ITEMS_PER_LOAD)
                }
            },
            { threshold: 0.1 }
        )
        
        if (loadMoreRef.current) {
            observer.observe(loadMoreRef.current)
        }
        
        return () => observer.disconnect()
    }, [])

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'N/A'
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }

    const categories = [...new Set(receipts.map(r => r.category_name).filter(Boolean))]
    
    // Date range presets
    const applyDatePreset = (preset: string) => {
        const today = new Date()
        today.setHours(23, 59, 59, 999)
        let start: Date | null = null
        let end: Date | null = today
        
        switch (preset) {
            case 'today':
                start = new Date(today)
                start.setHours(0, 0, 0, 0)
                break
            case 'week':
                start = new Date(today)
                start.setDate(start.getDate() - 7)
                start.setHours(0, 0, 0, 0)
                break
            case 'month':
                start = new Date(today)
                start.setMonth(start.getMonth() - 1)
                start.setHours(0, 0, 0, 0)
                break
            case 'quarter':
                start = new Date(today)
                start.setMonth(start.getMonth() - 3)
                start.setHours(0, 0, 0, 0)
                break
            case 'year':
                start = new Date(today)
                start.setFullYear(start.getFullYear() - 1)
                start.setHours(0, 0, 0, 0)
                break
            case 'all':
            default:
                start = null
                end = null
                break
        }
        
        setDateRange({ start, end, preset })
        setShowDatePicker(false)
    }

    // Filter and search receipts
    let filteredReceipts = receipts
    
    // Date range filter
    if (dateRange.start || dateRange.end) {
        filteredReceipts = filteredReceipts.filter(r => {
            if (!r.purchase_date) return false
            const receiptDate = new Date(r.purchase_date)
            if (dateRange.start && receiptDate < dateRange.start) return false
            if (dateRange.end && receiptDate > dateRange.end) return false
            return true
        })
    }
    
    // Amount range filter
    if (amountRange.min !== null || amountRange.max !== null) {
        filteredReceipts = filteredReceipts.filter(r => {
            const amount = Number(r.total_amount) || 0
            if (amountRange.min !== null && amount < amountRange.min) return false
            if (amountRange.max !== null && amount > amountRange.max) return false
            return true
        })
    }
    
    // Multi-category filter
    if (selectedCategories.length > 0) {
        filteredReceipts = filteredReceipts.filter(r => 
            r.category_name && selectedCategories.includes(r.category_name)
        )
    }
    if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        filteredReceipts = filteredReceipts.filter(r => {
            // Search store name
            if (r.store_name?.toLowerCase().includes(query)) return true
            // Search category
            if (r.category_name?.toLowerCase().includes(query)) return true
            // Search notes
            if (r.notes?.toLowerCase().includes(query)) return true
            // Search amount (exact or partial match)
            const amount = r.total_amount?.toString() || ''
            if (amount.includes(query)) return true
            // Search formatted amount (e.g., "25.99")
            const formattedAmount = r.total_amount ? `$${Number(r.total_amount).toFixed(2)}` : ''
            if (formattedAmount.toLowerCase().includes(query)) return true
            // Search date
            if (r.purchase_date?.includes(query)) return true
            return false
        })
    }
    
    // Infinite scroll: only show visible portion
    const visibleReceipts = filteredReceipts.slice(0, visibleCount)
    const hasMore = filteredReceipts.length > visibleCount

    // Calculate stats
    const totalAmount = filteredReceipts.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0)

    return (
        <DashboardShell>
            <motion.div
                initial="hidden"
                animate="visible"
                variants={containerVariants}
            >
                {/* Header */}
                <motion.div 
                    className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 p-6 border-b border-foreground/20 bg-background"
                    variants={itemVariants}
                >
                    <div>
                        <h1 className="text-3xl font-bold tracking-tighter text-foreground">All Receipts</h1>
                        <p className="text-sm text-foreground/60 font-mono mt-1">
                            {filteredReceipts.length} of {receipts.length} records
                            {selectedCategories.length > 0 && ` in ${selectedCategories.join(', ')}`}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* PDF Report Button */}
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Link
                                href={`/receipts/report${dateRange.start ? `?start=${dateRange.start.toISOString().split('T')[0]}&end=${dateRange.end?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]}` : ''}`}
                                className={cn(
                                    "inline-flex items-center px-4 py-3 font-bold transition-all border-2 border-foreground shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.3)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[5px_5px_0px_0px_rgba(255,255,255,0.3)] hover:-translate-x-0.5 hover:-translate-y-0.5",
                                    "bg-background text-foreground hover:bg-foreground/10"
                                )}
                            >
                                <FileText className="w-5 h-5 mr-2" />
                                Report
                            </Link>
                        </motion.div>
                        {/* CSV Export Button */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => exportToCSV(filteredReceipts)}
                            disabled={filteredReceipts.length === 0}
                            className={cn(
                                "inline-flex items-center px-4 py-3 font-bold transition-all border-2 border-foreground shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.3)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[5px_5px_0px_0px_rgba(255,255,255,0.3)] hover:-translate-x-0.5 hover:-translate-y-0.5",
                                filteredReceipts.length > 0
                                    ? "bg-background text-foreground hover:bg-foreground/10"
                                    : "bg-foreground/10 text-foreground/40 cursor-not-allowed shadow-none"
                            )}
                        >
                            <Download className="w-5 h-5 mr-2" />
                            CSV
                        </motion.button>
                        {/* New Receipt Button */}
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Link
                                href="/upload"
                                className="inline-flex items-center px-6 py-3 bg-foreground text-background font-bold hover:bg-foreground/90 transition-all border-2 border-foreground shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.3)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[5px_5px_0px_0px_rgba(255,255,255,0.3)] hover:-translate-x-0.5 hover:-translate-y-0.5"
                            >
                                <Plus className="w-5 h-5 mr-2" />
                                New Receipt
                            </Link>
                        </motion.div>
                    </div>
                </motion.div>

                {/* Stats Bar */}
                <motion.div 
                    className="grid grid-cols-2 md:grid-cols-4 border-b border-foreground/20 bg-background"
                    variants={itemVariants}
                >
                    <div className="p-4 border-r border-foreground/10">
                        <p className="text-xs font-bold uppercase tracking-wider text-foreground/60">Total</p>
                        <p className="text-2xl font-bold tracking-tighter text-foreground">${totalAmount.toFixed(2)}</p>
                    </div>
                    <div className="p-4 border-r border-foreground/10">
                        <p className="text-xs font-bold uppercase tracking-wider text-foreground/60">Receipts</p>
                        <p className="text-2xl font-bold tracking-tighter text-foreground">{filteredReceipts.length}</p>
                    </div>
                    <div className="p-4 border-r border-foreground/10 hidden md:block">
                        <p className="text-xs font-bold uppercase tracking-wider text-foreground/60">Categories</p>
                        <p className="text-2xl font-bold tracking-tighter text-foreground">{categories.length}</p>
                    </div>
                    <div className="p-4 hidden md:block">
                        <p className="text-xs font-bold uppercase tracking-wider text-foreground/60">Avg</p>
                        <p className="text-2xl font-bold tracking-tighter text-foreground">
                            ${filteredReceipts.length > 0 ? (totalAmount / filteredReceipts.length).toFixed(2) : '0.00'}
                        </p>
                    </div>
                </motion.div>

                {/* Filters & Search */}
                <motion.div 
                    className="flex flex-col md:flex-row gap-4 p-4 border-b border-foreground/20 bg-background"
                    variants={itemVariants}
                >
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                        <input
                            type="text"
                            placeholder="Search stores, categories, notes, amounts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-foreground bg-background text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-swiss-blue text-sm"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40 hover:text-foreground/60"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Date Range Picker */}
                    <div className="relative">
                        <motion.button
                            onClick={() => setShowDatePicker(!showDatePicker)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 text-sm font-bold border border-foreground transition-all",
                                dateRange.preset !== 'all' 
                                    ? 'bg-swiss-blue text-white border-swiss-blue' 
                                    : 'bg-background text-foreground hover:bg-foreground/10'
                            )}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Calendar className="h-4 w-4" />
                            {dateRange.preset === 'all' && 'All Time'}
                            {dateRange.preset === 'today' && 'Today'}
                            {dateRange.preset === 'week' && 'Last 7 Days'}
                            {dateRange.preset === 'month' && 'Last 30 Days'}
                            {dateRange.preset === 'quarter' && 'Last 3 Months'}
                            {dateRange.preset === 'year' && 'Last Year'}
                            {dateRange.preset === 'custom' && 'Custom Range'}
                        </motion.button>
                        
                        <AnimatePresence>
                            {showDatePicker && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute top-full left-0 mt-2 z-50 bg-background border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)] p-4 min-w-[280px]"
                                >
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold uppercase tracking-wider text-foreground/60 mb-3">Date Presets</p>
                                        {[
                                            { key: 'all', label: 'All Time' },
                                            { key: 'today', label: 'Today' },
                                            { key: 'week', label: 'Last 7 Days' },
                                            { key: 'month', label: 'Last 30 Days' },
                                            { key: 'quarter', label: 'Last 3 Months' },
                                            { key: 'year', label: 'Last Year' },
                                        ].map(({ key, label }) => (
                                            <button
                                                key={key}
                                                onClick={() => applyDatePreset(key)}
                                                className={cn(
                                                    "block w-full text-left px-3 py-2 text-sm font-medium transition-colors",
                                                    dateRange.preset === key 
                                                        ? 'bg-foreground text-background' 
                                                        : 'text-foreground hover:bg-foreground/10'
                                                )}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                        
                                        <div className="border-t border-foreground/20 pt-3 mt-3">
                                            <p className="text-xs font-bold uppercase tracking-wider text-foreground/60 mb-2">Custom Range</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-xs text-foreground/60">From</label>
                                                    <input
                                                        type="date"
                                                        value={dateRange.start ? dateRange.start.toISOString().split('T')[0] : ''}
                                                        onChange={(e) => {
                                                            const start = e.target.value ? new Date(e.target.value) : null
                                                            setDateRange(prev => ({ ...prev, start, preset: 'custom' }))
                                                        }}
                                                        className="w-full px-2 py-1 text-sm border border-foreground bg-background text-foreground"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-foreground/60">To</label>
                                                    <input
                                                        type="date"
                                                        value={dateRange.end ? dateRange.end.toISOString().split('T')[0] : ''}
                                                        onChange={(e) => {
                                                            const end = e.target.value ? new Date(e.target.value) : null
                                                            if (end) end.setHours(23, 59, 59, 999)
                                                            setDateRange(prev => ({ ...prev, end, preset: 'custom' }))
                                                        }}
                                                        className="w-full px-2 py-1 text-sm border border-foreground bg-background text-foreground"
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setShowDatePicker(false)}
                                                className="w-full mt-2 px-3 py-2 bg-foreground text-background text-sm font-bold"
                                            >
                                                Apply
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Amount Range Picker */}
                    <div className="relative">
                        <motion.button
                            onClick={() => setShowAmountPicker(!showAmountPicker)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 text-sm font-bold border border-foreground transition-all",
                                (amountRange.min !== null || amountRange.max !== null)
                                    ? 'bg-swiss-blue text-white border-swiss-blue' 
                                    : 'bg-background text-foreground hover:bg-foreground/10'
                            )}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <DollarSign className="h-4 w-4" />
                            {amountRange.min === null && amountRange.max === null && 'Any Amount'}
                            {amountRange.min !== null && amountRange.max === null && `$${amountRange.min}+`}
                            {amountRange.min === null && amountRange.max !== null && `Up to $${amountRange.max}`}
                            {amountRange.min !== null && amountRange.max !== null && `$${amountRange.min} - $${amountRange.max}`}
                        </motion.button>
                        
                        <AnimatePresence>
                            {showAmountPicker && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute top-full left-0 mt-2 z-50 bg-background border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)] p-4 min-w-[240px]"
                                >
                                    <p className="text-xs font-bold uppercase tracking-wider text-foreground/60 mb-3">Amount Range</p>
                                    
                                    {/* Quick Presets */}
                                    <div className="space-y-1 mb-4">
                                        {[
                                            { min: null, max: null, label: 'Any Amount' },
                                            { min: null, max: 25, label: 'Under $25' },
                                            { min: 25, max: 50, label: '$25 - $50' },
                                            { min: 50, max: 100, label: '$50 - $100' },
                                            { min: 100, max: null, label: '$100+' },
                                        ].map(({ min, max, label }) => (
                                            <button
                                                key={label}
                                                onClick={() => {
                                                    setAmountRange({ min, max })
                                                    setShowAmountPicker(false)
                                                }}
                                                className={cn(
                                                    "block w-full text-left px-3 py-2 text-sm font-medium transition-colors",
                                                    amountRange.min === min && amountRange.max === max
                                                        ? 'bg-foreground text-background' 
                                                        : 'text-foreground hover:bg-foreground/10'
                                                )}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                    
                                    <div className="border-t border-foreground/20 pt-3">
                                        <p className="text-xs font-bold uppercase tracking-wider text-foreground/60 mb-2">Custom Range</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-xs text-foreground/60">Min ($)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    placeholder="0"
                                                    value={amountRange.min ?? ''}
                                                    onChange={(e) => setAmountRange(prev => ({ 
                                                        ...prev, 
                                                        min: e.target.value ? parseFloat(e.target.value) : null 
                                                    }))}
                                                    className="w-full px-2 py-1 text-sm border border-foreground bg-background text-foreground"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-foreground/60">Max ($)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    placeholder="∞"
                                                    value={amountRange.max ?? ''}
                                                    onChange={(e) => setAmountRange(prev => ({ 
                                                        ...prev, 
                                                        max: e.target.value ? parseFloat(e.target.value) : null 
                                                    }))}
                                                    className="w-full px-2 py-1 text-sm border border-foreground bg-background text-foreground"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setShowAmountPicker(false)}
                                            className="w-full mt-2 px-3 py-2 bg-foreground text-background text-sm font-bold"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Saved Filters */}
                    <div className="relative flex items-center gap-2">
                        <motion.button
                            onClick={() => setShowSavedFilters(!showSavedFilters)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 text-sm font-bold border border-foreground transition-all",
                                savedFilters.length > 0 
                                    ? 'bg-background text-foreground hover:bg-foreground/10' 
                                    : 'bg-foreground/5 text-foreground/40'
                            )}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Bookmark className="h-4 w-4" />
                            Saved ({savedFilters.length})
                        </motion.button>

                        <motion.button
                            onClick={() => setShowSaveDialog(true)}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-bold border border-foreground bg-background text-foreground hover:bg-foreground/10 transition-all"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            title="Save current filter"
                        >
                            <Save className="h-4 w-4" />
                        </motion.button>
                        
                        <AnimatePresence>
                            {showSavedFilters && savedFilters.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute top-full left-0 mt-2 z-50 bg-background border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)] p-3 min-w-[200px]"
                                >
                                    <p className="text-xs font-bold uppercase tracking-wider text-foreground/60 mb-2">Saved Filters</p>
                                    <div className="space-y-1">
                                        {savedFilters.map((f) => (
                                            <div key={f.id} className="flex items-center justify-between gap-2">
                                                <button
                                                    onClick={() => applyFilter(f)}
                                                    className="flex-1 text-left px-3 py-2 text-sm font-medium text-foreground hover:bg-foreground/10 transition-colors"
                                                >
                                                    {f.name}
                                                </button>
                                                <button
                                                    onClick={() => deleteFilter(f.id)}
                                                    className="p-1 text-foreground/40 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <AnimatePresence>
                            {showSaveDialog && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute top-full right-0 mt-2 z-50 bg-background border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)] p-4 min-w-[250px]"
                                >
                                    <p className="text-xs font-bold uppercase tracking-wider text-foreground/60 mb-2">Save Current Filter</p>
                                    <input
                                        type="text"
                                        placeholder="Filter name..."
                                        value={newFilterName}
                                        onChange={(e) => setNewFilterName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && saveCurrentFilter()}
                                        className="w-full px-3 py-2 text-sm border border-foreground bg-background text-foreground mb-2"
                                        autoFocus
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowSaveDialog(false)}
                                            className="flex-1 px-3 py-2 text-sm font-bold border border-foreground text-foreground hover:bg-foreground/10"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={saveCurrentFilter}
                                            disabled={!newFilterName.trim()}
                                            className="flex-1 px-3 py-2 text-sm font-bold bg-foreground text-background disabled:bg-foreground/30 disabled:text-foreground/50"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Multi-Category Filters */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                        <Filter className="h-4 w-4 text-foreground/40 flex-shrink-0" />
                        <motion.button
                            onClick={() => setSelectedCategories([])}
                            className={cn(
                                "px-4 py-2 text-sm font-bold border transition-all whitespace-nowrap",
                                selectedCategories.length === 0 
                                    ? 'bg-swiss-blue text-white border-swiss-blue' 
                                    : 'bg-background text-foreground border-foreground hover:bg-foreground/10'
                            )}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            All
                        </motion.button>
                        {categories.map((cat) => {
                            const isSelected = selectedCategories.includes(cat!)
                            return (
                                <motion.button
                                    key={cat}
                                    onClick={() => {
                                        if (isSelected) {
                                            setSelectedCategories(prev => prev.filter(c => c !== cat))
                                        } else {
                                            setSelectedCategories(prev => [...prev, cat!])
                                        }
                                    }}
                                    className={cn(
                                        "px-4 py-2 text-sm font-bold border transition-all whitespace-nowrap flex items-center gap-2",
                                        isSelected 
                                            ? 'bg-swiss-blue text-white border-swiss-blue' 
                                            : 'bg-background text-foreground border-foreground hover:bg-foreground/10'
                                    )}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {cat}
                                    {isSelected && <X className="h-3 w-3" />}
                                </motion.button>
                            )
                        })}
                    </div>
                </motion.div>

                {/* Main Content - Split View */}
                <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[calc(100vh-300px)]">
                    {/* Left: Receipt Grid */}
                    <div 
                        ref={containerRef}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        className="lg:col-span-2 bg-background p-6 overflow-y-auto relative"
                        style={{ touchAction: 'pan-y' }}
                    >
                        {/* Pull to Refresh Indicator */}
                        <AnimatePresence>
                            {(pullDistance > 0 || isRefreshing) && (
                                <motion.div
                                    initial={{ opacity: 0, y: -40 }}
                                    animate={{ 
                                        opacity: pullDistance >= PULL_THRESHOLD || isRefreshing ? 1 : pullDistance / PULL_THRESHOLD,
                                        y: isRefreshing ? 0 : Math.min(pullDistance, PULL_THRESHOLD) - 40
                                    }}
                                    exit={{ opacity: 0, y: -40 }}
                                    className="absolute top-0 left-0 right-0 flex justify-center z-10"
                                >
                                    <div className={cn(
                                        "flex items-center gap-2 px-4 py-2 bg-background text-foreground border-2 border-foreground shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.3)]",
                                        isRefreshing && "animate-pulse"
                                    )}>
                                        <RefreshCw className={cn(
                                            "w-4 h-4",
                                            isRefreshing && "animate-spin"
                                        )} />
                                        <span className="text-sm font-bold">
                                            {isRefreshing ? 'Refreshing...' : pullDistance >= PULL_THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}
                                        </span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        
                        {loading ? (
                            <ReceiptsGridSkeleton count={6} />
                        ) : filteredReceipts.length === 0 ? (
                            <motion.div 
                                className="flex flex-col items-center justify-center h-64 text-center"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                            >
                                <div className="h-16 w-16 bg-foreground/10 border border-foreground flex items-center justify-center mb-4">
                                    <Receipt className="h-8 w-8 text-foreground/40" />
                                </div>
                                <p className="text-lg font-medium text-foreground/70 mb-2">
                                    {searchQuery ? "No receipts match your search" : "No receipts found"}
                                </p>
                                <p className="text-sm text-foreground/40 mb-4">
                                    {searchQuery ? "Try a different search term" : "Upload your first receipt to get started"}
                                </p>
                                {!searchQuery && (
                                    <Link 
                                        href="/upload" 
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-bold hover:bg-foreground/90 transition-colors"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Upload Receipt
                                    </Link>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div 
                                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                            >
                                <AnimatePresence>
                                    {visibleReceipts.map((receipt, index) => (
                                        <motion.div
                                            key={receipt.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            transition={{ delay: Math.min(index * 0.05, 0.5) }}
                                            onClick={() => setSelectedReceipt(receipt)}
                                            className={cn(
                                                "group border border-foreground bg-background cursor-pointer transition-all duration-300",
                                                selectedReceipt?.id === receipt.id 
                                                    ? 'shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.3)] ring-2 ring-swiss-blue ring-offset-2 ring-offset-background' 
                                                    : 'hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.3)] hover:-translate-x-[3px] hover:-translate-y-[3px]'
                                            )}
                                        >
                                            {/* Thumbnail with Lazy Loading */}
                                            <div className="h-32 bg-foreground/10 overflow-hidden relative">
                                                <SignedReceiptImage
                                                    supabase={supabase}
                                                    path={receipt.thumbnail_file?.path ?? receipt.primary_file?.path ?? null}
                                                    className="w-full h-full object-cover transition-all duration-500"
                                                    hover
                                                />
                                                {/* Blur placeholder */}
                                                <div className="absolute inset-0 bg-gradient-to-br from-foreground/20 to-foreground/10 -z-10" />
                                                {receipt.category_name && (
                                                    <div className="absolute top-2 left-2 px-2 py-1 bg-background/90 border border-foreground text-xs font-bold uppercase text-foreground">
                                                        {receipt.category_name}
                                                    </div>
                                                )}
                                            </div>
                                            {/* Info */}
                                            <div className="p-4 border-t border-foreground">
                                                <p className="font-bold text-sm truncate text-foreground group-hover:text-swiss-blue transition-colors">
                                                    {receipt.store_name || 'Unknown Store'}
                                                </p>
                                                <div className="flex justify-between items-center mt-2 text-xs text-foreground/60 font-mono">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {formatDate(receipt.purchase_date)}
                                                    </span>
                                                    <span className="font-bold text-foreground text-sm">
                                                        {receipt.total_amount ? `$${Number(receipt.total_amount).toFixed(2)}` : '-'}
                                                    </span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                                
                                {/* Infinite Scroll Trigger */}
                                {hasMore && (
                                    <div 
                                        ref={loadMoreRef}
                                        className="col-span-full flex justify-center py-8"
                                    >
                                        <div className="flex items-center gap-2 text-foreground/40 text-sm">
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Loading more...
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </div>

                    {/* Right: Detail Panel */}
                    <div className="lg:col-span-1 bg-foreground/5 border-l border-foreground/20">
                        <AnimatePresence mode="wait">
                            {selectedReceipt ? (
                                <motion.div 
                                    key="detail"
                                    className="flex flex-col h-full"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                >
                                    <div className="flex items-center justify-between p-4 border-b border-foreground/20 bg-background">
                                        <div className="flex items-center gap-2 text-foreground">
                                            <Receipt className="h-4 w-4" />
                                            <h4 className="font-bold text-sm uppercase tracking-wider">Receipt Details</h4>
                                        </div>
                                        <motion.button 
                                            onClick={() => setSelectedReceipt(null)} 
                                            className="p-1 hover:bg-foreground/10 transition-colors text-foreground"
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                        >
                                            <X className="h-4 w-4" />
                                        </motion.button>
                                    </div>

                                    {/* Image */}
                                    <div className="flex-1 bg-foreground/20 overflow-hidden relative group">
                                        <SignedReceiptImage
                                            supabase={supabase}
                                            path={selectedReceipt.primary_file?.path ?? null}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>

                                    {/* Details */}
                                    <div className="p-4 border-t border-foreground/20 bg-background space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 bg-foreground/10 border border-foreground flex items-center justify-center">
                                                <Tag className="h-4 w-4 text-foreground/60" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-foreground/60 uppercase font-bold">Store</p>
                                                <p className="font-medium text-foreground">{selectedReceipt.store_name || 'Unknown'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 bg-foreground/10 border border-foreground flex items-center justify-center">
                                                <Calendar className="h-4 w-4 text-foreground/60" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-foreground/60 uppercase font-bold">Date</p>
                                                <p className="font-mono text-foreground">{formatDate(selectedReceipt.purchase_date)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 bg-foreground/10 border border-foreground flex items-center justify-center">
                                                <DollarSign className="h-4 w-4 text-foreground/60" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-foreground/60 uppercase font-bold">Amount</p>
                                                <p className="font-bold text-2xl text-foreground">{selectedReceipt.total_amount ? `$${Number(selectedReceipt.total_amount).toFixed(2)}` : '-'}</p>
                                            </div>
                                        </div>
                                        {selectedReceipt.category_name && (
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-swiss-green/10 border border-swiss-green flex items-center justify-center">
                                                    <span className="h-2 w-2 bg-swiss-green rounded-full" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-foreground/60 uppercase font-bold">Category</p>
                                                    <p className="font-medium text-swiss-green">{selectedReceipt.category_name}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="p-4 border-t border-foreground/20 bg-background flex gap-2">
                                        <Link 
                                            href={`/receipts/${selectedReceipt.id}`} 
                                            className="flex-1 py-3 bg-swiss-blue text-white font-bold text-center hover:bg-blue-700 border border-foreground transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.3)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[5px_5px_0px_0px_rgba(255,255,255,0.3)] hover:-translate-x-0.5 hover:-translate-y-0.5"
                                        >
                                            Edit
                                        </Link>
                                        <motion.button 
                                            className="px-4 py-3 bg-background text-swiss-orange font-bold hover:bg-orange-50 dark:hover:bg-orange-900/20 border border-foreground transition-colors"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </motion.button>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="empty"
                                    className="flex flex-col items-center justify-center h-full p-8 text-center"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    <motion.div 
                                        className="h-20 w-20 bg-background border border-foreground flex items-center justify-center mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]"
                                        animate={{ y: [0, -5, 0] }}
                                        transition={{ duration: 3, repeat: Infinity }}
                                    >
                                        <ImageIcon className="h-10 w-10 text-foreground/30" />
                                    </motion.div>
                                    <p className="text-foreground/70 font-medium mb-1">Select a receipt</p>
                                    <p className="text-sm text-foreground/40">Click on any receipt to view details</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>
        </DashboardShell>
    )
}

function SignedReceiptImage({
    supabase,
    path,
    className,
    hover = false,
}: {
    supabase: SupabaseClient
    path: string | null
    className: string
    hover?: boolean
}) {
    const [src, setSrc] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        setSrc(null)

        if (!path) return

        supabase.storage
            .from('receipts')
            .createSignedUrl(path, 60 * 60)
            .then(({ data, error }) => {
                if (cancelled) return
                if (error) {
                    console.warn('Failed to create signed URL for receipt image:', error)
                    return
                }
                setSrc(data.signedUrl)
            })

        return () => {
            cancelled = true
        }
    }, [path, supabase])

    if (!path || !src) {
        return (
            <div className={cn(className, 'flex items-center justify-center')}>
                <ImageIcon className="h-10 w-10 text-foreground/30" />
            </div>
        )
    }

    if (hover) {
        return (
            <motion.img
                src={src}
                alt="Receipt"
                loading="lazy"
                className={className}
                onError={(e) => {
                    e.currentTarget.style.opacity = '0.5'
                }}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.4 }}
            />
        )
    }

    return (
        <motion.img
            src={src}
            alt="Receipt"
            loading="lazy"
            className={className}
            onError={(e) => {
                e.currentTarget.style.opacity = '0.5'
            }}
        />
    )
}
