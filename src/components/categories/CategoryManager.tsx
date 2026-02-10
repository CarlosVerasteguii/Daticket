'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Check } from 'lucide-react'

type Category = {
    id: string
    name: string
    color: string
}

const DEFAULT_CATEGORIES = [
    { name: 'Comida', color: '#ef4444' },
    { name: 'Transporte', color: '#3b82f6' },
    { name: 'Servicios', color: '#eab308' },
    { name: 'Entretenimiento', color: '#a855f7' },
    { name: 'Salud', color: '#22c55e' },
    { name: 'Otros', color: '#64748b' },
]

export default function CategoryManager({
    onSelect,
    selectedId,
    compact = false,
}: {
    onSelect?: (id: string) => void,
    selectedId?: string,
    compact?: boolean
}) {
    const [categories, setCategories] = useState<Category[]>([])
    const [newCategory, setNewCategory] = useState('')
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    const fetchCategories = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            setLoading(false)
            return
        }

        const { data } = await supabase
            .from('categories')
            .select('*')
            .order('name')

        if (data) {
            setCategories(data)
        }
        setLoading(false)
    }, [supabase])

    useEffect(() => {
        fetchCategories()
    }, [fetchCategories])

    const addCategory = async (name: string, color: string = '#000000') => {
        if (!name.trim()) return
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
            .from('categories')
            .insert({ user_id: user.id, name, color })
            .select()
            .single()

        if (data) {
            setCategories([...categories, data])
            setNewCategory('')
            if (onSelect) onSelect(data.id)
        }
    }

    const seedDefaults = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const toInsert = DEFAULT_CATEGORIES.map(c => ({ user_id: user.id, ...c }))

        const { data } = await supabase
            .from('categories')
            .insert(toInsert)
            .select()

        if (data) setCategories([...categories, ...data])
    }

    return (
        <div className={compact ? "space-y-2" : "space-y-4"}>
            {!compact && (
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Categoría
                </label>
            )}

            {loading ? (
                <div className="text-sm text-neutral-500 font-mono">Cargando...</div>
            ) : (
                <div className={compact ? "flex flex-wrap gap-1" : "flex flex-wrap gap-2"}>
                    {categories.map(cat => {
                        const isSelected = selectedId === cat.id
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => onSelect && onSelect(cat.id)}
                                className={`inline-flex items-center gap-2 ${compact ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'} font-bold border transition-colors ${isSelected
                                        ? 'bg-black text-white border-black'
                                        : 'bg-white text-black border-black hover:bg-neutral-100'
                                    }`}
                            >
                                <div
                                    className={compact ? "h-2.5 w-2.5 border border-black" : "h-3 w-3 border border-black"}
                                    style={{ backgroundColor: cat.color }}
                                />
                                {cat.name}
                                {isSelected && <Check className="h-3 w-3" />}
                            </button>
                        )
                    })}

                    {/* Add New Input - Swiss Style */}
                    <div className="flex items-center border border-black">
                        <input
                            type="text"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            placeholder="Nueva..."
                            className={`${compact ? 'w-20 px-2 py-1 text-xs' : 'w-24 px-3 py-2 text-sm'} font-medium focus:outline-none bg-white`}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    addCategory(newCategory)
                                }
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => addCategory(newCategory)}
                            disabled={!newCategory}
                            className="px-2 py-2 bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Seed Button if empty */}
            {!loading && categories.length === 0 && (
                <div className="mt-2">
                    <button
                        type="button"
                        onClick={seedDefaults}
                        className="text-sm font-bold underline decoration-2 underline-offset-4 hover:text-blue-600"
                    >
                        Agregar categorías por defecto
                    </button>
                </div>
            )}
        </div>
    )
}
