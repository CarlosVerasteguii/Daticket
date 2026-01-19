import ReceiptList from '@/components/receipts/ReceiptList'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default function ReceiptsPage() {
    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">My Receipts</h1>
                    <Link
                        href="/upload"
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        New Receipt
                    </Link>
                </div>

                <ReceiptList />
            </div>
        </div>
    )
}
