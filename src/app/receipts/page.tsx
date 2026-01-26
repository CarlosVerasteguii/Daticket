'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DashboardShell from '@/components/layout/DashboardShell'
import { Plus, X, Image as ImageIcon, Calendar, DollarSign, Tag, Trash2 } from 'lucide-react'

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

export default function ReceiptsPage() {
    const router = useRouter()
    const supabase = createClient()
    const [receipts, setReceipts] = useState<Receipt[]>([])
    const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')

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
    const filteredReceipts = filter === 'all'
        ? receipts
        : receipts.filter(r => r.category_name === filter)

    return (
        <DashboardShell>
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-black bg-white">
                <div>
                    <h1 className="text-3xl font-bold tracking-tighter">All Receipts</h1>
                    <p className="text-sm text-neutral-500 font-mono mt-1">{receipts.length} total records</p>
                </div>
                <Link
                    href="/upload"
                    className="inline-flex items-center px-6 py-3 bg-black text-white font-bold hover:bg-neutral-800 transition-colors border border-black"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    New Receipt
                </Link>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 p-4 border-b border-black bg-neutral-50 overflow-x-auto">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 text-sm font-bold border border-black transition-colors ${filter === 'all' ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
                        }`}
                >
                    All
                </button>
                {categories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setFilter(cat!)}
                        className={`px-4 py-2 text-sm font-bold border border-black transition-colors ${filter === cat ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Main Content - Split View */}
            <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[calc(100vh-220px)]">
                {/* Left: Receipt Grid */}
                <div className="lg:col-span-2 bg-white p-6 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-64 text-neutral-500">Loading...</div>
                    ) : filteredReceipts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
                            <p className="text-lg font-medium">No receipts found</p>
                            <Link href="/upload" className="mt-4 underline font-bold">Upload your first receipt</Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filteredReceipts.map((receipt) => (
                                <div
                                    key={receipt.id}
                                    onClick={() => setSelectedReceipt(receipt)}
                                    className={`border border-black bg-white cursor-pointer transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${selectedReceipt?.id === receipt.id ? 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2' : ''
                                        }`}
                                >
                                    {/* Thumbnail */}
                                    <div className="h-32 bg-neutral-100 overflow-hidden">
                                        <img
                                            src={getImageUrl(receipt.image_url)}
                                            alt="Receipt"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    {/* Info */}
                                    <div className="p-4 border-t border-black">
                                        <p className="font-bold text-sm truncate">{receipt.store_name || 'Unknown Store'}</p>
                                        <div className="flex justify-between items-center mt-2 text-xs text-neutral-600 font-mono">
                                            <span>{formatDate(receipt.purchase_date)}</span>
                                            <span className="font-bold text-black">
                                                {receipt.total_amount ? `$${Number(receipt.total_amount).toFixed(2)}` : '-'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: Detail Panel */}
                <div className="lg:col-span-1 bg-neutral-50 border-l border-black">
                    {selectedReceipt ? (
                        <div className="flex flex-col h-full">
                            <div className="flex items-center justify-between p-4 border-b border-black bg-white">
                                <h4 className="font-bold text-sm uppercase tracking-wider">Receipt Details</h4>
                                <button onClick={() => setSelectedReceipt(null)} className="p-1 hover:bg-neutral-100">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Image */}
                            <div className="flex-1 bg-neutral-200 overflow-hidden">
                                <img
                                    src={getImageUrl(selectedReceipt.image_url)}
                                    alt="Receipt"
                                    className="w-full h-full object-contain"
                                />
                            </div>

                            {/* Details */}
                            <div className="p-4 border-t border-black bg-white space-y-3">
                                <div className="flex items-center gap-3">
                                    <Tag className="h-4 w-4 text-neutral-400" />
                                    <div>
                                        <p className="text-xs text-neutral-500 uppercase font-bold">Store</p>
                                        <p className="font-medium">{selectedReceipt.store_name || 'Unknown'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Calendar className="h-4 w-4 text-neutral-400" />
                                    <div>
                                        <p className="text-xs text-neutral-500 uppercase font-bold">Date</p>
                                        <p className="font-mono">{formatDate(selectedReceipt.purchase_date)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <DollarSign className="h-4 w-4 text-neutral-400" />
                                    <div>
                                        <p className="text-xs text-neutral-500 uppercase font-bold">Amount</p>
                                        <p className="font-bold text-2xl">{selectedReceipt.total_amount ? `$${Number(selectedReceipt.total_amount).toFixed(2)}` : '-'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="p-4 border-t border-black bg-white flex gap-2">
                                <Link href={`/receipts/${selectedReceipt.id}`} className="flex-1 py-3 bg-blue-600 text-white font-bold text-center hover:bg-blue-700 border border-black">
                                    Edit
                                </Link>
                                <button className="px-4 py-3 bg-white text-red-600 font-bold hover:bg-red-50 border border-black">
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                            <ImageIcon className="h-16 w-16 text-neutral-300 mb-4" />
                            <p className="text-neutral-500">Select a receipt to view details</p>
                        </div>
                    )}
                </div>
            </div>
        </DashboardShell>
    )
}
