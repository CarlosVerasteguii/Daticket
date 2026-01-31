'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import DashboardShell from '@/components/layout/DashboardShell'
import { Wallet, Target, Plus, Trash2, Edit2, Check, X } from 'lucide-react'
import { useBudget } from '@/lib/budget'
import { useCurrency } from '@/lib/currency'
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

export default function BudgetPage() {
    const router = useRouter()
    const supabase = createClient()
    const { currentMonthBudget, setTotalBudget, setCategoryBudget, removeCategoryBudget } = useBudget()
    const { formatAmount } = useCurrency()
    
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
                                <p className="text-sm mt-1">Click "Add" to set budgets for specific categories</p>
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

                {/* Info */}
                <div className="p-4 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-500 dark:text-neutral-400">
                    <p>💡 <strong>Tip:</strong> Set a total monthly budget first, then allocate amounts to specific categories to track your spending more precisely.</p>
                </div>
            </div>
        </DashboardShell>
    )
}
