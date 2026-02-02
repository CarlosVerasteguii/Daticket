'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import DashboardShell from '@/components/layout/DashboardShell'
import { Wallet, Target, Plus, Trash2, Edit2, Check, X, TrendingUp, AlertTriangle } from 'lucide-react'
import { useBudget } from '@/lib/budget'
import { useCurrency } from '@/lib/currency'
import { useNotifications } from '@/lib/notifications'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

const DEFAULT_CATEGORIES = [
    'Groceries',
    'Dining',
    'Transportation',
    'Entertainment',
    'Shopping',
    'Health',
    'Utilities',
    'Other'
]

interface SpendingData {
    total: number
    byCategory: Record<string, number>
}

export default function BudgetPage() {
    const router = useRouter()
    const supabase = createClient()
    const { budgets, currentMonthBudget, setTotalBudget, setCategoryBudget, removeCategoryBudget } = useBudget()
    const { formatAmount } = useCurrency()
    const { checkBudgetAlert } = useNotifications()
    
    const [spending, setSpending] = useState<SpendingData>({ total: 0, byCategory: {} })
    const [historicalSpending, setHistoricalSpending] = useState<Record<string, number>>({})
    const [loading, setLoading] = useState(true)
    const [editingTotal, setEditingTotal] = useState(false)
    const [totalInput, setTotalInput] = useState('')
    const [showAddCategory, setShowAddCategory] = useState(false)
    const [selectedCategory, setSelectedCategory] = useState('')
    const [categoryAmount, setCategoryAmount] = useState('')
    const [editingCategory, setEditingCategory] = useState<string | null>(null)
    const [editAmount, setEditAmount] = useState('')

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login')
            }
        }
        checkAuth()
    }, [router, supabase])

    // Fetch current month spending
    useEffect(() => {
        const fetchSpending = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            const now = new Date()
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

            const { data: receipts } = await supabase
                .from('receipts')
                .select('amount, category')
                .eq('user_id', session.user.id)
                .gte('receipt_date', startOfMonth)
                .lte('receipt_date', endOfMonth)

            if (receipts) {
                const total = receipts.reduce((sum, r) => sum + (r.amount || 0), 0)
                const byCategory: Record<string, number> = {}
                receipts.forEach(r => {
                    const cat = r.category || 'Other'
                    byCategory[cat] = (byCategory[cat] || 0) + (r.amount || 0)
                })
                setSpending({ total, byCategory })
            }
            setLoading(false)
        }
        fetchSpending()
    }, [supabase])

    // Fetch historical spending for previous months with budgets
    useEffect(() => {
        const fetchHistoricalSpending = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session || budgets.length === 0) return

            const now = new Date()
            const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
            const pastBudgets = budgets.filter(b => b.month !== currentMonthStr)

            const spendingByMonth: Record<string, number> = {}

            for (const budget of pastBudgets) {
                const [year, month] = budget.month.split('-').map(Number)
                const startOfMonth = new Date(year, month - 1, 1).toISOString().split('T')[0]
                const endOfMonth = new Date(year, month, 0).toISOString().split('T')[0]

                const { data: receipts } = await supabase
                    .from('receipts')
                    .select('amount')
                    .eq('user_id', session.user.id)
                    .gte('receipt_date', startOfMonth)
                    .lte('receipt_date', endOfMonth)

                if (receipts) {
                    spendingByMonth[budget.month] = receipts.reduce((sum, r) => sum + (r.amount || 0), 0)
                }
            }

            setHistoricalSpending(spendingByMonth)
        }

        fetchHistoricalSpending()
    }, [supabase, budgets])

    // Check for budget alerts when spending data changes
    useEffect(() => {
        if (loading || !currentMonthBudget?.totalBudget) return

        // Check total budget alert
        checkBudgetAlert(spending.total, currentMonthBudget.totalBudget)

        // Check category budget alerts
        currentMonthBudget.categoryBudgets.forEach(cat => {
            const spent = spending.byCategory[cat.category] || 0
            checkBudgetAlert(spent, cat.amount, cat.category)
        })
    }, [spending, currentMonthBudget, loading, checkBudgetAlert])

    const handleSaveTotal = () => {
        const amount = parseFloat(totalInput)
        if (!isNaN(amount) && amount >= 0) {
            setTotalBudget(amount)
        }
        setEditingTotal(false)
        setTotalInput('')
    }

    const handleAddCategoryBudget = () => {
        const amount = parseFloat(categoryAmount)
        if (selectedCategory && !isNaN(amount) && amount > 0) {
            setCategoryBudget(selectedCategory, amount)
            setSelectedCategory('')
            setCategoryAmount('')
            setShowAddCategory(false)
        }
    }

    const handleEditCategory = (category: string) => {
        const amount = parseFloat(editAmount)
        if (!isNaN(amount) && amount > 0) {
            setCategoryBudget(category, amount)
        }
        setEditingCategory(null)
        setEditAmount('')
    }

    const usedCategories = currentMonthBudget?.categoryBudgets.map(c => c.category) || []
    const availableCategories = DEFAULT_CATEGORIES.filter(c => !usedCategories.includes(c))
    const totalCategoryBudgets = currentMonthBudget?.categoryBudgets.reduce((sum, c) => sum + c.amount, 0) || 0

    const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    return (
        <DashboardShell>
            <div className="p-6 max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-black dark:bg-white flex items-center justify-center">
                        <Wallet className="h-6 w-6 text-white dark:text-black" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Monthly Budget</h1>
                        <p className="text-neutral-500 dark:text-neutral-400">{currentMonth}</p>
                    </div>
                </div>

                {/* Total Budget Card */}
                <div className="border border-black dark:border-neutral-700 bg-white dark:bg-neutral-900">
                    <div className="p-4 border-b border-black dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 flex items-center gap-3">
                        <Target className="h-5 w-5" />
                        <h2 className="font-bold uppercase text-sm tracking-wider">Total Monthly Budget</h2>
                    </div>
                    
                    <div className="p-6">
                        {editingTotal ? (
                            <div className="flex items-center gap-4">
                                <input
                                    type="number"
                                    value={totalInput}
                                    onChange={(e) => setTotalInput(e.target.value)}
                                    placeholder="Enter budget amount"
                                    className="flex-1 px-4 py-3 border border-black dark:border-neutral-700 bg-white dark:bg-neutral-800 font-mono text-2xl"
                                    autoFocus
                                />
                                <button
                                    onClick={handleSaveTotal}
                                    className="h-12 w-12 bg-black dark:bg-white text-white dark:text-black flex items-center justify-center hover:opacity-80"
                                >
                                    <Check className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={() => {
                                        setEditingTotal(false)
                                        setTotalInput('')
                                    }}
                                    className="h-12 w-12 border border-black dark:border-neutral-700 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-4xl font-bold font-mono">
                                        {formatAmount(currentMonthBudget?.totalBudget || 0)}
                                    </p>
                                    {currentMonthBudget?.totalBudget && totalCategoryBudgets > 0 && (
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                                            {formatAmount(totalCategoryBudgets)} allocated to categories 
                                            ({Math.round((totalCategoryBudgets / currentMonthBudget.totalBudget) * 100)}%)
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={() => {
                                        setEditingTotal(true)
                                        setTotalInput(currentMonthBudget?.totalBudget?.toString() || '')
                                    }}
                                    className="px-4 py-2 border border-black dark:border-neutral-700 font-bold text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2"
                                >
                                    <Edit2 className="h-4 w-4" />
                                    {currentMonthBudget?.totalBudget ? 'Edit' : 'Set Budget'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Budget Progress Overview */}
                {currentMonthBudget?.totalBudget && currentMonthBudget.totalBudget > 0 && (
                    <div className="border border-black dark:border-neutral-700 bg-white dark:bg-neutral-900">
                        <div className="p-4 border-b border-black dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 flex items-center gap-3">
                            <TrendingUp className="h-5 w-5" />
                            <h2 className="font-bold uppercase text-sm tracking-wider">Spending Progress</h2>
                        </div>
                        
                        <div className="p-6">
                            {/* Overall Progress */}
                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-medium">Total Spending</span>
                                    <span className="font-mono">
                                        {formatAmount(spending.total)} / {formatAmount(currentMonthBudget.totalBudget)}
                                    </span>
                                </div>
                                <div className="h-4 bg-neutral-200 dark:bg-neutral-700 relative overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min((spending.total / currentMonthBudget.totalBudget) * 100, 100)}%` }}
                                        transition={{ duration: 0.5, ease: 'easeOut' }}
                                        className={cn(
                                            "h-full",
                                            spending.total / currentMonthBudget.totalBudget >= 1 
                                                ? "bg-red-500" 
                                                : spending.total / currentMonthBudget.totalBudget >= 0.8 
                                                    ? "bg-yellow-500" 
                                                    : "bg-green-500"
                                        )}
                                    />
                                </div>
                                <div className="flex justify-between mt-2 text-sm">
                                    <span className={cn(
                                        "font-medium",
                                        spending.total / currentMonthBudget.totalBudget >= 1 
                                            ? "text-red-500" 
                                            : spending.total / currentMonthBudget.totalBudget >= 0.8 
                                                ? "text-yellow-600 dark:text-yellow-400" 
                                                : "text-green-600 dark:text-green-400"
                                    )}>
                                        {Math.round((spending.total / currentMonthBudget.totalBudget) * 100)}% used
                                    </span>
                                    <span className="text-neutral-500">
                                        {formatAmount(Math.max(currentMonthBudget.totalBudget - spending.total, 0))} remaining
                                    </span>
                                </div>

                                {/* Warning when approaching or over budget */}
                                {spending.total / currentMonthBudget.totalBudget >= 0.8 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={cn(
                                            "mt-4 p-3 border flex items-center gap-3",
                                            spending.total >= currentMonthBudget.totalBudget
                                                ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                                                : "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300"
                                        )}
                                    >
                                        <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                                        <span className="text-sm font-medium">
                                            {spending.total >= currentMonthBudget.totalBudget
                                                ? `You've exceeded your budget by ${formatAmount(spending.total - currentMonthBudget.totalBudget)}!`
                                                : `Warning: You've used ${Math.round((spending.total / currentMonthBudget.totalBudget) * 100)}% of your budget.`}
                                        </span>
                                    </motion.div>
                                )}
                            </div>

                            {/* Category Progress */}
                            {currentMonthBudget.categoryBudgets.length > 0 && (
                                <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                                    <h3 className="font-bold text-sm uppercase tracking-wider text-neutral-500">By Category</h3>
                                    {currentMonthBudget.categoryBudgets.map(cat => {
                                        const spent = spending.byCategory[cat.category] || 0
                                        const percentage = (spent / cat.amount) * 100
                                        const isOver = spent >= cat.amount
                                        const isWarning = percentage >= 80 && !isOver

                                        return (
                                            <div key={cat.category}>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-medium text-sm">{cat.category}</span>
                                                    <span className="font-mono text-sm">
                                                        {formatAmount(spent)} / {formatAmount(cat.amount)}
                                                    </span>
                                                </div>
                                                <div className="h-2 bg-neutral-200 dark:bg-neutral-700 relative overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${Math.min(percentage, 100)}%` }}
                                                        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
                                                        className={cn(
                                                            "h-full",
                                                            isOver ? "bg-red-500" : isWarning ? "bg-yellow-500" : "bg-black dark:bg-white"
                                                        )}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Category Budgets */}
                <div className="border border-black dark:border-neutral-700 bg-white dark:bg-neutral-900">
                    <div className="p-4 border-b border-black dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Wallet className="h-5 w-5" />
                            <h2 className="font-bold uppercase text-sm tracking-wider">Category Budgets</h2>
                        </div>
                        {availableCategories.length > 0 && (
                            <button
                                onClick={() => setShowAddCategory(true)}
                                className="px-3 py-1 bg-black dark:bg-white text-white dark:text-black text-xs font-bold flex items-center gap-1 hover:opacity-80"
                            >
                                <Plus className="h-3 w-3" />
                                Add
                            </button>
                        )}
                    </div>

                    <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
                        {/* Add Category Form */}
                        <AnimatePresence>
                            {showAddCategory && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="p-4 bg-neutral-50 dark:bg-neutral-800"
                                >
                                    <div className="flex gap-3">
                                        <select
                                            value={selectedCategory}
                                            onChange={(e) => setSelectedCategory(e.target.value)}
                                            className="flex-1 px-3 py-2 border border-black dark:border-neutral-700 bg-white dark:bg-neutral-900"
                                        >
                                            <option value="">Select category...</option>
                                            {availableCategories.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            value={categoryAmount}
                                            onChange={(e) => setCategoryAmount(e.target.value)}
                                            placeholder="Amount"
                                            className="w-32 px-3 py-2 border border-black dark:border-neutral-700 bg-white dark:bg-neutral-900 font-mono"
                                        />
                                        <button
                                            onClick={handleAddCategoryBudget}
                                            disabled={!selectedCategory || !categoryAmount}
                                            className={cn(
                                                "px-4 py-2 font-bold text-white",
                                                selectedCategory && categoryAmount 
                                                    ? "bg-black dark:bg-white dark:text-black hover:opacity-80" 
                                                    : "bg-neutral-300 cursor-not-allowed"
                                            )}
                                        >
                                            <Check className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowAddCategory(false)
                                                setSelectedCategory('')
                                                setCategoryAmount('')
                                            }}
                                            className="px-4 py-2 border border-black dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Category List */}
                        {currentMonthBudget?.categoryBudgets.length === 0 && !showAddCategory && (
                            <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
                                <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p className="font-medium">No category budgets set</p>
                                <p className="text-sm mt-1">Click &quot;Add&quot; to set budgets for specific categories</p>
                            </div>
                        )}

                        {currentMonthBudget?.categoryBudgets.map((cat) => (
                            <div key={cat.category} className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center">
                                        <span className="text-lg">{cat.category.charAt(0)}</span>
                                    </div>
                                    <div>
                                        <p className="font-bold">{cat.category}</p>
                                        {currentMonthBudget.totalBudget > 0 && (
                                            <p className="text-xs text-neutral-500">
                                                {Math.round((cat.amount / currentMonthBudget.totalBudget) * 100)}% of total
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {editingCategory === cat.category ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={editAmount}
                                            onChange={(e) => setEditAmount(e.target.value)}
                                            className="w-24 px-2 py-1 border border-black dark:border-neutral-700 bg-white dark:bg-neutral-800 font-mono text-right"
                                            autoFocus
                                        />
                                        <button
                                            onClick={() => handleEditCategory(cat.category)}
                                            className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                                        >
                                            <Check className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingCategory(null)
                                                setEditAmount('')
                                            }}
                                            className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono font-bold">{formatAmount(cat.amount)}</span>
                                        <button
                                            onClick={() => {
                                                setEditingCategory(cat.category)
                                                setEditAmount(cat.amount.toString())
                                            }}
                                            className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => removeCategoryBudget(cat.category)}
                                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Budget History */}
                {budgets.length > 1 && (
                    <div className="border border-black dark:border-neutral-700 bg-white dark:bg-neutral-900">
                        <div className="p-4 border-b border-black dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 flex items-center gap-3">
                            <TrendingUp className="h-5 w-5" />
                            <h2 className="font-bold uppercase text-sm tracking-wider">Budget History</h2>
                        </div>

                        <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
                            {budgets
                                .filter(b => b.month !== currentMonth.split(' ').pop())
                                .sort((a, b) => b.month.localeCompare(a.month))
                                .slice(0, 6)
                                .map(budget => {
                                    const spent = historicalSpending[budget.month] || 0
                                    const percentage = budget.totalBudget > 0 ? (spent / budget.totalBudget) * 100 : 0
                                    const isOver = spent > budget.totalBudget
                                    const monthDate = new Date(budget.month + '-01')
                                    const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

                                    return (
                                        <div key={budget.month} className="p-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-medium">{monthName}</span>
                                                <span className={cn(
                                                    "text-sm font-mono",
                                                    isOver ? "text-red-500" : "text-green-600 dark:text-green-400"
                                                )}>
                                                    {isOver ? 'Over by ' : 'Under by '}
                                                    {formatAmount(Math.abs(budget.totalBudget - spent))}
                                                </span>
                                            </div>
                                            <div className="flex gap-4 text-sm text-neutral-500 dark:text-neutral-400">
                                                <span>Budget: {formatAmount(budget.totalBudget)}</span>
                                                <span>Spent: {formatAmount(spent)}</span>
                                                <span className={cn(
                                                    isOver ? "text-red-500" : percentage >= 80 ? "text-yellow-600" : "text-green-600"
                                                )}>
                                                    {percentage.toFixed(0)}% used
                                                </span>
                                            </div>
                                            <div className="h-2 bg-neutral-200 dark:bg-neutral-700 mt-2 overflow-hidden">
                                                <div
                                                    className={cn(
                                                        "h-full transition-all duration-300",
                                                        isOver ? "bg-red-500" : percentage >= 80 ? "bg-yellow-500" : "bg-green-500"
                                                    )}
                                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                        </div>

                        {budgets.length <= 1 && (
                            <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
                                <p>No budget history yet. Your previous months&apos; budgets will appear here.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Info */}
                <div className="p-4 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-500 dark:text-neutral-400">
                    <p>💡 <strong>Tip:</strong> Set a total monthly budget first, then allocate amounts to specific categories to track your spending more precisely.</p>
                </div>
            </div>
        </DashboardShell>
    )
}
