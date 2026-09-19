import * as React from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Lock, Mail, LogIn } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import type { LoginFormValues } from '../types'

export function LoginForm() {
  const [email, setEmail] = useState('admin@caps.com')
  const [password, setPassword] = useState('Caps123!')
  const { login, isLoading, error } = useAuth()
  const [localError, setLocalError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    if (!email.includes('@')) {
      setLocalError('Email is not valid.')
      return
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.')
      return
    }
    const values: LoginFormValues = { email, password }
    try {
      await login(values)
    } catch {
      // error state comes from useAuth
    }
  }

  const message = localError ?? error

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm space-y-4 rounded-xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl backdrop-blur"
    >
      <div className="space-y-1 text-center">
        <div className="mb-1 inline-flex items-center gap-1.5">
          <Badge variant="default">Auth Feature</Badge>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-white">Sign in</h2>
        <p className="text-xs text-slate-400">Enter email and password to continue</p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <label className="flex items-center gap-1 text-xs font-medium text-slate-300">
            <Mail className="h-3.5 w-3.5 text-indigo-400" /> Email
          </label>
          <Input
            type="email"
            placeholder="admin@caps.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label className="flex items-center gap-1 text-xs font-medium text-slate-300">
            <Lock className="h-3.5 w-3.5 text-indigo-400" /> Password
          </label>
          <Input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
      </div>

      {message && (
        <p className="rounded-md border border-red-500/30 bg-red-950/40 px-3 py-2 text-xs text-red-300">
          {message}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          'Signing in...'
        ) : (
          <>
            <LogIn className="mr-1 h-4 w-4" /> Sign in
          </>
        )}
      </Button>

      <p className="text-center text-[11px] leading-relaxed text-slate-500">
        Dev hint: register first via POST /api/auth/register, or use the seeded admin account once
        the API is running.
      </p>
    </form>
  )
}
