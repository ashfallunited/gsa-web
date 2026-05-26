'use client'

import { ORG_NAME } from '@/lib/constants'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const from = params.get('from') ?? '/admin'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    if (res.ok) {
      router.push(from)
      router.refresh()
    } else {
      setError('Invalid username or password.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-[#5a6478] mb-1.5">
          Username
        </label>
        <input
          type="text"
          required
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-[#01255f]"
          placeholder="Enter your username"
        />
      </div>
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-[#5a6478] mb-1.5">
          Password
        </label>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-[#01255f]"
          placeholder="••••••••"
        />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#01255f] hover:bg-[#011840] disabled:opacity-60 text-white py-3 text-sm font-bold tracking-wide transition-colors"
      >
        {loading ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  )
}

export default function AdminLogin() {
  return (
    <div className="min-h-screen bg-[#f5f7fc] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-[#01255f] p-6 flex justify-center mb-6">
          <div className="relative h-10 w-44">
            <Image src="/Logo.png" alt={ORG_NAME} fill className="object-contain" sizes="176px" priority />
          </div>
        </div>
        <div className="bg-white border border-gray-100 p-8">
          <h1 className="font-bold text-[#01255f] text-lg mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
            Admin Portal
          </h1>
          <p className="text-[#5a6478] text-sm mb-6">Sign in to manage content.</p>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
