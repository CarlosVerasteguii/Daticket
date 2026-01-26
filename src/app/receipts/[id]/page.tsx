'use client'

import { useEffect, useState, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DashboardShell from '@/components/layout/DashboardShell'
import { ArrowLeft, Trash2, Calendar, Store, DollarSign, Loader2, Save, Tag } from 'lucide-react'

export default function ReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const supabase = createClient()
    const [receipt, setReceipt] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [deleting, setDeleting] = useState(false)
    const [saving, setSaving] = useState(false)
    const [imageUrl, setImageUrl] = useState<string | null>(null)

    // Editable fields
    const [storeName, setStoreName] = useState('')
    const [totalAmount, setTotalAmount] = useState('')
    const [purchaseDate, setPurchaseDate] = useState('')
    const [notes, setNotes] = useState('')

    useEffect(() => {
        async function fetchReceipt() {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login')
                return
            }

            const { data, error } = await supabase
                .from('receipts')
                .select('*')
                .eq('id', id)
                .single()

            if (data) {
                setReceipt(data)
                setStoreName(data.store_name || '')
                setTotalAmount(data.total_amount?.toString() || '')
                setPurchaseDate(data.purchase_date || '')
                setNotes(data.notes || '')

                if (data.image_url) {
                    const { data: urlData } = supabase.storage
                        .from('receipts')
                        .getPublicUrl(data.image_url)
                    setImageUrl(urlData.publicUrl)
                }
            }
            setLoading(false)
        }
        fetchReceipt()
    }, [id, router, supabase])

    const handleSave = async () => {
        setSaving(true)
        try {
            const { error } = await supabase
                .from('receipts')
                .update({
                    store_name: storeName,
                    total_amount: totalAmount ? parseFloat(totalAmount) : null,
                    purchase_date: purchaseDate || null,
                    notes: notes || null
                })
                .eq('id', id)
            router.push('/receipts')
        } catch (error: any) {
            alert('Error saving: ' + error.message)
        }
        setSaving(false)
    }

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this receipt? This cannot be undone.')) return

        setDeleting(true)
        try {
            const { error: dbError } = await supabase
                .from('receipts')
                .delete()
                .eq('id', id)

            if (dbError) throw dbError

            if (receipt.image_url) {
                await supabase.storage.from('receipts').remove([receipt.image_url])
            }

            router.push('/receipts')
            router.refresh()
        } catch (error: any) {
            alert('Error deleting receipt: ' + error.message)
            setDeleting(false)
        }
    }

    if (loading) {
        return (
            <DashboardShell>
                <div className="flex items-center justify-center h-96">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            </DashboardShell>
        )
    }

    if (!receipt) {
        return (
            <DashboardShell>
                <div className="flex flex-col items-center justify-center h-96">
                    <p className="text-lg font-bold mb-4">Receipt not found</p>
                    <Link href="/receipts" className="underline">Back to Receipts</Link>
                </div>
            </DashboardShell>
        )
    }

    return (
        <DashboardShell>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-black bg-white">
                <div className="flex items-center gap-4">
                    <Link href="/receipts" className="p-2 hover:bg-neutral-100 border border-black">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tighter">Edit Receipt</h1>
                        <p className="text-xs text-neutral-500 font-mono mt-1">ID: {id.slice(0, 8)}...</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold hover:bg-blue-700 border border-black disabled:opacity-50"
                    >
                        <Save className="h-4 w-4" />
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex items-center gap-2 px-4 py-3 bg-white text-red-600 font-bold hover:bg-red-50 border border-black disabled:opacity-50"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Main Content - Split View */}
            <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100vh-180px)]">
                {/* Left: Image */}
                <div className="bg-neutral-100 border-r border-black flex items-center justify-center p-8">
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt="Receipt"
                            className="max-w-full max-h-[600px] object-contain shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
                        />
                    ) : (
                        <div className="text-neutral-400">No Image Available</div>
                    )}
                </div>

                {/* Right: Edit Form */}
                <div className="bg-white p-8">
                    <h2 className="text-lg font-bold uppercase tracking-wider mb-6 flex items-center gap-2">
                        <Tag className="h-5 w-5" />
                        Receipt Details
                    </h2>

                    <div className="space-y-6">
                        {/* Store Name */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                                Store Name
                            </label>
                            <input
                                type="text"
                                value={storeName}
                                onChange={(e) => setStoreName(e.target.value)}
                                placeholder="Enter store name"
                                className="w-full px-4 py-3 border border-black font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Amount */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                                Total Amount
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={totalAmount}
                                    onChange={(e) => setTotalAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full pl-8 pr-4 py-3 border border-black font-mono text-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Date */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                                Purchase Date
                            </label>
                            <input
                                type="date"
                                value={purchaseDate}
                                onChange={(e) => setPurchaseDate(e.target.value)}
                                className="w-full px-4 py-3 border border-black font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                                Notes
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add any additional notes..."
                                rows={4}
                                className="w-full px-4 py-3 border border-black resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Meta Info */}
                    <div className="mt-8 pt-6 border-t border-black">
                        <p className="text-xs text-neutral-500 font-mono">
                            Uploaded: {new Date(receipt.created_at).toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>
        </DashboardShell>
    )
}
