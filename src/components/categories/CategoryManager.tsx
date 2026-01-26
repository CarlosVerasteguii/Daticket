'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Tag, Check } from 'lucide-react'

type Category = {
    id: string
    name: string
    color: string
}

const DEFAULT_CATEGORIES = [
    { name: 'Food', color: '#ef4444' },
    { name: 'Transport', color: '#3b82f6' },
    { name: 'Utilities', color: '#eab308' },
    { name: 'Entertainment', color: '#a855f7' },
    { name: 'Health', color: '#22c55e' },
    { name: 'Other', color: '#64748b' },
]

export default function CategoryManager({
    onSelect,
    selectedId
}: {
    onSelect?: (id: string) => void,
    selectedId?: string
}) {
    const [categories, setCategories] = useState<Category[]>([])
    const [newCategory, setNewCategory] = useState('')
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        fetchCategories()
    }, [])

    async function fetchCategories() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
            .from('categories')
            .select('*')
            .order('name')

        if (data) {
            setCategories(data)
        }
        setLoading(false)
    }

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
        <div className="space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
                Category
            </label>

            {loading ? (
                <div className="text-sm text-neutral-500 font-mono">Loading...</div>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {categories.map(cat => {
                        const isSelected = selectedId === cat.id
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => onSelect && onSelect(cat.id)}
                                className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-bold border transition-colors ${isSelected
                                        ? 'bg-black text-white border-black'
                                        : 'bg-white text-black border-black hover:bg-neutral-100'
                                    }`}
                            >
                                <div
                                    className="h-3 w-3 border border-black"
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
                            placeholder="New..."
                            className="w-24 px-3 py-2 text-sm font-medium focus:outline-none bg-white"
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
                        Add default categories
                    </button>
                </div>
            )}
        </div>
    )
}
