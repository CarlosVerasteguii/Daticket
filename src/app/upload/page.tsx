import ReceiptUpload from '@/components/receipts/ReceiptUpload'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function UploadPage() {
    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Dashboard
                    </Link>
                </div>

                <ReceiptUpload />
            </div>
        </div>
    )
}
