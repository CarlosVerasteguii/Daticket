'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Upload, Sparkles, CheckCircle, AlertTriangle, Package, Trash2, ShoppingCart, ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import CategoryManager from '@/components/categories/CategoryManager'
import { scanReceipt, type ScanResult, type ReceiptItem } from '@/actions/scan-receipt'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

type ScanState = 'idle' | 'scanning' | 'success' | 'partial' | 'error'

function getFileExtension(file: File): string {
    const mime = file.type.toLowerCase()

    if (mime === 'image/jpeg') return 'jpg'
    if (mime === 'image/png') return 'png'
    if (mime === 'image/webp') return 'webp'
    if (mime === 'image/gif') return 'gif'
    if (mime === 'image/heic') return 'heic'
    if (mime === 'image/heif') return 'heif'

    const fromName = file.name.split('.').pop()?.trim().toLowerCase()
    if (fromName) return fromName

    return 'jpg'
}

export default function ReceiptUpload() {
    const [isOpen, setIsOpen] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [uploading, setUploading] = useState(false)
    const [scanState, setScanState] = useState<ScanState>('idle')
    const [scanError, setScanError] = useState<ScanResult['error'] | null>(null)
    const [storeName, setStoreName] = useState('')
    const [amount, setAmount] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [categoryId, setCategoryId] = useState<string | null>(null)
    const [scanProgress, setScanProgress] = useState(0)
    const [manualMode, setManualMode] = useState(false)
    const [scannedItems, setScannedItems] = useState<ReceiptItem[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()
    const supabase = createClient()

    const resetAll = () => {
        setFile(null)
        setPreview(null)
        setStoreName('')
        setAmount('')
        setDate(new Date().toISOString().split('T')[0])
        setCategoryId(null)
        setScanProgress(0)
        setScanState('idle')
        setScanError(null)
        setManualMode(false)
        setScannedItems([])
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleClose = () => {
        resetAll()
        setIsOpen(false)
    }

    const handleScan = async (fileToScan: File) => {
        setScanState('scanning')
        setScanProgress(0)
        setScanError(null)
        setScannedItems([])

        const progressInterval = setInterval(() => {
            setScanProgress(prev => Math.min(prev + 5, 85))
        }, 300)

        try {
            const formData = new FormData()
            formData.append('file', fileToScan)
            const result = await scanReceipt(formData)

            clearInterval(progressInterval)
            setScanProgress(100)

            if (result.success && result.data) {
                if (result.data.store_name) setStoreName(result.data.store_name)
                if (result.data.total_amount) setAmount(result.data.total_amount.toString())
                if (result.data.purchase_date) setDate(result.data.purchase_date)
                if (result.data.items?.length) setScannedItems(result.data.items)

                const hasData = result.data.store_name || result.data.total_amount || result.data.purchase_date
                if (!hasData) {
                    setScanState('partial')
                    setManualMode(true)
                } else {
                    setScanState(result.partial ? 'partial' : 'success')
                }
            } else {
                setScanError(result.error || { code: 'UNKNOWN', message: 'Error desconocido', retryable: true })
                setScanState('error')
            }
        } catch (error) {
            clearInterval(progressInterval)
            setScanError({
                code: 'UNKNOWN',
                message: error instanceof Error ? error.message : 'Error inesperado',
                retryable: true
            })
            setScanState('error')
        } finally {
            setTimeout(() => setScanProgress(0), 500)
        }
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return
        if (selectedFile.size > 10 * 1024 * 1024) {
            alert('El archivo debe ser menor a 10MB')
            return
        }
        setFile(selectedFile)
        setPreview(URL.createObjectURL(selectedFile))
        handleScan(selectedFile)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        const droppedFile = e.dataTransfer.files[0]
        if (droppedFile?.type.startsWith('image/')) {
            if (droppedFile.size > 10 * 1024 * 1024) {
                alert('El archivo debe ser menor a 10MB')
                return
            }
            setFile(droppedFile)
            setPreview(URL.createObjectURL(droppedFile))
            handleScan(droppedFile)
        }
    }

    const handleRemoveItem = (index: number) => {
        setScannedItems(prev => prev.filter((_, i) => i !== index))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file || !storeName || !amount) return

        setUploading(true)
        let receiptId: string | null = null
        let uploadedPath: string | null = null
        let receiptFileId: string | null = null
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No autenticado')

            const { data: receiptData, error: receiptError } = await supabase
                .from('receipts')
                .insert({
                    user_id: user.id,
                    store_name: storeName,
                    total_amount: parseFloat(amount),
                    purchase_date: date || null,
                    category_id: categoryId
                })
                .select('id')
                .single()
            if (receiptError) throw receiptError
            receiptId = receiptData.id

            const ext = getFileExtension(file)
            uploadedPath = `${user.id}/${receiptId}/original-${Date.now()}.${ext}`

            const { error: uploadError } = await supabase.storage
                .from('receipts')
                .upload(uploadedPath, file, { contentType: file.type || undefined })
            if (uploadError) throw uploadError

            const { data: receiptFile, error: fileError } = await supabase
                .from('receipt_files')
                .insert({
                    receipt_id: receiptId,
                    user_id: user.id,
                    bucket_id: 'receipts',
                    path: uploadedPath,
                    kind: 'original',
                    mime_type: file.type || null,
                    size_bytes: file.size,
                })
                .select('id')
                .single()
            if (fileError) throw fileError
            receiptFileId = receiptFile.id

            const { error: linkError } = await supabase
                .from('receipts')
                .update({ primary_file_id: receiptFileId })
                .eq('id', receiptId)
            if (linkError) throw linkError

            // Fire-and-forget: server-side thumbnail generation (best-effort).
            const { data: { session } } = await supabase.auth.getSession()
            const accessToken = session?.access_token

            void supabase.functions
                .invoke('generate-receipt-thumbnail-v3', {
                    body: { receipt_id: receiptId, access_token: accessToken },
                    headers: accessToken ? { authorization: `Bearer ${accessToken}` } : undefined,
                })
                .then(({ error }) => {
                    if (error) console.warn('Thumbnail generation failed:', error)
                })
                .catch((err) => console.warn('Thumbnail generation failed:', err))

            if (scannedItems.length > 0) {
                const { error: itemsError } = await supabase.from('receipt_items').insert(
                    scannedItems.map(item => ({
                        receipt_id: receiptId,
                        user_id: user.id,
                        name: item.name,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        total_price: item.total_price
                    }))
                )

                if (itemsError) {
                    console.warn('Failed to insert receipt items:', itemsError)
                }
            }

            handleClose()
            router.push('/receipts')
            router.refresh()
        } catch (error) {
            try {
                if (receiptId) {
                    await supabase.from('receipts').delete().eq('id', receiptId)
                }
                if (uploadedPath && !receiptFileId) {
                    await supabase.storage.from('receipts').remove([uploadedPath])
                }
            } catch (cleanupError) {
                console.warn('Receipt upload cleanup failed:', cleanupError)
            }
            alert('Error: ' + (error instanceof Error ? error.message : 'Desconocido'))
        } finally {
            setUploading(false)
        }
    }

    const isScanning = scanState === 'scanning'
    const itemsTotal = scannedItems.reduce((sum, item) => sum + item.total_price, 0)
    const canSubmit = file && storeName && amount && !uploading && !isScanning

    return (
        <>
            {/* Trigger Button */}
            <motion.button
                onClick={() => setIsOpen(true)}
                className="w-full py-8 border-2 border-dashed border-foreground/30 hover:border-foreground bg-background hover:bg-foreground/5 transition-all flex flex-col items-center justify-center gap-4 group"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
            >
                <div className="h-16 w-16 bg-swiss-blue group-hover:scale-110 transition-transform flex items-center justify-center">
                    <Upload className="w-8 h-8 text-white" />
                </div>
                <div className="text-center">
                    <p className="font-bold text-xl text-foreground">Subir Recibo</p>
                    <p className="text-foreground/60">Arrastra o haz clic</p>
                </div>
            </motion.button>

            {/* Fullscreen Modal */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-background flex flex-col"
                    >
                        {/* Header */}
                        <div className="h-14 bg-background border-b border-foreground/20 flex items-center px-6 flex-shrink-0">
                            <button
                                onClick={handleClose}
                                className="flex items-center gap-2 text-foreground/60 hover:text-foreground transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                                <span className="font-medium">Cancelar</span>
                            </button>
                            <h1 className="flex-1 text-center font-bold text-lg text-foreground">Nuevo Recibo</h1>
                            <div className="w-24" />
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 overflow-auto">
                            {!preview ? (
                                /* Upload Zone */
                                <div className="min-h-full flex items-center justify-center p-8">
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        onClick={() => fileInputRef.current?.click()}
                                        onDrop={handleDrop}
                                        onDragOver={(e) => e.preventDefault()}
                                        className="w-full max-w-lg aspect-square border-2 border-dashed border-foreground/40 hover:border-foreground bg-background hover:bg-foreground/5 transition-all cursor-pointer flex flex-col items-center justify-center gap-6 rounded-lg"
                                    >
                                        <div className="h-20 w-20 bg-swiss-blue flex items-center justify-center">
                                            <Upload className="w-10 h-10 text-white" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-foreground mb-2">Arrastra tu recibo aquí</p>
                                            <p className="text-foreground/60">o haz clic para seleccionar</p>
                                            <p className="text-sm text-foreground/40 mt-4">JPG, PNG • Máximo 10MB</p>
                                        </div>
                                    </motion.div>
                                </div>
                            ) : (
                                /* Split View: Image Left | Items Right */
                                <div className="h-full grid grid-cols-1 lg:grid-cols-2">
                                    {/* LEFT: Image Only */}
                                    <div className="bg-neutral-800 relative min-h-[400px] lg:min-h-full">
                                        <Image
                                            src={preview}
                                            alt="Recibo"
                                            fill
                                            className={cn(
                                                "object-contain p-6",
                                                isScanning && "opacity-50 blur-sm"
                                            )}
                                        />

                                        {/* Scanning Overlay */}
                                        {isScanning && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="bg-background px-8 py-5 shadow-xl rounded-lg">
                                                    <div className="flex items-center gap-4">
                                                        <Sparkles className="w-6 h-6 animate-pulse text-foreground" />
                                                        <div>
                                                            <p className="font-bold text-foreground">Analizando con IA...</p>
                                                            <div className="w-40 h-2 bg-foreground/20 mt-2 rounded-full overflow-hidden">
                                                                <motion.div
                                                                    className="h-full bg-foreground"
                                                                    animate={{ width: `${scanProgress}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Error Overlay */}
                                        {scanState === 'error' && !manualMode && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                                                <div className="bg-background p-6 max-w-sm rounded-lg">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <AlertTriangle className="w-5 h-5 text-red-500" />
                                                        <span className="font-bold text-foreground">Error de lectura</span>
                                                    </div>
                                                    <p className="text-sm text-foreground/60 mb-4">{scanError?.message}</p>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => file && handleScan(file)}
                                                            className="flex-1 py-2 bg-foreground text-background text-sm font-bold hover:bg-foreground/80 rounded"
                                                        >
                                                            Reintentar
                                                        </button>
                                                        <button
                                                            onClick={() => { setManualMode(true); setScanState('idle') }}
                                                            className="flex-1 py-2 border-2 border-foreground text-foreground text-sm font-bold hover:bg-foreground/10 rounded"
                                                        >
                                                            Manual
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Change Image Button */}
                                        <button
                                            onClick={() => {
                                                resetAll()
                                                fileInputRef.current?.click()
                                            }}
                                            className="absolute bottom-4 left-4 px-4 py-2 bg-black/70 hover:bg-black text-white text-sm font-medium rounded transition-colors"
                                        >
                                            Cambiar imagen
                                        </button>
                                    </div>

                                    {/* RIGHT: Items List */}
                                    <div className="bg-background border-l border-foreground/20 flex flex-col h-full">
                                        {/* Header */}
                                        <div className="px-6 py-4 border-b border-foreground/20 flex items-center justify-between flex-shrink-0">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-foreground flex items-center justify-center rounded">
                                                    <ShoppingCart className="w-5 h-5 text-background" />
                                                </div>
                                                <div>
                                                    <h2 className="font-bold text-foreground text-lg">Productos</h2>
                                                    <p className="text-sm text-foreground/60">
                                                        {scannedItems.length > 0
                                                            ? `${scannedItems.length} items detectados`
                                                            : isScanning ? 'Analizando...' : 'Sin productos'}
                                                    </p>
                                                </div>
                                            </div>
                                            {scannedItems.length > 0 && (
                                                <div className="text-right">
                                                    <p className="text-sm text-foreground/60">Total</p>
                                                    <p className="font-mono font-bold text-xl text-foreground">${itemsTotal.toFixed(2)}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Items List */}
                                        <div className="flex-1 overflow-y-auto">
                                            {scannedItems.length > 0 ? (
                                                <div className="divide-y divide-foreground/10">
                                                    {scannedItems.map((item, index) => (
                                                        <div
                                                            key={index}
                                                            className="px-6 py-4 flex items-center gap-4 hover:bg-foreground/5 group"
                                                        >
                                                            <div className="w-10 h-10 bg-foreground/10 flex items-center justify-center flex-shrink-0 rounded">
                                                                <Package className="w-5 h-5 text-foreground/40" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium text-foreground truncate">
                                                                    {item.name || 'Producto sin nombre'}
                                                                </p>
                                                                <p className="text-sm text-foreground/60">
                                                                    {item.quantity > 1
                                                                        ? `${item.quantity} × $${item.unit_price.toFixed(2)}`
                                                                        : `Unitario: $${item.unit_price.toFixed(2)}`}
                                                                </p>
                                                            </div>
                                                            <span className="font-mono font-bold text-lg text-foreground">
                                                                ${item.total_price.toFixed(2)}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveItem(index)}
                                                                className="p-2 text-foreground/30 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded opacity-0 group-hover:opacity-100 transition-all"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="h-full flex items-center justify-center text-foreground/40">
                                                    {isScanning ? (
                                                        <div className="flex items-center gap-3">
                                                            <Sparkles className="w-5 h-5 animate-pulse" />
                                                            <span>Detectando productos...</span>
                                                        </div>
                                                    ) : (
                                                        <p>Los productos aparecerán aquí</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Bottom Bar - Fixed Form */}
                        {preview && (
                            <form onSubmit={handleSubmit} className="flex-shrink-0 border-t border-neutral-700">
                                <div className="bg-neutral-900 dark:bg-neutral-950 px-6 py-5">
                                    <div className="max-w-5xl mx-auto space-y-4">
                                        {/* Row 1: Main inputs */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {/* Store */}
                                            <div className="col-span-2 md:col-span-1">
                                                <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block font-medium">
                                                    Tienda
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={storeName}
                                                    onChange={(e) => setStoreName(e.target.value)}
                                                    placeholder="HEB, Walmart..."
                                                    disabled={isScanning}
                                                    className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white disabled:opacity-50 rounded-md transition-colors"
                                                />
                                            </div>

                                            {/* Date */}
                                            <div>
                                                <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block font-medium">
                                                    Fecha
                                                </label>
                                                <input
                                                    type="date"
                                                    required
                                                    value={date}
                                                    onChange={(e) => setDate(e.target.value)}
                                                    disabled={isScanning}
                                                    className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:border-white focus:ring-1 focus:ring-white disabled:opacity-50 rounded-md transition-colors"
                                                />
                                            </div>

                                            {/* Total */}
                                            <div>
                                                <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block font-medium">
                                                    Total
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-medium">$</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        required
                                                        value={amount}
                                                        onChange={(e) => setAmount(e.target.value)}
                                                        disabled={isScanning}
                                                        placeholder="0.00"
                                                        className="w-full pl-7 pr-3 py-2.5 bg-neutral-800 border border-neutral-700 text-white font-mono font-bold focus:outline-none focus:border-white focus:ring-1 focus:ring-white disabled:opacity-50 rounded-md transition-colors"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Row 2: Category + Submit */}
                                        <div className="flex flex-wrap items-end gap-4 justify-between">
                                            {/* Category */}
                                            <div className="flex-1 min-w-0">
                                                <label className="text-xs text-neutral-400 uppercase tracking-wider mb-1.5 block font-medium">
                                                    Categoría
                                                </label>
                                                <div className="[&_button]:bg-neutral-800 [&_button]:border-neutral-700 [&_button]:text-white [&_button]:hover:bg-neutral-700 [&_input]:bg-neutral-800 [&_input]:border-neutral-700 [&_input]:text-white [&_input]:placeholder-neutral-500">
                                                    <CategoryManager
                                                        selectedId={categoryId || undefined}
                                                        onSelect={setCategoryId}
                                                        compact
                                                    />
                                                </div>
                                            </div>

                                            {/* Submit */}
                                            <button
                                                type="submit"
                                                disabled={!canSubmit}
                                                className={cn(
                                                    "px-8 py-2.5 font-bold uppercase tracking-wider transition-all flex items-center gap-2 rounded-md flex-shrink-0",
                                                    canSubmit
                                                        ? "bg-white text-black hover:bg-neutral-200"
                                                        : "bg-neutral-700 text-neutral-500 cursor-not-allowed"
                                                )}
                                            >
                                                {uploading ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        Guardando...
                                                    </>
                                                ) : isScanning ? (
                                                    <>
                                                        <Sparkles className="w-4 h-4 animate-pulse" />
                                                        Analizando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle className="w-4 h-4" />
                                                        Guardar
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileSelect}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
