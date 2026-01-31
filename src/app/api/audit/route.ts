import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createAuditEvent, AuditEvent, AuditEventType } from '@/lib/audit'

// Check if service role key is configured
const hasServiceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY

// Lazy initialization of admin client
function getSupabaseAdmin() {
    if (!hasServiceRoleKey) {
        return null
    }
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
}

// Helper to get user from cookies (when admin API unavailable)
async function getUserFromCookies() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll() {
                    // Read-only for GET
                },
            },
        }
    )
    const { data: { user } } = await supabase.auth.getUser()
    return user
}

// GET /api/audit - Get audit log for current user
export async function GET(request: NextRequest) {
    try {
        // Try to get user from cookies first (more reliable)
        let user = await getUserFromCookies()

        // Fallback to Bearer token
        if (!user) {
            const authHeader = request.headers.get('authorization')
            if (authHeader) {
                const token = authHeader.replace('Bearer ', '')
                const supabaseAdmin = getSupabaseAdmin()
                if (supabaseAdmin) {
                    const { data } = await supabaseAdmin.auth.getUser(token)
                    user = data.user
                }
            }
        }

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get audit log from user metadata
        const auditLog: AuditEvent[] = user.user_metadata?.audit_log || []

        return NextResponse.json({
            events: auditLog,
            total: auditLog.length
        })
    } catch (error) {
        console.error('Error fetching audit log:', error)
        // Return empty log instead of 500 - graceful degradation
        return NextResponse.json({ events: [], total: 0 })
    }
}

// POST /api/audit - Add audit event for current user
export async function POST(request: NextRequest) {
    try {
        let user = await getUserFromCookies()
        let userId: string | undefined = user?.id

        // Fallback to Bearer token
        if (!user) {
            const authHeader = request.headers.get('authorization')
            if (authHeader) {
                const token = authHeader.replace('Bearer ', '')
                const supabaseAdmin = getSupabaseAdmin()
                if (supabaseAdmin) {
                    const { data } = await supabaseAdmin.auth.getUser(token)
                    user = data.user
                    userId = user?.id
                }
            }
        }

        if (!user || !userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { type, details } = body as { type: AuditEventType; details?: string }

        if (!type) {
            return NextResponse.json({ error: 'Event type required' }, { status: 400 })
        }

        // Create new event
        const newEvent = createAuditEvent(type, details)

        // Try to store in user metadata (requires admin API)
        const supabaseAdmin = getSupabaseAdmin()
        if (supabaseAdmin) {
            try {
                const existingLog: AuditEvent[] = user.user_metadata?.audit_log || []
                const updatedLog = [newEvent, ...existingLog].slice(0, 50)

                await supabaseAdmin.auth.admin.updateUserById(userId, {
                    user_metadata: {
                        ...user.user_metadata,
                        audit_log: updatedLog
                    }
                })
            } catch (adminError) {
                console.warn('Audit log storage unavailable:', adminError)
            }
        }

        return NextResponse.json({
            success: true,
            event: newEvent
        })
    } catch (error) {
        console.error('Error adding audit event:', error)
        // Return success anyway - audit is best-effort
        return NextResponse.json({ success: true, event: null })
    }
}
