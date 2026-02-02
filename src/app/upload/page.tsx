'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import DashboardShell from '@/components/layout/DashboardShell'
import ReceiptUpload from '@/components/receipts/ReceiptUpload'
import { ArrowLeft, Upload, FileText, Sparkles, Camera, Image } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

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
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const
    }
  }
}

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const
    }
  }
}

export default function UploadPage() {
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login')
            }
        }
        checkAuth()
    }, [router, supabase])

    return (
        <DashboardShell>
            <motion.div
                initial="hidden"
                animate="visible"
                variants={containerVariants}
            >
                {/* Header */}
                <motion.div 
                    className="flex items-center gap-4 p-6 border-b border-black bg-white"
                    variants={itemVariants}
                >
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Link 
                            href="/dashboard" 
                            className="p-2 hover:bg-neutral-100 border border-black transition-colors inline-flex"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </motion.div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tighter">Subir Recibo</h1>
                        <p className="text-sm text-neutral-500 mt-1">Agrega un nuevo gasto a tus registros</p>
                    </div>
                </motion.div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100vh-180px)]">
                    {/* Left: Upload Area */}
                    <motion.div 
                        className="bg-white p-8 flex flex-col"
                        variants={itemVariants}
                    >
                        <ReceiptUpload />
                    </motion.div>

                    {/* Right: Instructions */}
                    <motion.div 
                        className="bg-neutral-50 border-l border-black p-8"
                        variants={itemVariants}
                    >
                        <motion.div 
                            className="flex items-center gap-2 mb-6"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <div className="h-10 w-10 bg-black flex items-center justify-center">
                                <FileText className="h-5 w-5 text-white" />
                            </div>
                            <h3 className="text-lg font-bold">Cómo funciona</h3>
                        </motion.div>

                        <div className="space-y-6">
                            {[
                                {
                                    step: "1",
                                    icon: Camera,
                                    title: "Subir Imagen",
                                    description: "Toma una foto o selecciona una imagen existente de tu recibo. Asegúrate de que el texto sea claramente visible.",
                                    delay: 0.4
                                },
                                {
                                    step: "2",
                                    icon: Sparkles,
                                    title: "Extracción IA",
                                    description: "Nuestra IA lee automáticamente el recibo y extrae el nombre de la tienda, fecha y monto total.",
                                    delay: 0.5
                                },
                                {
                                    step: "3",
                                    icon: FileText,
                                    title: "Agregar Detalles",
                                    description: "Revisa la información extraída y agrega una categoría. Haz correcciones si es necesario.",
                                    delay: 0.6
                                }
                            ].map((item) => (
                                <motion.div 
                                    key={item.step}
                                    className="flex gap-4 group"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: item.delay }}
                                    whileHover={{ x: 5 }}
                                >
                                    <motion.div 
                                        className="h-10 w-10 bg-black text-white flex items-center justify-center font-bold text-sm flex-shrink-0 group-hover:bg-swiss-blue transition-colors"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <item.icon className="h-4 w-4" />
                                    </motion.div>
                                    <div>
                                        <h4 className="font-bold group-hover:text-swiss-blue transition-colors">{item.title}</h4>
                                        <p className="text-sm text-neutral-600 leading-relaxed">{item.description}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Tips Card */}
                        <motion.div 
                            className="mt-8 p-6 border border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                            variants={cardVariants}
                            whileHover={{ 
                                y: -4, 
                                boxShadow: "6px 6px 0px 0px rgba(0,0,0,1)" 
                            }}
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <div className="h-8 w-8 bg-swiss-green flex items-center justify-center">
                                    <Image className="h-4 w-4 text-white" />
                                </div>
                                <p className="font-bold">Consejos Pro</p>
                            </div>
                            <ul className="space-y-2 text-sm text-neutral-600">
                                <li className="flex items-start gap-2">
                                    <span className="text-swiss-green font-bold">•</span>
                                    Asegúrate de tener buena iluminación al tomar fotos
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-swiss-green font-bold">•</span>
                                    Mantén el recibo plano y sin arrugas
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-swiss-green font-bold">•</span>
                                    Todo el texto debe ser claramente legible
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-swiss-green font-bold">•</span>
                                    Soportado: JPG, PNG, PDF (máx 10MB)
                                </li>
                            </ul>
                        </motion.div>

                        {/* Security Note */}
                        <motion.div 
                            className="mt-6 p-4 border border-black/20 bg-white/50"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                        >
                            <p className="text-xs text-neutral-500 leading-relaxed">
                                <span className="font-bold text-black">🔒 Almacenamiento Seguro:</span> Tus recibos están encriptados y almacenados de forma segura. Solo tú puedes acceder a ellos.
                            </p>
                        </motion.div>
                    </motion.div>
                </div>
            </motion.div>
        </DashboardShell>
    )
}
