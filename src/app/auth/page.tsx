'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d1117] p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">📊</div>
          <h1 className="text-3xl font-bold text-white mb-2">ExpenseIQ</h1>
          <p className="text-gray-400">Know exactly where your money goes</p>
        </div>

        {/* Auth Card */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-8">
          {sent ? (
            <div className="text-center">
              <div className="text-4xl mb-4">📧</div>
              <h2 className="text-xl font-semibold text-white mb-2">Check your email!</h2>
              <p className="text-gray-400 text-sm">
                We sent a magic link to <strong className="text-white">{email}</strong>.
                Click it to sign in — no password needed.
              </p>
              <button
                onClick={() => { setSent(false); setEmail('') }}
                className="mt-6 text-sm text-blue-400 hover:text-blue-300"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin}>
              <h2 className="text-xl font-semibold text-white mb-1">Sign in</h2>
              <p className="text-gray-400 text-sm mb-6">
                Enter your email to receive a magic link — no password needed.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
              >
                {loading ? 'Sending...' : 'Send Magic Link ✨'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          Your data is private and encrypted. Powered by Supabase.
        </p>
      </div>
    </div>
  )
}
