'use client'

import { useEffect, useState, useCallback } from 'react'
import { fetchAdminJson } from '@/lib/admin-fetch'

export function useAnalyticsLookups(team: string) {
  const [lookups, setLookups] = useState({ opponents: [] as string[], competitions: [] as string[], seasons: [] as string[] })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (team) params.set('team', team)
      const res = await fetchAdminJson<{ opponents: string[]; competitions: string[]; seasons: string[] }>(
        `/api/admin/analytics/lookups?${params}`
      )
      setLookups(res)
    } catch {
      setLookups({ opponents: [], competitions: [], seasons: [] })
    } finally {
      setLoading(false)
    }
  }, [team])

  useEffect(() => {
    load()
  }, [load])

  return { lookups, loading, reload: load }
}
