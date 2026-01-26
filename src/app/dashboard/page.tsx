'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DashboardShell from '@/components/layout/DashboardShell'
import { ArrowUpRight, Plus, FileText, TrendingUp, Clock } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs))
}

export default function DashboardPage() {
    const router = useRouter()
    const supabase = createClient()
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login')
            } else {
                setUser(session.user)
            }
        }
        checkUser()
    }, [router, supabase])

    // Bento Grid Item Component
    const BentoItem = ({ className, title, value, subtitle, icon: Icon, gradient }: any) => (
        <div className={cn(
            "group relative overflow-hidden rounded-3xl bg-slate-900 border border-white/5 p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-violet-500/10 hover:-translate-y-1 hover:border-white/10",
            className
        )}>
            <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500", gradient)} />
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-white/5 text-white/80 group-hover:bg-white/10 group-hover:text-white transition-colors">
                        <Icon className="h-6 w-6" />
                    </div>
                    <ArrowUpRight className="h-5 w-5 text-slate-500 group-hover:text-white transition-colors opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300" />
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-400">{title}</p>
                    <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
                    <p className="text-xs text-slate-500 font-medium">{subtitle}</p>
                </div>
            </div>
        </div>
    )

    return (
        <DashboardShell>
            {/* Hero Warning (Temporary MVP status) */}
            <div className="mb-8 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center gap-3 text-violet-300 text-sm">
                <div className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
                Expense tracking analytics engine coming soon.
            </div>

            <div className="mb-10">
                <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
                    Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">{user?.email?.split('@')[0] || 'User'}</span>
                </h1>
                <p className="text-slate-400">Here is your financial overview for today.</p>
            </div>

            {/* Bento Grid Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <BentoItem
                    title="Total Expenses"
                    value="$0.00"
                    subtitle="+0% from last month"
                    icon={TrendingUp}
                    gradient="bg-gradient-to-br from-emerald-500 to-teal-500"
                    className="md:col-span-2"
                />
                <BentoItem
                    title="Pending Review"
                    value="0"
                    subtitle="Requires attention"
                    icon={Clock}
                    gradient="bg-gradient-to-br from-amber-500 to-orange-500"
                />
                <BentoItem
                    title="Processed"
                    value="0"
                    subtitle="Receipts this month"
                    icon={FileText}
                    gradient="bg-gradient-to-br from-blue-500 to-cyan-500"
                />
            </div>

            {/* Quick Actions & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Visual Action Cards */}
                <div className="lg:col-span-1 space-y-6">
                    <h3 className="text-lg font-semibold text-white">Quick Actions</h3>

                    <Link href="/upload" className="group block relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 p-1">
                        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
                        <div className="relative bg-slate-950/50 backdrop-blur-sm rounded-[20px] p-6 h-full flex flex-col justify-between group-hover:bg-slate-950/40 transition-colors">
                            <div className="mb-6">
                                <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <Plus className="h-6 w-6 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Upload Receipt</h3>
                                <p className="text-indigo-200/80 text-sm leading-relaxed">
                                    Drag and drop or scan a new receipt to automatically process expenses.
                                </p>
                            </div>
                            <div className="flex items-center text-sm font-medium text-white/90">
                                Start Upload <ArrowUpRight className="ml-2 h-4 w-4" />
                            </div>
                        </div>
                    </Link>

                    <Link href="/receipts" className="group block p-6 rounded-3xl bg-slate-900 border border-white/5 hover:border-white/10 transition-colors">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center">
                                    <FileText className="h-5 w-5 text-slate-400 group-hover:text-white transition-colors" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-white">All Receipts</h4>
                                    <p className="text-xs text-slate-500">View history</p>
                                </div>
                            </div>
                            <ArrowUpRight className="h-5 w-5 text-slate-600 group-hover:text-white transition-colors" />
                        </div>
                    </Link>
                </div>

                {/* Recent Activity List */}
                <div className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                        <Link href="/receipts" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">View All</Link>
                    </div>

                    <div className="bg-slate-900/50 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-sm">
                        {/* Empty State visual */}
                        <div className="p-12 flex flex-col items-center justify-center text-center">
                            <div className="h-16 w-16 mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
                                <Clock className="h-8 w-8 text-slate-600" />
                            </div>
                            <h4 className="text-lg font-medium text-white mb-1">No recent activity</h4>
                            <p className="text-slate-500 text-sm max-w-xs mx-auto">
                                Once you upload receipts, they will appear here with their AI processing status.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardShell>
    )
}
