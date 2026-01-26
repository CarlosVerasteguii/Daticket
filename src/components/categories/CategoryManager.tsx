'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, Tag } from 'lucide-react'

type Category = {
    id: string
    name: string
    color: string
}

const DEFAULT_CATEGORIES = [
    { name: 'Food', color: '#ef4444' }, // red
    { name: 'Transport', color: '#3b82f6' }, // blue
    { name: 'Utilities', color: '#eab308' }, // yellow
    { name: 'Entertainment', color: '#a855f7' }, // purple
    { name: 'Health', color: '#22c55e' }, // green
    { name: 'Other', color: '#64748b' }, // slate
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

        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('name')

        if (data) {
            // Logic: If empty, maybe seed? For now just show empty or defaults UI
            setCategories(data)
        }
        setLoading(false)
    }

    const addCategory = async (name: string, color: string = '#6366f1') => {
        if (!name.trim()) return
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
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

        const { data, error } = await supabase
            .from('categories')
            .insert(toInsert)
            .select()

        if (data) setCategories([...categories, ...data])
    }

    return (
        <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">Category</label>

            {loading ? (
                <div className="text-sm text-gray-500">Loading categories...</div>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => onSelect && onSelect(cat.id)}
                            className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedId === cat.id
                                    ? 'ring-2 ring-offset-2 ring-indigo-500 text-white'
                                    : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                                }`}
                            style={{ backgroundColor: selectedId === cat.id ? cat.color : undefined }}
                        >
                            <Tag className="w-3 h-3 mr-1.5" />
                            {cat.name}
                        </button>
                    ))}

                    {/* Add New Input */}
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            placeholder="New..."
                            className="w-24 px-2 py-1 text-sm border-b border-gray-300 focus:outline-none focus:border-indigo-500 bg-transparent"
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
                            className="text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
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
                        className="text-xs text-indigo-600 underline hover:text-indigo-800"
                    >
                        Add default categories
                    </button>
                </div>
            )}
        </div>
    )
}
