'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DashboardShell from '@/components/layout/DashboardShell'
import { DashboardSkeleton } from '@/components/ui/Skeleton'
import { 
  ArrowUpRight, 
  TrendingUp, 
  TrendingDown,
  CheckCircle, 
  FileText, 
  Upload, 
  X, 
  Image as ImageIcon,
  Receipt,
  Calendar,
  DollarSign,
  Tag,
  Sparkles
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

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
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

export default function DashboardPage() {
    const router = useRouter()
    const supabase = createClient()
    const [user, setUser] = useState<any>(null)
    const [receipts, setReceipts] = useState<Receipt[]>([])
    const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const checkUserAndFetchReceipts = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login')
                return
            }
            setUser(session.user)

            // Fetch receipts
            const { data, error } = await supabase
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
                .limit(10)

            if (data) {
                const formattedData = data.map((r: any) => ({
                    ...r,
                    category_name: r.categories?.name || null
                }))
                setReceipts(formattedData)
            }
            setLoading(false)
        }
        checkUserAndFetchReceipts()
    }, [router, supabase])

    // Calculate totals
    const totalAmount = receipts.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0)
    const receiptCount = receipts.length
    
    // Calculate month-over-month trend (mock calculation for demo)
    const currentMonthTotal = receipts
        .filter(r => r.purchase_date && new Date(r.purchase_date).getMonth() === new Date().getMonth())
        .reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0)
    const trend = currentMonthTotal > 0 ? 12 : 0 // Mock trend

    // Get public URL for image
    const getImageUrl = (path: string) => {
        const { data } = supabase.storage.from('receipts').getPublicUrl(path)
        return data.publicUrl
    }

    // Format date
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'N/A'
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    // Swiss Style Metric Card with animations
    const MetricCard = ({ 
        label, 
        value, 
        subtext, 
        alert,
        trend,
        icon: Icon
    }: any) => (
        <motion.div 
            className="group bg-white border text-black p-6 flex flex-col justify-between h-48 border-black hover:bg-neutral-50 transition-all duration-300 cursor-default"
            whileHover={{ 
                y: -4, 
                boxShadow: "6px 6px 0px 0px rgba(0,0,0,1)" 
            }}
            transition={{ duration: 0.2 }}
        >
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                    {Icon && <Icon className="h-4 w-4 text-neutral-400" />}
                    <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">{label}</span>
                </div>
                {alert && (
                    <motion.div 
                        className="h-3 w-3 bg-swiss-orange rounded-full"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                )}
            </div>
            <div>
                <div className="flex items-baseline gap-3">
                    <h3 className="text-4xl md:text-5xl font-bold tracking-tighter mb-2 group-hover:translate-x-1 transition-transform duration-300">
                        {value}
                    </h3>
                    {trend !== undefined && trend !== 0 && (
                        <span className={cn(
                            "text-xs font-bold flex items-center gap-1",
                            trend > 0 ? "text-swiss-green" : "text-swiss-orange"
                        )}>
                            {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {Math.abs(trend)}%
                        </span>
                    )}
                </div>
                <p className="text-sm font-mono text-neutral-600 border-l-2 border-swiss-blue pl-2">{subtext}</p>
            </div>
        </motion.div>
    )

    if (loading) {
        return (
            <DashboardShell>
                <DashboardSkeleton />
            </DashboardShell>
        )
    }

    return (
        <DashboardShell>
            <motion.div
                initial="hidden"
                animate="visible"
                variants={containerVariants}
            >
                {/* Top Metrics Grid - Rigid Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-b border-black">
                    <MetricCard
                        label="Total Expenses"
                        value={`$${totalAmount.toFixed(2)}`}
                        subtext={`${receiptCount} Receipts Processed`}
                        icon={DollarSign}
                        trend={trend}
                    />
                    <MetricCard
                        label="Pending Review"
                        value="0"
                        subtext="All caught up"
                        icon={CheckCircle}
                    />
                    <MetricCard
                        label="Avg. Receipt"
                        value={receiptCount > 0 ? `$${(totalAmount / receiptCount).toFixed(2)}` : '$0.00'}
                        subtext="Per transaction"
                        icon={Receipt}
                    />
                    <MetricCard
                        label="Categories"
                        value={new Set(receipts.map(r => r.category_name).filter(Boolean)).size.toString()}
                        subtext="Active categories"
                        icon={Tag}
                        alert={receiptCount > 0 && new Set(receipts.map(r => r.category_name).filter(Boolean)).size === 0}
                    />
                </div>

                {/* Main Workspace - Split View */}
                <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[600px]">

                    {/* Left: Recent Receipts Table */}
                    <motion.div 
                        className="lg:col-span-2 bg-white p-8"
                        variants={itemVariants}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-xl font-bold tracking-tight">Recent Receipts</h3>
                                <p className="text-sm text-neutral-500 mt-1">Your latest transactions</p>
                            </div>
                            <Link 
                                href="/receipts" 
                                className="group inline-flex items-center gap-1 text-sm font-bold underline decoration-2 underline-offset-4 hover:text-swiss-blue transition-colors"
                            >
                                View All
                                <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </Link>
                        </div>

                        <div className="overflow-hidden border border-black">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-neutral-100 border-b border-black">
                                    <tr>
                                        <th className="p-3 font-bold uppercase text-xs tracking-wider border-r border-black/10">Date</th>
                                        <th className="p-3 font-bold uppercase text-xs tracking-wider border-r border-black/10">Store</th>
                                        <th className="p-3 font-bold uppercase text-xs tracking-wider border-r border-black/10">Amount</th>
                                        <th className="p-3 font-bold uppercase text-xs tracking-wider">Category</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/10 font-mono">
                                    {receipts.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="p-8">
                                                <motion.div 
                                                    className="flex flex-col items-center justify-center text-center"
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                >
                                                    <div className="h-16 w-16 bg-neutral-100 border border-black flex items-center justify-center mb-4">
                                                        <Receipt className="h-8 w-8 text-neutral-400" />
                                                    </div>
                                                    <p className="text-neutral-600 font-sans font-medium mb-2">No receipts yet</p>
                                                    <p className="text-sm text-neutral-400 font-sans mb-4">Upload your first receipt to get started</p>
                                                    <Link 
                                                        href="/upload"
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-bold hover:bg-neutral-800 transition-colors"
                                                    >
                                                        <Upload className="h-4 w-4" />
                                                        Upload Receipt
                                                    </Link>
                                                </motion.div>
                                            </td>
                                        </tr>
                                    ) : (
                                        receipts.map((receipt, index) => (
                                            <motion.tr
                                                key={receipt.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className={cn(
                                                    "cursor-pointer transition-all duration-200",
                                                    selectedReceipt?.id === receipt.id 
                                                        ? "bg-swiss-blue/5 border-l-4 border-l-swiss-blue" 
                                                        : "hover:bg-neutral-50 border-l-4 border-l-transparent"
                                                )}
                                                onClick={() => setSelectedReceipt(receipt)}
                                            >
                                                <td className="p-3 border-r border-black/10">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="h-3 w-3 text-neutral-400" />
                                                        {formatDate(receipt.purchase_date)}
                                                    </div>
                                                </td>
                                                <td className="p-3 border-r border-black/10 font-sans font-medium">
                                                    {receipt.store_name || <span className="text-neutral-400 italic">Unknown</span>}
                                                </td>
                                                <td className="p-3 border-r border-black/10 font-bold">
                                                    {receipt.total_amount ? `$${Number(receipt.total_amount).toFixed(2)}` : <span className="text-neutral-400">-</span>}
                                                </td>
                                                <td className="p-3">
                                                    {receipt.category_name ? (
                                                        <span className="inline-flex items-center gap-1.5 text-swiss-green font-sans font-medium">
                                                            <span className="h-2 w-2 bg-swiss-green rounded-full"></span>
                                                            {receipt.category_name}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 text-neutral-400">
                                                            <span className="h-2 w-2 bg-neutral-300 rounded-full"></span>
                                                            Uncategorized
                                                        </span>
                                                    )}
                                                </td>
                                            </motion.tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>

                    {/* Right: Receipt Preview / Actions */}
                    <motion.div 
                        className="lg:col-span-1 bg-neutral-50 border-l border-black p-8 flex flex-col gap-6"
                        variants={itemVariants}
                    >
                        <AnimatePresence mode="wait">
                            {selectedReceipt ? (
                                <motion.div 
                                    key="detail"
                                    className="border border-black bg-white flex flex-col h-full"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className="flex items-center justify-between p-4 border-b border-black bg-neutral-100">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-4 w-4" />
                                            <h4 className="font-bold text-sm uppercase tracking-wider">Receipt Preview</h4>
                                        </div>
                                        <motion.button
                                            onClick={() => setSelectedReceipt(null)}
                                            className="p-1 hover:bg-neutral-200 transition-colors"
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                        >
                                            <X className="h-4 w-4" />
                                        </motion.button>
                                    </div>

                                    {/* Image Preview */}
                                    <div className="flex-1 bg-neutral-200 flex items-center justify-center min-h-[300px] relative overflow-hidden group">
                                        <motion.img
                                            src={getImageUrl(selectedReceipt.image_url)}
                                            alt="Receipt"
                                            className="max-w-full max-h-[400px] object-contain"
                                            initial={{ scale: 0.9, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ duration: 0.3 }}
                                        />
                                    </div>

                                    {/* Receipt Details */}
                                    <div className="p-4 border-t border-black space-y-3 text-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold uppercase text-xs text-neutral-500">Store</span>
                                            <span className="font-medium">{selectedReceipt.store_name || 'Unknown'}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold uppercase text-xs text-neutral-500">Date</span>
                                            <span className="font-mono">{formatDate(selectedReceipt.purchase_date)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold uppercase text-xs text-neutral-500">Amount</span>
                                            <span className="font-bold text-xl">{selectedReceipt.total_amount ? `$${Number(selectedReceipt.total_amount).toFixed(2)}` : '-'}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold uppercase text-xs text-neutral-500">Category</span>
                                            <span className={cn(
                                                "px-2 py-1 text-xs font-bold uppercase",
                                                selectedReceipt.category_name 
                                                    ? "bg-swiss-green/10 text-swiss-green" 
                                                    : "bg-neutral-100 text-neutral-500"
                                            )}>
                                                {selectedReceipt.category_name || 'Uncategorized'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="p-4 border-t border-black flex gap-2">
                                        <Link
                                            href={`/receipts/${selectedReceipt.id}`}
                                            className="flex-1 py-2 bg-black text-white font-bold text-sm hover:bg-neutral-800 border border-black text-center transition-colors"
                                        >
                                            Edit
                                        </Link>
                                        <motion.button
                                            onClick={() => {
                                                if (confirm('Delete this receipt?')) {
                                                    supabase.from('receipts').delete().eq('id', selectedReceipt.id).then(() => {
                                                        setSelectedReceipt(null)
                                                        setReceipts(receipts.filter(r => r.id !== selectedReceipt.id))
                                                    })
                                                }
                                            }}
                                            className="flex-1 py-2 bg-white text-swiss-orange font-bold text-sm hover:bg-orange-50 border border-black transition-colors"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            Delete
                                        </motion.button>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="empty"
                                    className="flex flex-col gap-6"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <motion.div 
                                        className="border border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                        whileHover={{ 
                                            y: -2, 
                                            boxShadow: "6px 6px 0px 0px rgba(0,0,0,1)" 
                                        }}
                                    >
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="h-10 w-10 bg-black flex items-center justify-center">
                                                <Upload className="h-5 w-5 text-white" />
                                            </div>
                                            <h4 className="font-bold text-lg">New Receipt</h4>
                                        </div>
                                        <p className="text-sm text-neutral-600 mb-6">
                                            {receipts.length === 0 
                                                ? "Get started by uploading your first receipt. We'll extract the details automatically."
                                                : "Click a receipt from the list to preview, or upload a new one."
                                            }
                                        </p>
                                        <Link 
                                            href="/upload" 
                                            className="block w-full py-3 bg-swiss-blue text-white font-bold hover:bg-blue-700 transition-all border border-black text-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5"
                                        >
                                            {receipts.length === 0 ? "Upload First Receipt" : "Upload Receipt"}
                                        </Link>
                                    </motion.div>

                                    <motion.div 
                                        className="border border-black bg-white p-6 flex-1 flex flex-col items-center justify-center text-center"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 }}
                                    >
                                        <div className="h-16 w-16 bg-neutral-100 border border-black flex items-center justify-center mb-4">
                                            <ImageIcon className="h-8 w-8 text-neutral-300" />
                                        </div>
                                        <p className="text-neutral-500 text-sm mb-2">
                                            Select a receipt from the table
                                        </p>
                                        <p className="text-neutral-400 text-xs">
                                            Preview and manage your expenses
                                        </p>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </motion.div>
        </DashboardShell>
    )
}
