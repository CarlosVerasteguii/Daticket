'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DashboardShell from '@/components/layout/DashboardShell'
import { ReceiptsGridSkeleton } from '@/components/ui/Skeleton'
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
  ArrowUpRight
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Receipt {
    id: string
    store_name: string | null
    purchase_date: string | null
    total_amount: number | null
    image_url: string
    notes: string | null
    created_at: string
    category_name: string | null
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

export default function ReceiptsPage() {
    const router = useRouter()
    const supabase = createClient()
    const [receipts, setReceipts] = useState<Receipt[]>([])
    const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        const fetchReceipts = async () => {
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
                    image_url,
                    notes,
                    created_at,
                    categories(name)
                `)
                .order('created_at', { ascending: false })

            if (data) {
                const formattedData = data.map((r: any) => ({
                    ...r,
                    category_name: r.categories?.name || null
                }))
                setReceipts(formattedData)
            }
            setLoading(false)
        }
        fetchReceipts()
    }, [router, supabase])

    const getImageUrl = (path: string) => {
        const { data } = supabase.storage.from('receipts').getPublicUrl(path)
        return data.publicUrl
    }

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'N/A'
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }

    const categories = [...new Set(receipts.map(r => r.category_name).filter(Boolean))]
    
    // Filter and search receipts
    let filteredReceipts = receipts
    if (filter !== 'all') {
        filteredReceipts = filteredReceipts.filter(r => r.category_name === filter)
    }
    if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        filteredReceipts = filteredReceipts.filter(r => 
            r.store_name?.toLowerCase().includes(query) ||
            r.category_name?.toLowerCase().includes(query)
        )
    }

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
                    className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 p-6 border-b border-black bg-white"
                    variants={itemVariants}
                >
                    <div>
                        <h1 className="text-3xl font-bold tracking-tighter">All Receipts</h1>
                        <p className="text-sm text-neutral-500 font-mono mt-1">
                            {filteredReceipts.length} of {receipts.length} records
                            {filter !== 'all' && ` in ${filter}`}
                        </p>
                    </div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Link
                            href="/upload"
                            className="inline-flex items-center px-6 py-3 bg-black text-white font-bold hover:bg-neutral-800 transition-all border border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,0.2)] hover:-translate-x-0.5 hover:-translate-y-0.5"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            New Receipt
                        </Link>
                    </motion.div>
                </motion.div>

                {/* Stats Bar */}
                <motion.div 
                    className="grid grid-cols-2 md:grid-cols-4 border-b border-black bg-neutral-50"
                    variants={itemVariants}
                >
                    <div className="p-4 border-r border-black/10">
                        <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Total</p>
                        <p className="text-2xl font-bold tracking-tighter">${totalAmount.toFixed(2)}</p>
                    </div>
                    <div className="p-4 border-r border-black/10">
                        <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Receipts</p>
                        <p className="text-2xl font-bold tracking-tighter">{filteredReceipts.length}</p>
                    </div>
                    <div className="p-4 border-r border-black/10 hidden md:block">
                        <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Categories</p>
                        <p className="text-2xl font-bold tracking-tighter">{categories.length}</p>
                    </div>
                    <div className="p-4 hidden md:block">
                        <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Avg</p>
                        <p className="text-2xl font-bold tracking-tighter">
                            ${filteredReceipts.length > 0 ? (totalAmount / filteredReceipts.length).toFixed(2) : '0.00'}
                        </p>
                    </div>
                </motion.div>

                {/* Filters & Search */}
                <motion.div 
                    className="flex flex-col md:flex-row gap-4 p-4 border-b border-black bg-white"
                    variants={itemVariants}
                >
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Search receipts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-black font-medium focus:outline-none focus:ring-2 focus:ring-swiss-blue text-sm"
                        />
                    </div>

                    {/* Category Filters */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                        <Filter className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                        <motion.button
                            onClick={() => setFilter('all')}
                            className={cn(
                                "px-4 py-2 text-sm font-bold border border-black transition-all whitespace-nowrap",
                                filter === 'all' 
                                    ? 'bg-black text-white' 
                                    : 'bg-white text-black hover:bg-neutral-100'
                            )}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            All
                        </motion.button>
                        {categories.map((cat) => (
                            <motion.button
                                key={cat}
                                onClick={() => setFilter(cat!)}
                                className={cn(
                                    "px-4 py-2 text-sm font-bold border border-black transition-all whitespace-nowrap",
                                    filter === cat 
                                        ? 'bg-black text-white' 
                                        : 'bg-white text-black hover:bg-neutral-100'
                                )}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {cat}
                            </motion.button>
                        ))}
                    </div>
                </motion.div>

                {/* Main Content - Split View */}
                <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[calc(100vh-300px)]">
                    {/* Left: Receipt Grid */}
                    <div className="lg:col-span-2 bg-white p-6 overflow-y-auto">
                        {loading ? (
                            <ReceiptsGridSkeleton count={6} />
                        ) : filteredReceipts.length === 0 ? (
                            <motion.div 
                                className="flex flex-col items-center justify-center h-64 text-center"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                            >
                                <div className="h-16 w-16 bg-neutral-100 border border-black flex items-center justify-center mb-4">
                                    <Receipt className="h-8 w-8 text-neutral-400" />
                                </div>
                                <p className="text-lg font-medium text-neutral-600 mb-2">
                                    {searchQuery ? "No receipts match your search" : "No receipts found"}
                                </p>
                                <p className="text-sm text-neutral-400 mb-4">
                                    {searchQuery ? "Try a different search term" : "Upload your first receipt to get started"}
                                </p>
                                {!searchQuery && (
                                    <Link 
                                        href="/upload" 
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-bold hover:bg-neutral-800 transition-colors"
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
                                    {filteredReceipts.map((receipt, index) => (
                                        <motion.div
                                            key={receipt.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            transition={{ delay: index * 0.05 }}
                                            onClick={() => setSelectedReceipt(receipt)}
                                            className={cn(
                                                "group border border-black bg-white cursor-pointer transition-all duration-300",
                                                selectedReceipt?.id === receipt.id 
                                                    ? 'shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ring-2 ring-swiss-blue ring-offset-2' 
                                                    : 'hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-[3px] hover:-translate-y-[3px]'
                                            )}
                                        >
                                            {/* Thumbnail */}
                                            <div className="h-32 bg-neutral-100 overflow-hidden relative">
                                                <motion.img
                                                    src={getImageUrl(receipt.image_url)}
                                                    alt="Receipt"
                                                    className="w-full h-full object-cover"
                                                    whileHover={{ scale: 1.05 }}
                                                    transition={{ duration: 0.4 }}
                                                />
                                                {receipt.category_name && (
                                                    <div className="absolute top-2 left-2 px-2 py-1 bg-white/90 border border-black text-xs font-bold uppercase">
                                                        {receipt.category_name}
                                                    </div>
                                                )}
                                            </div>
                                            {/* Info */}
                                            <div className="p-4 border-t border-black">
                                                <p className="font-bold text-sm truncate group-hover:text-swiss-blue transition-colors">
                                                    {receipt.store_name || 'Unknown Store'}
                                                </p>
                                                <div className="flex justify-between items-center mt-2 text-xs text-neutral-600 font-mono">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {formatDate(receipt.purchase_date)}
                                                    </span>
                                                    <span className="font-bold text-black text-sm">
                                                        {receipt.total_amount ? `$${Number(receipt.total_amount).toFixed(2)}` : '-'}
                                                    </span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </motion.div>
                        )}
                    </div>

                    {/* Right: Detail Panel */}
                    <div className="lg:col-span-1 bg-neutral-50 border-l border-black">
                        <AnimatePresence mode="wait">
                            {selectedReceipt ? (
                                <motion.div 
                                    key="detail"
                                    className="flex flex-col h-full"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                >
                                    <div className="flex items-center justify-between p-4 border-b border-black bg-white">
                                        <div className="flex items-center gap-2">
                                            <Receipt className="h-4 w-4" />
                                            <h4 className="font-bold text-sm uppercase tracking-wider">Receipt Details</h4>
                                        </div>
                                        <motion.button 
                                            onClick={() => setSelectedReceipt(null)} 
                                            className="p-1 hover:bg-neutral-100 transition-colors"
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                        >
                                            <X className="h-4 w-4" />
                                        </motion.button>
                                    </div>

                                    {/* Image */}
                                    <div className="flex-1 bg-neutral-200 overflow-hidden relative group">
                                        <motion.img
                                            src={getImageUrl(selectedReceipt.image_url)}
                                            alt="Receipt"
                                            className="w-full h-full object-contain"
                                            initial={{ scale: 0.9 }}
                                            animate={{ scale: 1 }}
                                        />
                                    </div>

                                    {/* Details */}
                                    <div className="p-4 border-t border-black bg-white space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 bg-neutral-100 border border-black flex items-center justify-center">
                                                <Tag className="h-4 w-4 text-neutral-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-neutral-500 uppercase font-bold">Store</p>
                                                <p className="font-medium">{selectedReceipt.store_name || 'Unknown'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 bg-neutral-100 border border-black flex items-center justify-center">
                                                <Calendar className="h-4 w-4 text-neutral-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-neutral-500 uppercase font-bold">Date</p>
                                                <p className="font-mono">{formatDate(selectedReceipt.purchase_date)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 bg-neutral-100 border border-black flex items-center justify-center">
                                                <DollarSign className="h-4 w-4 text-neutral-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-neutral-500 uppercase font-bold">Amount</p>
                                                <p className="font-bold text-2xl">{selectedReceipt.total_amount ? `$${Number(selectedReceipt.total_amount).toFixed(2)}` : '-'}</p>
                                            </div>
                                        </div>
                                        {selectedReceipt.category_name && (
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-swiss-green/10 border border-swiss-green flex items-center justify-center">
                                                    <span className="h-2 w-2 bg-swiss-green rounded-full" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-neutral-500 uppercase font-bold">Category</p>
                                                    <p className="font-medium text-swiss-green">{selectedReceipt.category_name}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="p-4 border-t border-black bg-white flex gap-2">
                                        <Link 
                                            href={`/receipts/${selectedReceipt.id}`} 
                                            className="flex-1 py-3 bg-swiss-blue text-white font-bold text-center hover:bg-blue-700 border border-black transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5"
                                        >
                                            Edit
                                        </Link>
                                        <motion.button 
                                            className="px-4 py-3 bg-white text-swiss-orange font-bold hover:bg-orange-50 border border-black transition-colors"
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
                                        className="h-20 w-20 bg-white border border-black flex items-center justify-center mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
                                        animate={{ y: [0, -5, 0] }}
                                        transition={{ duration: 3, repeat: Infinity }}
                                    >
                                        <ImageIcon className="h-10 w-10 text-neutral-300" />
                                    </motion.div>
                                    <p className="text-neutral-600 font-medium mb-1">Select a receipt</p>
                                    <p className="text-sm text-neutral-400">Click on any receipt to view details</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>
        </DashboardShell>
    )
}
