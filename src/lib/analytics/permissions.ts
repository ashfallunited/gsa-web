import type { AdminRole } from '@/lib/analytics/types'

export const ANALYTICS_PERMISSIONS = {
  read: 'analytics:read',
  write: 'analytics:write',
  playersRead: 'players:read',
} as const

const ROLE_PERMISSIONS: Record<AdminRole, readonly string[]> = {
  super_admin: [
    ANALYTICS_PERMISSIONS.read,
    ANALYTICS_PERMISSIONS.write,
    ANALYTICS_PERMISSIONS.playersRead,
    'admin:full',
  ],
  data_analyst: [
    ANALYTICS_PERMISSIONS.read,
    ANALYTICS_PERMISSIONS.write,
    ANALYTICS_PERMISSIONS.playersRead,
  ],
}

export function roleHasPermission(role: AdminRole, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role]
  return perms.includes(permission) || perms.includes('admin:full')
}

export function canAccessAnalytics(role: AdminRole): boolean {
  return roleHasPermission(role, ANALYTICS_PERMISSIONS.read)
}

export function canWriteAnalytics(role: AdminRole): boolean {
  return roleHasPermission(role, ANALYTICS_PERMISSIONS.write)
}

export function isSuperAdmin(role: AdminRole): boolean {
  return role === 'super_admin'
}

/** Routes a data analyst may access under /admin */
export const ANALYST_ADMIN_PREFIXES = ['/admin/analytics', '/admin/login'] as const

export function isAnalystAllowedAdminPath(pathname: string): boolean {
  if (pathname === '/admin') return true
  return ANALYST_ADMIN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}
