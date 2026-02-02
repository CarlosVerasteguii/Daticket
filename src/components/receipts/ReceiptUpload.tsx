'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Upload, X, Sparkles, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react'
import Image from 'next/image'
import CategoryManager from '@/components/categories/CategoryManager'
import { scanReceipt, type ScanResult } from '@/actions/scan-receipt'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

type ScanState = 'idle' | 'scanning' | 'success' | 'partial' | 'error'

export default function ReceiptUpload() {
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [uploading, setUploading] = useState(false)
    const [scanState, setScanState] = useState<ScanState>('idle')
    const [scanError, setScanError] = useState<ScanResult['error'] | null>(null)
    const [scanConfidence, setScanConfidence] = useState<'high' | 'medium' | 'low' | null>(null)
    const [storeName, setStoreName] = useState('')
    const [amount, setAmount] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [categoryId, setCategoryId] = useState<string | null>(null)
    const [scanProgress, setScanProgress] = useState(0)
    const [manualMode, setManualMode] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()
    const supabase = createClient()

    const handleClear = () => {
        setFile(null)
        setPreview(null)
        setStoreName('')
        setAmount('')
        setScanProgress(0)
        setScanState('idle')
        setScanError(null)
        setScanConfidence(null)
        setManualMode(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleScan = async (fileToScan: File) => {
        setScanState('scanning')
        setScanProgress(0)
        setScanError(null)
        setScanConfidence(null)
        
        // Simulate progress
        const progressInterval = setInterval(() => {
            setScanProgress(prev => Math.min(prev + 10, 80))
        }, 200)
        
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
                
                setScanConfidence(result.confidence || 'medium')
                setScanState(result.partial ? 'partial' : 'success')
            } else {
                setScanError(result.error || { code: 'UNKNOWN', message: 'Unknown error', retryable: true })
                setScanState('error')
            }
        } catch (error) {
            console.error("Scan failed", error)
            clearInterval(progressInterval)
            setScanError({
                code: 'UNKNOWN',
                message: error instanceof Error ? error.message : 'An unexpected error occurred',
                retryable: true
            })
            setScanState('error')
        } finally {
            setTimeout(() => {
                setScanProgress(0)
            }, 500)
        }
    }

    const handleRetry = () => {
        if (file) {
            handleScan(file)
        }
    }

    const handleSkipToManual = () => {
        setManualMode(true)
        setScanState('idle')
        setScanError(null)
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0]
            if (selectedFile.size > 10 * 1024 * 1024) {
                alert('El archivo debe ser menor a 10MB')
                return
            }
            setFile(selectedFile)
            setPreview(URL.createObjectURL(selectedFile))
            setManualMode(false)
            handleScan(selectedFile)
        }
    }

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file) return

        setUploading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('User not authenticated')

            const fileExt = file.name.split('.').pop()
            const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('receipts')
                .upload(fileName, file)

            if (uploadError) throw uploadError

            const imageUrl = fileName

            const { error: dbError } = await supabase
                .from('receipts')
                .insert({
                    user_id: user.id,
                    store_name: storeName,
                    total_amount: parseFloat(amount),
                    purchase_date: date,
                    image_url: imageUrl,
                    category_id: categoryId
                })

            if (dbError) throw dbError

            router.push('/receipts')
            router.refresh()
        } catch (error: unknown) {
            alert('Error al subir el recibo: ' + (error instanceof Error ? error.message : 'Error desconocido'))
        } finally {
            setUploading(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        const droppedFile = e.dataTransfer.files[0]
        if (droppedFile && droppedFile.type.startsWith('image/')) {
            if (droppedFile.size > 10 * 1024 * 1024) {
                alert('El archivo debe ser menor a 10MB')
                return
            }
            setFile(droppedFile)
            setPreview(URL.createObjectURL(droppedFile))
            setManualMode(false)
            handleScan(droppedFile)
        }
    }

    const confidenceColors = {
        high: 'bg-swiss-green',
        medium: 'bg-swiss-yellow text-black',
        low: 'bg-swiss-orange'
    }

    const isScanning = scanState === 'scanning'

    return (
        <div className="w-full max-w-lg mx-auto">
            <form onSubmit={handleUpload} className="space-y-6">
                {/* File Input Zone - Swiss Style */}
                <AnimatePresence mode="wait">
                    {!preview ? (
                        <motion.div
                            key="upload"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            onClick={() => fileInputRef.current?.click()}
                            onDrop={handleDrop}
                            onDragOver={(e) => e.preventDefault()}
                            className="group border-2 border-dashed border-black bg-white p-12 text-center cursor-pointer hover:bg-neutral-50 hover:border-swiss-blue transition-all duration-300 relative overflow-hidden"
                        >
                            <motion.div 
                                className="h-16 w-16 bg-black flex items-center justify-center mx-auto mb-4 group-hover:bg-swiss-blue transition-colors"
                                whileHover={{ scale: 1.1, rotate: 5 }}
                            >
                                <Upload className="w-8 h-8 text-white" />
                            </motion.div>
                             <p className="text-black font-bold text-lg mb-2">Arrastra tu recibo aquí</p>
                             <p className="text-sm text-neutral-500 font-mono">o haz clic para buscar archivos</p>
                             <p className="text-xs text-neutral-400 mt-4">JPG, PNG hasta 10MB</p>
                            
                            {/* Hover effect */}
                            <motion.div 
                                className="absolute inset-0 bg-swiss-blue/5 opacity-0 group-hover:opacity-100 transition-opacity"
                                initial={false}
                            />
                            
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="preview"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative border border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                        >
                            <motion.button
                                type="button"
                                onClick={handleClear}
                                className="absolute top-3 right-3 bg-black text-white p-2 hover:bg-swiss-orange transition-colors z-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <X className="w-4 h-4" />
                            </motion.button>
                            
                            <div className="relative h-64 w-full bg-neutral-100">
                                <Image
                                    src={preview}
                                    alt="Receipt preview"
                                    fill
                                    className={cn(
                                        "object-contain transition-all duration-500",
                                        isScanning && "opacity-50 blur-sm scale-105"
                                    )}
                                />
                                
                                {/* Scanning Overlay */}
                                <AnimatePresence>
                                    {isScanning && (
                                        <motion.div 
                                            className="absolute inset-0 flex flex-col items-center justify-center"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            <motion.div 
                                                className="bg-white border-2 border-black px-6 py-4 flex items-center gap-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                                                initial={{ y: 20 }}
                                                animate={{ y: 0 }}
                                            >
                                                <motion.div
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                                >
                                                    <Sparkles className="w-5 h-5 text-swiss-blue" />
                                                </motion.div>
                                                <div>
                                                    <span className="font-bold text-sm uppercase tracking-wider block">Analizando con IA...</span>
                                                    <div className="w-full h-1 bg-neutral-200 mt-2 overflow-hidden">
                                                        <motion.div 
                                                            className="h-full bg-swiss-blue"
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${scanProgress}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Success Indicator */}
                                <AnimatePresence>
                                    {scanState === 'success' && (
                                        <motion.div 
                                            className={cn(
                                                "absolute top-3 left-3 text-white px-3 py-1.5 flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]",
                                                scanConfidence ? confidenceColors[scanConfidence] : 'bg-swiss-green'
                                            )}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                             <span className="text-xs font-bold uppercase">
                                                 {scanConfidence === 'high' ? 'Escaneado' : scanConfidence === 'medium' ? 'Escaneo Parcial' : 'Baja Confianza'}
                                             </span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Partial Match Indicator */}
                                <AnimatePresence>
                                    {scanState === 'partial' && (
                                        <motion.div 
                                            className="absolute top-3 left-3 bg-swiss-yellow text-black px-3 py-1.5 flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            <AlertTriangle className="w-4 h-4" />
                                             <span className="text-xs font-bold uppercase">Coincidencia Parcial</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Error State */}
                                <AnimatePresence>
                                    {scanState === 'error' && !manualMode && (
                                        <motion.div 
                                            className="absolute inset-0 flex items-center justify-center bg-black/50"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            <motion.div 
                                                className="bg-white border-2 border-black p-6 max-w-[280px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                                                initial={{ scale: 0.9, y: 20 }}
                                                animate={{ scale: 1, y: 0 }}
                                            >
                                                 <div className="flex items-center gap-2 mb-3">
                                                     <AlertTriangle className="w-5 h-5 text-swiss-orange" />
                                                     <span className="font-bold text-sm uppercase">Escaneo Fallido</span>
                                                 </div>
                                                 <p className="text-sm text-neutral-600 mb-4">
                                                     {scanError?.message || 'No se pudo extraer los datos del recibo'}
                                                 </p>
                                                <div className="flex gap-2">
                                                    {scanError?.retryable && (
                                                         <motion.button
                                                             type="button"
                                                             onClick={handleRetry}
                                                             className="flex-1 py-2 px-3 bg-black text-white text-xs font-bold uppercase flex items-center justify-center gap-2 hover:bg-neutral-800"
                                                             whileHover={{ scale: 1.02 }}
                                                             whileTap={{ scale: 0.98 }}
                                                         >
                                                             <RefreshCw className="w-3 h-3" />
                                                             Reintentar
                                                         </motion.button>
                                                    )}
                                                     <motion.button
                                                         type="button"
                                                         onClick={handleSkipToManual}
                                                         className="flex-1 py-2 px-3 border-2 border-black text-xs font-bold uppercase hover:bg-neutral-100"
                                                         whileHover={{ scale: 1.02 }}
                                                         whileTap={{ scale: 0.98 }}
                                                     >
                                                         Ingresar Manual
                                                     </motion.button>
                                                </div>
                                            </motion.div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Manual Mode Indicator */}
                                <AnimatePresence>
                                    {manualMode && (
                                        <motion.div 
                                            className="absolute top-3 left-3 bg-neutral-600 text-white px-3 py-1.5 flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0 }}
                                        >
                                             <span className="text-xs font-bold uppercase">Entrada Manual</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Metadata Inputs - Swiss Style */}
                <motion.div 
                    className="space-y-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: preview ? 1 : 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <AnimatePresence>
                        {preview && (scanState !== 'error' || manualMode) && (
                            <>
                                {/* Partial Match Warning */}
                                {scanState === 'partial' && (
                                <motion.div
                                    className="bg-swiss-yellow/20 border border-swiss-yellow p-3 flex items-start gap-3"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                >
                                    <AlertTriangle className="w-4 h-4 text-swiss-yellow mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-neutral-700">
                                        Algunos campos no pudieron ser extraídos. Por favor revisa y completa la información faltante.
                                    </p>
                                </motion.div>
                                )}

                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                >
                                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                                        Nombre de la Tienda
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={storeName}
                                        onChange={(e) => setStoreName(e.target.value)}
                                        placeholder="ej. Walmart"
                                        disabled={isScanning}
                                        className={cn(
                                            "w-full px-4 py-3 border font-medium focus:outline-none focus:ring-2 focus:ring-swiss-blue disabled:bg-neutral-100 disabled:text-neutral-400 transition-all hover:border-neutral-400",
                                            !storeName && scanState === 'partial' ? 'border-swiss-yellow' : 'border-black'
                                        )}
                                    />
                                </motion.div>

                                <motion.div 
                                    className="grid grid-cols-2 gap-4"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                                            Fecha
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            disabled={isScanning}
                                            className="w-full px-4 py-3 border border-black font-mono focus:outline-none focus:ring-2 focus:ring-swiss-blue disabled:bg-neutral-100 transition-all hover:border-neutral-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                                            Monto Total
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 font-mono">$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                disabled={isScanning}
                                                className={cn(
                                                    "w-full pl-8 pr-4 py-3 border font-mono text-xl focus:outline-none focus:ring-2 focus:ring-swiss-blue disabled:bg-neutral-100 transition-all hover:border-neutral-400",
                                                    !amount && scanState === 'partial' ? 'border-swiss-yellow' : 'border-black'
                                                )}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Category Section */}
                <AnimatePresence>
                    {preview && (scanState !== 'error' || manualMode) && (
                        <motion.div 
                            className="border-t border-black pt-6"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            <CategoryManager
                                selectedId={categoryId || undefined}
                                onSelect={setCategoryId}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Submit Button - Swiss Style */}
                <AnimatePresence>
                    {preview && (scanState !== 'error' || manualMode) && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                        >
                            <motion.button
                                type="submit"
                                disabled={!file || uploading || isScanning}
                                className="w-full py-4 bg-black text-white font-bold text-sm uppercase tracking-wider hover:bg-neutral-800 transition-all border border-black disabled:bg-neutral-300 disabled:text-neutral-500 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] hover:-translate-x-0.5 hover:-translate-y-0.5"
                                whileHover={!uploading && !isScanning ? { scale: 1.01 } : {}}
                                whileTap={!uploading && !isScanning ? { scale: 0.99 } : {}}
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 className="animate-spin h-4 w-4" />
                                        Subiendo...
                                    </>
                                ) : isScanning ? (
                                    <>
                                        <Sparkles className="animate-spin h-4 w-4" />
                                        Escaneando...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="h-4 w-4" />
                                        Guardar Recibo
                                    </>
                                )}
                            </motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </form>
        </div>
    )
}
