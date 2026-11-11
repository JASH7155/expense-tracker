'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'password' | 'magic'>('password')
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [magicSent, setMagicSent] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handlePasswordAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })

        if (error) {
          setError(error.message)
        } else if (data.session) {
          window.location.href = '/dashboard'
        } else {
          setMessage('Account created! Please check your email inbox to confirm your account, then sign in.')
          setIsSignUp(false)
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          setError(error.message)
        } else if (data.session) {
          window.location.href = '/dashboard'
        } else {
          setError('Email not confirmed. Please check your inbox and click the confirmation link.')
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check your network or credentials.')
    } finally {
      setLoading(false)
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setError(error.message)
      } else {
        setMagicSent(true)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to send magic link.')
    } finally {
      setLoading(false)
    }
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
          {/* Method Selector */}
          <div className="grid grid-cols-2 bg-[#0d1117] p-1 rounded-xl mb-6 border border-[#30363d]">
            <button
              type="button"
              onClick={() => { setMode('password'); setError(''); }}
              className={`py-2 text-sm font-medium rounded-lg transition-colors ${
                mode === 'password'
                  ? 'bg-[#21262d] text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => { setMode('magic'); setError(''); setMagicSent(false); }}
              className={`py-2 text-sm font-medium rounded-lg transition-colors ${
                mode === 'magic'
                  ? 'bg-[#21262d] text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Magic Link
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
              {message}
            </div>
          )}

          {mode === 'password' ? (
            <form onSubmit={handlePasswordAuth}>
              <h2 className="text-xl font-semibold text-white mb-1">
                {isSignUp ? 'Create your account' : 'Sign in with password'}
              </h2>
              <p className="text-gray-400 text-sm mb-6">
                {isSignUp
                  ? 'Enter an email and password to create a new account.'
                  : 'Welcome back! Enter your email and password to continue.'}
              </p>

              <div className="space-y-4 mb-6">
                <div>
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

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
              >
                {loading
                  ? 'Processing...'
                  : isSignUp
                  ? 'Create Account 🚀'
                  : 'Sign In 🔑'}
              </button>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }}
                  className="text-sm text-gray-400 hover:text-blue-400"
                >
                  {isSignUp
                    ? 'Already have an account? Sign in'
                    : "Don't have an account? Create one"}
                </button>
              </div>
            </form>
          ) : magicSent ? (
            <div className="text-center">
              <div className="text-4xl mb-4">📧</div>
              <h2 className="text-xl font-semibold text-white mb-2">Check your email!</h2>
              <p className="text-gray-400 text-sm">
                We sent a magic link to <strong className="text-white">{email}</strong>.
                Click it to sign in.
              </p>
              <button
                type="button"
                onClick={() => { setMagicSent(false); setEmail(''); }}
                className="mt-6 text-sm text-blue-400 hover:text-blue-300"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleMagicLink}>
              <h2 className="text-xl font-semibold text-white mb-1">Magic Link</h2>
              <p className="text-gray-400 text-sm mb-6">
                Receive a login link in your inbox.
              </p>

              <div className="mb-6">
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
