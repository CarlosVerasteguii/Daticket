import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAuditEvent, AuditEvent, AuditEventType } from '@/lib/audit'

// Lazy initialization of admin client
function getSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
}

// GET /api/audit - Get audit log for current user
export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization')
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const token = authHeader.replace('Bearer ', '')
        const supabaseAdmin = getSupabaseAdmin()
        
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
        if (userError || !user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
        }

        const auditLog: AuditEvent[] = user.user_metadata?.audit_log || []

        return NextResponse.json({ 
            events: auditLog,
            total: auditLog.length 
        })
    } catch (error) {
        console.error('Error fetching audit log:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// POST /api/audit - Add audit event for current user
export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization')
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const token = authHeader.replace('Bearer ', '')
        const supabaseAdmin = getSupabaseAdmin()
        
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
        if (userError || !user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
        }

        const body = await request.json()
        const { type, details } = body as { type: AuditEventType; details?: string }

        if (!type) {
            return NextResponse.json({ error: 'Event type required' }, { status: 400 })
        }

        // Get existing audit log
        const existingLog: AuditEvent[] = user.user_metadata?.audit_log || []
        
        // Create new event
        const newEvent = createAuditEvent(type, details)
        
        // Prepend new event and keep last 50
        const updatedLog = [newEvent, ...existingLog].slice(0, 50)

        // Update user metadata
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
            user_metadata: {
                ...user.user_metadata,
                audit_log: updatedLog
            }
        })

        return NextResponse.json({ 
            success: true,
            event: newEvent 
        })
    } catch (error) {
        console.error('Error adding audit event:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
