// Audit event types and helper functions

export type AuditEventType = 
    | 'login' 
    | 'password_change' 
    | 'session_revoked' 
    | 'session_revoked_all'
    | 'data_export' 
    | 'data_delete'
    | 'password_reset'

export interface AuditEvent {
    id: string
    type: AuditEventType
    timestamp: string
    details?: string
    ip?: string
}

export function generateAuditEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

export function createAuditEvent(
    type: AuditEventType, 
    details?: string
): AuditEvent {
    return {
        id: generateAuditEventId(),
        type,
        timestamp: new Date().toISOString(),
        details,
    }
}

export function getAuditEventLabel(type: AuditEventType): string {
    switch (type) {
        case 'login':
            return 'Login'
        case 'password_change':
            return 'Password Changed'
        case 'session_revoked':
            return 'Session Revoked'
        case 'session_revoked_all':
            return 'All Sessions Revoked'
        case 'data_export':
            return 'Data Exported'
        case 'data_delete':
            return 'Account Deleted'
        case 'password_reset':
            return 'Password Reset'
        default:
            return 'Unknown Event'
    }
}

export function getAuditEventCategory(type: AuditEventType): 'auth' | 'security' | 'data' {
    switch (type) {
        case 'login':
        case 'password_change':
        case 'password_reset':
            return 'auth'
        case 'session_revoked':
        case 'session_revoked_all':
            return 'security'
        case 'data_export':
        case 'data_delete':
            return 'data'
        default:
            return 'auth'
    }
}
