'use client'

import { useEffect, useMemo, useState, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DashboardShell from '@/components/layout/DashboardShell'
import Image from 'next/image'
import { ArrowLeft, Trash2, Loader2, Save, Tag, Check, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type ToastType = 'success' | 'error' | null

type ReceiptFile = {
    id: string
    bucket_id: string
    path: string
    mime_type: string | null
    size_bytes: number | null
}

interface ReceiptRow {
    id: string
    store_name: string | null
    purchase_date: string | null
    total_amount: number | null
    primary_file: ReceiptFile | null
    notes: string | null
    created_at: string
}

type ReceiptRowQuery = Omit<ReceiptRow, 'primary_file'> & {
    primary_file: ReceiptFile | ReceiptFile[] | null
}

export default function ReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const supabase = useMemo(() => createClient(), [])
    const [receipt, setReceipt] = useState<ReceiptRow | null>(null)
    const [loading, setLoading] = useState(true)
    const [deleting, setDeleting] = useState(false)
    const [saving, setSaving] = useState(false)
    const [imageUrl, setImageUrl] = useState<string | null>(null)
    const [toast, setToast] = useState<{ type: ToastType; message: string }>({ type: null, message: '' })

    // Editable fields
    const [storeName, setStoreName] = useState('')
    const [totalAmount, setTotalAmount] = useState('')
    const [purchaseDate, setPurchaseDate] = useState('')
    const [notes, setNotes] = useState('')

    const showToast = (type: 'success' | 'error', message: string) => {
        setToast({ type, message })
        setTimeout(() => setToast({ type: null, message: '' }), 3000)
    }

    useEffect(() => {
        async function fetchReceipt() {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login')
                return
            }

            const { data, error } = await supabase
                .from('receipts')
                .select(`
                    id,
                    store_name,
                    purchase_date,
                    total_amount,
                    notes,
                    created_at,
                    primary_file:receipt_files!receipts_primary_file_id_fkey(
                        id,
                        bucket_id,
                        path,
                        mime_type,
                        size_bytes
                    )
                `)
                .eq('id', id)
                .single()

            if (error) {
                console.error('Error fetching receipt:', error)
                showToast('error', 'No se pudo cargar el recibo. Intenta de nuevo.')
                setLoading(false)
                return
            }

            if (data) {
                const row = data as ReceiptRowQuery
                const primaryFile = Array.isArray(row.primary_file)
                    ? row.primary_file[0] ?? null
                    : row.primary_file ?? null

                const normalized: ReceiptRow = { ...row, primary_file: primaryFile }

                setReceipt(normalized)
                setStoreName(row.store_name || '')
                setTotalAmount(row.total_amount?.toString() || '')
                setPurchaseDate(row.purchase_date || '')
                setNotes(row.notes || '')

                if (normalized.primary_file?.path) {
                    const { data: urlData, error: urlError } = await supabase.storage
                        .from('receipts')
                        .createSignedUrl(normalized.primary_file.path, 60 * 60)

                    if (urlError) {
                        console.warn('Failed to create signed URL for receipt image:', urlError)
                    } else {
                        setImageUrl(urlData.signedUrl)
                    }
                }
            }
            setLoading(false)
        }
        fetchReceipt()
    }, [id, router, supabase])

    const handleSave = async () => {
        // Optimistic update: Show success immediately
        showToast('success', 'Changes saved!')
        setSaving(true)
        
        // Navigate immediately (optimistic)
        router.push('/receipts')
        
        // Background save
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
            
            if (error) {
                // Revert: Go back and show error
                router.back()
                showToast('error', 'No se pudo guardar. Intenta de nuevo.')
            }
        } catch {
            router.back()
            showToast('error', 'Error de red. Intenta de nuevo.')
        }
        setSaving(false)
    }

    const handleDelete = async () => {
        if (!confirm('¿Seguro que quieres eliminar este recibo? Esto no se puede deshacer.')) return

        // Optimistic update: Navigate immediately
        setDeleting(true)
        showToast('success', 'Recibo eliminado')
        router.push('/receipts')
        
        // Background delete
        try {
            const { error: dbError } = await supabase
                .from('receipts')
                .delete()
                .eq('id', id)

            if (dbError) {
                showToast('error', 'No se pudo eliminar. Intenta de nuevo.')
                return
            }

            router.refresh()
        } catch {
            showToast('error', 'Error de red al eliminar.')
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
                    <p className="text-lg font-bold mb-4">Recibo no encontrado</p>
                    <Link href="/receipts" className="underline">Volver a recibos</Link>
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
                        <h1 className="text-2xl font-bold tracking-tighter">Editar recibo</h1>
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
                        {saving ? 'Guardando...' : 'Guardar cambios'}
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
                        <div className="relative w-full h-[600px] max-w-[560px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                            <Image
                                src={imageUrl}
                                alt="Recibo"
                                fill
                                sizes="(max-width: 1024px) 100vw, 50vw"
                                className="object-contain"
                            />
                        </div>
                    ) : (
                        <div className="text-neutral-400">Sin imagen</div>
                    )}
                </div>

                {/* Right: Edit Form */}
                <div className="bg-white p-8">
                    <h2 className="text-lg font-bold uppercase tracking-wider mb-6 flex items-center gap-2">
                        <Tag className="h-5 w-5" />
                        Detalles del recibo
                    </h2>

                    <div className="space-y-6">
                        {/* Store Name */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                                Tienda
                            </label>
                            <input
                                type="text"
                                value={storeName}
                                onChange={(e) => setStoreName(e.target.value)}
                                placeholder="Nombre de la tienda"
                                className="w-full px-4 py-3 border border-black font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Amount */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                                Importe total
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
                                Fecha de compra
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
                                Notas
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Agrega notas adicionales..."
                                rows={4}
                                className="w-full px-4 py-3 border border-black resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Meta Info */}
                    <div className="mt-8 pt-6 border-t border-black">
                        <p className="text-xs text-neutral-500 font-mono">
                            Subido: {new Date(receipt.created_at).toLocaleString('es-MX')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Toast Notifications */}
            <AnimatePresence>
                {toast.type && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 50, x: '-50%' }}
                        className={`fixed bottom-6 left-1/2 px-6 py-3 font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2 z-50 ${
                            toast.type === 'success' ? 'bg-green-400 text-black' : 'bg-red-400 text-black'
                        }`}
                    >
                        {toast.type === 'success' ? (
                            <Check className="w-5 h-5" />
                        ) : (
                            <AlertCircle className="w-5 h-5" />
                        )}
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>
        </DashboardShell>
    )
}
