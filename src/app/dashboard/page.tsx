'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DashboardShell from '@/components/layout/DashboardShell'
import { ArrowUpRight, TrendingUp, AlertTriangle, CheckCircle, FileText, Upload, X, Image as ImageIcon } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs))
}

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

    // Swiss Style Metric Card
    const MetricCard = ({ label, value, subtext, alert }: any) => (
        <div className="bg-white border text-black p-6 flex flex-col justify-between h-48 border-black hover:bg-neutral-50 transition-colors cursor-default group">
            <div className="flex justify-between items-start">
                <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">{label}</span>
                {alert && <div className="h-3 w-3 bg-swiss-orange animate-pulse" />}
            </div>
            <div>
                <h3 className="text-5xl font-bold tracking-tighter mb-2 group-hover:translate-x-1 transition-transform">{value}</h3>
                <p className="text-sm font-mono text-neutral-600 border-l-2 border-blue-500 pl-2">{subtext}</p>
            </div>
        </div>
    )

    return (
        <DashboardShell>
            {/* Top Metrics Grid - Rigid Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-b border-black">
                <MetricCard
                    label="Total Expenses"
                    value={`$${totalAmount.toFixed(2)}`}
                    subtext={`${receiptCount} Receipts Processed`}
                />
                <MetricCard
                    label="Pending Review"
                    value="0"
                    subtext="All caught up"
                />
                <MetricCard
                    label="Avg. Receipt"
                    value={receiptCount > 0 ? `$${(totalAmount / receiptCount).toFixed(2)}` : '$0.00'}
                    subtext="Per transaction"
                />
                <MetricCard
                    label="Categories"
                    value={new Set(receipts.map(r => r.category_name).filter(Boolean)).size.toString()}
                    subtext="Active categories"
                />
            </div>

            {/* Main Workspace - Split View */}
            <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[600px]">

                {/* Left: Recent Receipts Table */}
                <div className="lg:col-span-2 bg-white p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold tracking-tight">Recent Receipts</h3>
                        <Link href="/receipts" className="text-sm font-bold underline decoration-2 underline-offset-4 hover:text-blue-600">
                            View All
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
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="p-6 text-center text-neutral-500">Loading...</td>
                                    </tr>
                                ) : receipts.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-6 text-center text-neutral-500">No receipts yet. Upload one!</td>
                                    </tr>
                                ) : (
                                    receipts.map((receipt) => (
                                        <tr
                                            key={receipt.id}
                                            className={cn(
                                                "hover:bg-neutral-50 cursor-pointer transition-colors",
                                                selectedReceipt?.id === receipt.id && "bg-blue-50 border-l-4 border-l-blue-500"
                                            )}
                                            onClick={() => setSelectedReceipt(receipt)}
                                        >
                                            <td className="p-3 border-r border-black/10">{formatDate(receipt.purchase_date)}</td>
                                            <td className="p-3 border-r border-black/10 font-sans font-medium">
                                                {receipt.store_name || <span className="text-neutral-400 italic">Unknown</span>}
                                            </td>
                                            <td className="p-3 border-r border-black/10">
                                                {receipt.total_amount ? `$${Number(receipt.total_amount).toFixed(2)}` : <span className="text-neutral-400">-</span>}
                                            </td>
                                            <td className="p-3">
                                                {receipt.category_name ? (
                                                    <span className="inline-flex items-center gap-1 text-swiss-green font-sans font-medium">
                                                        <span className="h-2 w-2 bg-swiss-green"></span>
                                                        {receipt.category_name}
                                                    </span>
                                                ) : (
                                                    <span className="text-neutral-400">Uncategorized</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right: Receipt Preview / Actions */}
                <div className="lg:col-span-1 bg-neutral-50 border-l border-black p-8 flex flex-col gap-6">
                    {selectedReceipt ? (
                        /* Receipt Detail Panel */
                        <div className="border border-black bg-white flex flex-col h-full">
                            <div className="flex items-center justify-between p-4 border-b border-black bg-neutral-100">
                                <h4 className="font-bold text-sm uppercase tracking-wider">Receipt Preview</h4>
                                <button
                                    onClick={() => setSelectedReceipt(null)}
                                    className="p-1 hover:bg-neutral-200"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Image Preview */}
                            <div className="flex-1 bg-neutral-200 flex items-center justify-center min-h-[300px] relative overflow-hidden">
                                <img
                                    src={getImageUrl(selectedReceipt.image_url)}
                                    alt="Receipt"
                                    className="max-w-full max-h-[400px] object-contain"
                                />
                            </div>

                            {/* Receipt Details */}
                            <div className="p-4 border-t border-black space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="font-bold uppercase text-xs text-neutral-500">Store</span>
                                    <span className="font-medium">{selectedReceipt.store_name || 'Unknown'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-bold uppercase text-xs text-neutral-500">Date</span>
                                    <span className="font-mono">{formatDate(selectedReceipt.purchase_date)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-bold uppercase text-xs text-neutral-500">Amount</span>
                                    <span className="font-bold text-lg">{selectedReceipt.total_amount ? `$${Number(selectedReceipt.total_amount).toFixed(2)}` : '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-bold uppercase text-xs text-neutral-500">Category</span>
                                    <span>{selectedReceipt.category_name || 'Uncategorized'}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="p-4 border-t border-black flex gap-2">
                                <Link
                                    href={`/receipts/${selectedReceipt.id}`}
                                    className="flex-1 py-2 bg-black text-white font-bold text-sm hover:bg-neutral-800 border border-black text-center"
                                >
                                    Edit
                                </Link>
                                <button
                                    onClick={() => {
                                        if (confirm('Delete this receipt?')) {
                                            supabase.from('receipts').delete().eq('id', selectedReceipt.id).then(() => {
                                                setSelectedReceipt(null)
                                                setReceipts(receipts.filter(r => r.id !== selectedReceipt.id))
                                            })
                                        }
                                    }}
                                    className="flex-1 py-2 bg-white text-swiss-orange font-bold text-sm hover:bg-orange-50 border border-black"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Default: Upload CTA */
                        <>
                            <div className="border border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <Upload className="h-5 w-5" />
                                    New Receipt
                                </h4>
                                <p className="text-sm text-neutral-600 mb-6">
                                    Click a receipt from the list to preview, or upload a new one.
                                </p>
                                <Link href="/upload" className="block w-full py-3 bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors border border-black text-center">
                                    Upload Receipt
                                </Link>
                            </div>

                            <div className="border border-black bg-white p-6 flex-1 flex flex-col items-center justify-center text-center">
                                <ImageIcon className="h-12 w-12 text-neutral-300 mb-4" />
                                <p className="text-neutral-500 text-sm">
                                    Select a receipt from the table to see its preview here.
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </DashboardShell>
    )
}
