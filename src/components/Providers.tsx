'use client'

import { ThemeProvider } from "@/lib/theme"
import { CurrencyProvider } from "@/lib/currency"
import { NotificationProvider } from "@/lib/notifications"
import { BudgetProvider } from "@/lib/budget"
import { AlertToast } from "@/components/AlertToast"

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <CurrencyProvider>
                <NotificationProvider>
                    <BudgetProvider>
                        {children}
                        <AlertToast />
                    </BudgetProvider>
                </NotificationProvider>
            </CurrencyProvider>
        </ThemeProvider>
    )
}
