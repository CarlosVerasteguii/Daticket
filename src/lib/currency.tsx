'use client'

import { createContext, useContext, useState } from 'react'

export interface CurrencyConfig {
    code: string
    symbol: string
    name: string
    decimalSeparator: '.' | ','
    thousandSeparator: ',' | '.' | ' ' | "'"
    symbolPosition: 'before' | 'after'
}

export const CURRENCIES: CurrencyConfig[] = [
    { code: 'USD', symbol: '$', name: 'US Dollar', decimalSeparator: '.', thousandSeparator: ',', symbolPosition: 'before' },
    { code: 'EUR', symbol: '€', name: 'Euro', decimalSeparator: ',', thousandSeparator: '.', symbolPosition: 'after' },
    { code: 'GBP', symbol: '£', name: 'British Pound', decimalSeparator: '.', thousandSeparator: ',', symbolPosition: 'before' },
    { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', decimalSeparator: '.', thousandSeparator: "'", symbolPosition: 'before' },
    { code: 'MXN', symbol: '$', name: 'Mexican Peso', decimalSeparator: '.', thousandSeparator: ',', symbolPosition: 'before' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimalSeparator: '.', thousandSeparator: ',', symbolPosition: 'before' },
    { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', decimalSeparator: '.', thousandSeparator: ',', symbolPosition: 'before' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimalSeparator: '.', thousandSeparator: ',', symbolPosition: 'before' },
]

interface CurrencyContextType {
    currency: CurrencyConfig
    setCurrency: (code: string) => void
    formatAmount: (amount: number) => string
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

const CURRENCY_KEY = 'daticket-currency'

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
    const [currency, setCurrencyState] = useState<CurrencyConfig>(() => {
        if (typeof window === 'undefined') return CURRENCIES[0]
        const saved = window.localStorage.getItem(CURRENCY_KEY)
        if (!saved) return CURRENCIES[0]
        return CURRENCIES.find(c => c.code === saved) ?? CURRENCIES[0]
    })

    const setCurrency = (code: string) => {
        const found = CURRENCIES.find(c => c.code === code)
        if (found) {
            setCurrencyState(found)
            localStorage.setItem(CURRENCY_KEY, code)
        }
    }

    const formatAmount = (amount: number): string => {
        const parts = amount.toFixed(2).split('.')
        const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, currency.thousandSeparator)
        const formatted = `${intPart}${currency.decimalSeparator}${parts[1]}`
        
        if (currency.symbolPosition === 'before') {
            return `${currency.symbol}${formatted}`
        }
        return `${formatted} ${currency.symbol}`
    }

    return (
        <CurrencyContext.Provider value={{ currency, setCurrency, formatAmount }}>
            {children}
        </CurrencyContext.Provider>
    )
}

export function useCurrency() {
    const context = useContext(CurrencyContext)
    if (!context) {
        throw new Error('useCurrency must be used within a CurrencyProvider')
    }
    return context
}
