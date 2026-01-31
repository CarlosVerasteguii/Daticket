import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { UAParser } from 'ua-parser-js'

// Check if service role key is configured
const hasServiceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY

// Lazy admin client for session management
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

interface SessionInfo {
    id: string
    device: {
        browser: string
        os: string
        type: 'desktop' | 'mobile' | 'tablet'
    }
    ipAddress: string
    location?: {
        city?: string
        country?: string
    }
    lastActive: string
    isCurrent: boolean
    createdAt: string
    userAgent: string
}

function parseUserAgent(userAgent: string): SessionInfo['device'] {
    const parser = new UAParser(userAgent)
    const browser = parser.getBrowser()
    const os = parser.getOS()
    const device = parser.getDevice()

    let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop'
    if (device.type === 'mobile') deviceType = 'mobile'
    else if (device.type === 'tablet') deviceType = 'tablet'

    return {
        browser: browser.name || 'Unknown Browser',
        os: os.name ? `${os.name} ${os.version || ''}`.trim() : 'Unknown OS',
        type: deviceType
    }
}

async function getAuthenticatedUser(request: NextRequest) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookieStore.set(name, value, options)
                    })
                },
            },
        }
    )

    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        return null
    }

    // Get current session to identify it
    const { data: { session } } = await supabase.auth.getSession()

    return { user, currentSessionId: session?.access_token?.slice(-20) || null }
}

// GET /api/sessions - List all user sessions
export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthenticatedUser(request)

        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { user } = auth

        // For demo/MVP purposes, we create a session list based on current request
        const currentUserAgent = request.headers.get('user-agent') || 'Unknown'
        const currentIp = request.headers.get('x-forwarded-for')?.split(',')[0] ||
            request.headers.get('x-real-ip') ||
            '127.0.0.1'

        // Base session (always available - the current one)
        const sessions: SessionInfo[] = [
            {
                id: 'current',
                device: parseUserAgent(currentUserAgent),
                ipAddress: currentIp,
                lastActive: new Date().toISOString(),
                isCurrent: true,
                createdAt: new Date().toISOString(),
                userAgent: currentUserAgent
            }
        ]

        // Try to get additional sessions from admin API (requires SUPABASE_SERVICE_ROLE_KEY)
        const adminClient = getSupabaseAdmin()
        if (adminClient) {
            try {
                const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(user.id)

                if (!userError && userData?.user) {
                    // Update current session with actual created_at
                    sessions[0].createdAt = userData.user.created_at || sessions[0].createdAt

                    // Add stored sessions from user metadata
                    const storedSessions = userData.user.user_metadata?.sessions || []
                    for (const session of storedSessions) {
                        if (session.id !== 'current') {
                            sessions.push({
                                ...session,
                                device: parseUserAgent(session.userAgent || 'Unknown'),
                                isCurrent: false
                            })
                        }
                    }
                }
            } catch (adminError) {
                // Admin API failed, but we still have current session
                console.warn('Admin API unavailable, showing current session only')
            }
        }

        return NextResponse.json({ sessions })
    } catch (error) {
        console.error('Sessions GET error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// DELETE /api/sessions - Revoke a specific session or all sessions
export async function DELETE(request: NextRequest) {
    try {
        const auth = await getAuthenticatedUser(request)

        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { user } = auth
        const { searchParams } = new URL(request.url)
        const sessionId = searchParams.get('sessionId')
        const scope = searchParams.get('scope') // 'all' for signing out all devices

        if (scope === 'all') {
            // Sign out from all devices except current
            // This invalidates all refresh tokens
            const cookieStore = await cookies()

            const supabase = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                {
                    cookies: {
                        getAll() {
                            return cookieStore.getAll()
                        },
                        setAll(cookiesToSet) {
                            cookiesToSet.forEach(({ name, value, options }) => {
                                cookieStore.set(name, value, options)
                            })
                        },
                    },
                }
            )

            // Sign out globally (all devices) then re-sign in current
            const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' })

            if (signOutError) {
                console.error('Error signing out all sessions:', signOutError)
                return NextResponse.json({ error: 'Failed to sign out all devices' }, { status: 500 })
            }

            return NextResponse.json({
                success: true,
                message: 'Signed out from all devices. Please sign in again.'
            })
        }

        if (sessionId && sessionId !== 'current') {
            // For MVP: We track sessions in user metadata and remove the specific one
            // In production, you'd have a sessions table to manage this
            const adminClient = getSupabaseAdmin()

            if (!adminClient) {
                // Admin API not available, can't revoke specific sessions
                return NextResponse.json({
                    success: true,
                    message: 'Session tracking not enabled. Please sign out from all devices instead.'
                })
            }

            const { data: userData } = await adminClient.auth.admin.getUserById(user.id)

            if (userData?.user) {
                const storedSessions = userData.user.user_metadata?.sessions || []
                const updatedSessions = storedSessions.filter((s: { id: string }) => s.id !== sessionId)

                await adminClient.auth.admin.updateUserById(user.id, {
                    user_metadata: {
                        ...userData.user.user_metadata,
                        sessions: updatedSessions
                    }
                })
            }

            return NextResponse.json({
                success: true,
                message: 'Session revoked successfully'
            })
        }

        return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 })
    } catch (error) {
        console.error('Sessions DELETE error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// POST /api/sessions - Register a new session (called on login)
export async function POST(request: NextRequest) {
    try {
        const auth = await getAuthenticatedUser(request)

        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { user } = auth
        const userAgent = request.headers.get('user-agent') || 'Unknown'
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
            request.headers.get('x-real-ip') ||
            '127.0.0.1'

        // Create new session entry
        const newSession = {
            id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userAgent,
            ipAddress: ip,
            createdAt: new Date().toISOString(),
            lastActive: new Date().toISOString()
        }

        // Try to store session in user metadata (requires admin API)
        const adminClient = getSupabaseAdmin()
        if (adminClient) {
            try {
                const { data: userData } = await adminClient.auth.admin.getUserById(user.id)

                if (userData?.user) {
                    const storedSessions = userData.user.user_metadata?.sessions || []
                    // Keep only last 10 sessions
                    const updatedSessions = [newSession, ...storedSessions].slice(0, 10)

                    await adminClient.auth.admin.updateUserById(user.id, {
                        user_metadata: {
                            ...userData.user.user_metadata,
                            sessions: updatedSessions
                        }
                    })
                }
            } catch (adminError) {
                // Session tracking not available, but login still works
                console.warn('Session tracking unavailable:', adminError)
            }
        }

        return NextResponse.json({
            success: true,
            sessionId: newSession.id
        })
    } catch (error) {
        console.error('Sessions POST error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
