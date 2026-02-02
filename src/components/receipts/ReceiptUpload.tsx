'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Upload, X, Sparkles, CheckCircle, AlertTriangle, Package, Trash2, ShoppingCart, Calendar, Store, DollarSign, ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import CategoryManager from '@/components/categories/CategoryManager'
import { scanReceipt, type ScanResult, type ReceiptItem } from '@/actions/scan-receipt'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

type ScanState = 'idle' | 'scanning' | 'success' | 'partial' | 'error'

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
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No autenticado')

            const fileExt = file.name.split('.').pop()
            const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('receipts')
                .upload(fileName, file)
            if (uploadError) throw uploadError

            const { data: receiptData, error: dbError } = await supabase
                .from('receipts')
                .insert({
                    user_id: user.id,
                    store_name: storeName,
                    total_amount: parseFloat(amount),
                    purchase_date: date,
                    image_url: fileName,
                    category_id: categoryId
                })
                .select('id')
                .single()
            if (dbError) throw dbError

            if (scannedItems.length > 0 && receiptData?.id) {
                await supabase.from('receipt_items').insert(
                    scannedItems.map(item => ({
                        receipt_id: receiptData.id,
                        user_id: user.id,
                        name: item.name,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        total_price: item.total_price
                    }))
                )
            }

            handleClose()
            router.push('/receipts')
            router.refresh()
        } catch (error) {
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
                className="w-full py-8 border-2 border-dashed border-neutral-300 hover:border-black bg-white hover:bg-neutral-50 transition-all flex flex-col items-center justify-center gap-4 group"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
            >
                <div className="h-16 w-16 bg-black group-hover:scale-110 transition-transform flex items-center justify-center">
                    <Upload className="w-8 h-8 text-white" />
                </div>
                <div className="text-center">
                    <p className="font-bold text-xl text-black">Subir Recibo</p>
                    <p className="text-neutral-500">Arrastra o haz clic</p>
                </div>
            </motion.button>

            {/* Fullscreen Modal */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-neutral-100"
                    >
                        {/* Header */}
                        <div className="h-14 bg-white border-b border-neutral-200 flex items-center px-6">
                            <button
                                onClick={handleClose}
                                className="flex items-center gap-2 text-neutral-600 hover:text-black transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                                <span className="font-medium">Cancelar</span>
                            </button>
                            <h1 className="flex-1 text-center font-bold text-lg">Nuevo Recibo</h1>
                            <div className="w-24" />
                        </div>

                        {/* Content */}
                        <div className="h-[calc(100vh-3.5rem)] overflow-auto">
                            {!preview ? (
                                /* Upload Zone - Centered */
                                <div className="h-full flex items-center justify-center p-8 bg-neutral-100">
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        onClick={() => fileInputRef.current?.click()}
                                        onDrop={handleDrop}
                                        onDragOver={(e) => e.preventDefault()}
                                        className="w-full max-w-lg aspect-square border-2 border-dashed border-neutral-400 hover:border-black bg-white hover:bg-neutral-50 transition-all cursor-pointer flex flex-col items-center justify-center gap-6 rounded-lg"
                                    >
                                        <div className="h-20 w-20 bg-black flex items-center justify-center">
                                            <Upload className="w-10 h-10 text-white" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-black mb-2">Arrastra tu recibo aquí</p>
                                            <p className="text-neutral-500">o haz clic para seleccionar</p>
                                            <p className="text-sm text-neutral-400 mt-4">JPG, PNG • Máximo 10MB</p>
                                        </div>
                                    </motion.div>
                                </div>
                            ) : (
                                /* Split View - Image Left, Form Right */
                                <div className="h-full grid grid-cols-1 lg:grid-cols-2">
                                    {/* LEFT COLUMN: Image + Items */}
                                    <div className="flex flex-col bg-neutral-800 h-full">
                                        {/* Image Area */}
                                        <div className="flex-1 relative min-h-0 p-4">
                                            <div className="relative w-full h-full">
                                                <Image
                                                    src={preview}
                                                    alt="Recibo"
                                                    fill
                                                    className={cn(
                                                        "object-contain",
                                                        isScanning && "opacity-50 blur-sm"
                                                    )}
                                                />

                                                {/* Scanning Overlay */}
                                                {isScanning && (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className="bg-white px-8 py-5 shadow-xl">
                                                            <div className="flex items-center gap-4">
                                                                <Sparkles className="w-6 h-6 animate-pulse text-black" />
                                                                <div>
                                                                    <p className="font-bold text-black">Analizando con IA...</p>
                                                                    <div className="w-40 h-2 bg-neutral-200 mt-2 rounded-full overflow-hidden">
                                                                        <motion.div
                                                                            className="h-full bg-black"
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
                                                        <div className="bg-white p-6 max-w-sm">
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                                                <span className="font-bold text-black">Error de lectura</span>
                                                            </div>
                                                            <p className="text-sm text-neutral-600 mb-4">{scanError?.message}</p>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => file && handleScan(file)}
                                                                    className="flex-1 py-2 bg-black text-white text-sm font-bold hover:bg-neutral-800"
                                                                >
                                                                    Reintentar
                                                                </button>
                                                                <button
                                                                    onClick={() => { setManualMode(true); setScanState('idle') }}
                                                                    className="flex-1 py-2 border-2 border-black text-black text-sm font-bold hover:bg-neutral-100"
                                                                >
                                                                    Manual
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Items Panel - White Background */}
                                        {scannedItems.length > 0 && (
                                            <div className="bg-white border-t-4 border-black flex flex-col max-h-[45%]">
                                                {/* Header */}
                                                <div className="px-4 py-3 bg-black text-white flex items-center justify-between flex-shrink-0">
                                                    <div className="flex items-center gap-2">
                                                        <ShoppingCart className="w-4 h-4" />
                                                        <span className="font-bold text-sm uppercase tracking-wide">
                                                            {scannedItems.length} Productos
                                                        </span>
                                                    </div>
                                                    <span className="font-mono font-bold">${itemsTotal.toFixed(2)}</span>
                                                </div>

                                                {/* List */}
                                                <div className="overflow-y-auto flex-1 bg-white">
                                                    {scannedItems.map((item, index) => (
                                                        <div
                                                            key={index}
                                                            className="px-4 py-3 flex items-center gap-3 border-b border-neutral-100 hover:bg-neutral-50 group"
                                                        >
                                                            <div className="w-9 h-9 bg-neutral-100 flex items-center justify-center flex-shrink-0 rounded">
                                                                <Package className="w-4 h-4 text-neutral-500" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium text-sm text-black truncate">
                                                                    {item.name || 'Producto sin nombre'}
                                                                </p>
                                                                <p className="text-xs text-neutral-500">
                                                                    {item.quantity > 1 ? `${item.quantity} × $${item.unit_price.toFixed(2)}` : `Unitario: $${item.unit_price.toFixed(2)}`}
                                                                </p>
                                                            </div>
                                                            <span className="font-mono font-bold text-black">
                                                                ${item.total_price.toFixed(2)}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveItem(index)}
                                                                className="p-1.5 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* RIGHT COLUMN: Form */}
                                    <div className="bg-white p-8 overflow-y-auto border-l border-neutral-200">
                                        <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-6">
                                            {/* Status Banner */}
                                            {!isScanning && (scanState === 'success' || scanState === 'partial' || manualMode) && (
                                                <div className={cn(
                                                    "px-4 py-3 flex items-center gap-2 text-sm rounded",
                                                    scanState === 'success' ? "bg-green-50 text-green-800 border border-green-200" : "bg-amber-50 text-amber-800 border border-amber-200"
                                                )}>
                                                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                                    <span>
                                                        {scanState === 'success'
                                                            ? `Datos extraídos correctamente • ${scannedItems.length} productos`
                                                            : manualMode ? 'Ingresa los datos manualmente' : 'Algunos datos requieren verificación'}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Store Name */}
                                            <div>
                                                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                                                    <Store className="w-3 h-3" />
                                                    Tienda *
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={storeName}
                                                    onChange={(e) => setStoreName(e.target.value)}
                                                    placeholder="HEB, Walmart, Oxxo..."
                                                    disabled={isScanning}
                                                    className="w-full px-4 py-3 border-2 border-neutral-300 text-black font-medium focus:outline-none focus:border-black disabled:opacity-50 disabled:bg-neutral-100 transition-colors"
                                                />
                                            </div>

                                            {/* Date & Amount */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                                                        <Calendar className="w-3 h-3" />
                                                        Fecha *
                                                    </label>
                                                    <input
                                                        type="date"
                                                        required
                                                        value={date}
                                                        onChange={(e) => setDate(e.target.value)}
                                                        disabled={isScanning}
                                                        className="w-full px-4 py-3 border-2 border-neutral-300 text-black font-mono focus:outline-none focus:border-black disabled:opacity-50 disabled:bg-neutral-100 transition-colors"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                                                        <DollarSign className="w-3 h-3" />
                                                        Total *
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        required
                                                        value={amount}
                                                        onChange={(e) => setAmount(e.target.value)}
                                                        disabled={isScanning}
                                                        placeholder="0.00"
                                                        className="w-full px-4 py-3 border-2 border-neutral-300 text-black font-mono text-xl font-bold focus:outline-none focus:border-black disabled:opacity-50 disabled:bg-neutral-100 transition-colors"
                                                    />
                                                </div>
                                            </div>

                                            {/* Category */}
                                            <div className="pt-4 border-t border-neutral-200">
                                                <CategoryManager
                                                    selectedId={categoryId || undefined}
                                                    onSelect={setCategoryId}
                                                />
                                            </div>

                                            {/* Submit Button */}
                                            <button
                                                type="submit"
                                                disabled={!canSubmit}
                                                className={cn(
                                                    "w-full py-4 font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2",
                                                    canSubmit
                                                        ? "bg-black text-white hover:bg-neutral-800"
                                                        : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
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
                                                        Guardar Recibo
                                                    </>
                                                )}
                                            </button>

                                            {/* Change Image Link */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    resetAll()
                                                    fileInputRef.current?.click()
                                                }}
                                                className="w-full py-3 text-sm text-neutral-500 hover:text-black transition-colors underline"
                                            >
                                                Cambiar imagen
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </div>

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
