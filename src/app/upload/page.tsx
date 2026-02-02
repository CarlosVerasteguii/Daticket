'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import DashboardShell from '@/components/layout/DashboardShell'
import ReceiptUpload from '@/components/receipts/ReceiptUpload'

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
            <div className="p-8">
                <div className="max-w-xl mx-auto">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold tracking-tight mb-2">Subir Recibo</h1>
                        <p className="text-foreground/60">Agrega un nuevo gasto a tus registros</p>
                    </div>
                    <ReceiptUpload />
                </div>
            </div>
        </DashboardShell>
    )
}
