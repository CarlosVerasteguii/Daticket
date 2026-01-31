'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export interface CategoryBudget {
    category: string
    amount: number
}

export interface MonthlyBudget {
    totalBudget: number
    categoryBudgets: CategoryBudget[]
    month: string // YYYY-MM format
}

interface BudgetContextType {
    budgets: MonthlyBudget[]
    currentMonthBudget: MonthlyBudget | null
    setTotalBudget: (amount: number) => void
    setCategoryBudget: (category: string, amount: number) => void
    removeCategoryBudget: (category: string) => void
    getBudgetForMonth: (month: string) => MonthlyBudget | null
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined)

const BUDGET_KEY = 'daticket-budgets'

const getCurrentMonth = () => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function BudgetProvider({ children }: { children: React.ReactNode }) {
    const [budgets, setBudgets] = useState<MonthlyBudget[]>([])

    useEffect(() => {
        const saved = localStorage.getItem(BUDGET_KEY)
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                setBudgets(parsed)
            } catch {
                // Invalid JSON, use empty
            }
        }
    }, [])

    const saveBudgets = (newBudgets: MonthlyBudget[]) => {
        setBudgets(newBudgets)
        localStorage.setItem(BUDGET_KEY, JSON.stringify(newBudgets))
    }

    const currentMonth = getCurrentMonth()
    const currentMonthBudget = budgets.find(b => b.month === currentMonth) || null

    const setTotalBudget = (amount: number) => {
        const existing = budgets.find(b => b.month === currentMonth)
        if (existing) {
            saveBudgets(budgets.map(b => 
                b.month === currentMonth 
                    ? { ...b, totalBudget: amount }
                    : b
            ))
        } else {
            saveBudgets([...budgets, { 
                month: currentMonth, 
                totalBudget: amount, 
                categoryBudgets: [] 
            }])
        }
    }

    const setCategoryBudget = (category: string, amount: number) => {
        const existing = budgets.find(b => b.month === currentMonth)
        if (existing) {
            const catExists = existing.categoryBudgets.find(c => c.category === category)
            const newCatBudgets = catExists
                ? existing.categoryBudgets.map(c => 
                    c.category === category ? { ...c, amount } : c
                )
                : [...existing.categoryBudgets, { category, amount }]
            
            saveBudgets(budgets.map(b => 
                b.month === currentMonth 
                    ? { ...b, categoryBudgets: newCatBudgets }
                    : b
            ))
        } else {
            saveBudgets([...budgets, {
                month: currentMonth,
                totalBudget: 0,
                categoryBudgets: [{ category, amount }]
            }])
        }
    }

    const removeCategoryBudget = (category: string) => {
        saveBudgets(budgets.map(b => 
            b.month === currentMonth
                ? { ...b, categoryBudgets: b.categoryBudgets.filter(c => c.category !== category) }
                : b
        ))
    }

    const getBudgetForMonth = (month: string) => {
        return budgets.find(b => b.month === month) || null
    }

    return (
        <BudgetContext.Provider value={{ 
            budgets,
            currentMonthBudget,
            setTotalBudget,
            setCategoryBudget,
            removeCategoryBudget,
            getBudgetForMonth
        }}>
            {children}
        </BudgetContext.Provider>
    )
}

export function useBudget() {
    const context = useContext(BudgetContext)
    if (!context) {
        throw new Error('useBudget must be used within a BudgetProvider')
    }
    return context
}
