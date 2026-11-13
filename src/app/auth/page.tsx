'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Wallet, Mail, Key, ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react'

export default function AuthPage() {
  const router = useRouter()
  const [view, setView] = useState<'signin' | 'signup' | 'forgot'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // Password requirements checks
  const hasLength = password.length >= 8
  const hasNumber = /\d/.test(password)
  const hasLetter = /[a-zA-Z]/.test(password)
  const isPasswordValid = hasLength && hasNumber && hasLetter

  // Automatically forward if session already exists
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.location.href = '/dashboard'
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session) {
        window.location.href = '/dashboard'
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (view === 'signup') {
        if (!isPasswordValid) {
          setError('Password must be at least 8 characters and contain at least one letter and one number.')
          setLoading(false)
          return
        }

        if (password !== confirmPassword) {
          setError('Passwords do not match. Please re-enter.')
          setLoading(false)
          return
        }

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
          setMessage('Account created! Please check your email to confirm your account, then sign in.')
          setView('signin')
          setPassword('')
          setConfirmPassword('')
        }
      } else if (view === 'signin') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          setError(error.message)
        } else if (data.session) {
          window.location.href = '/dashboard'
        }
      } else if (view === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        })

        if (error) {
          setError(error.message)
        } else {
          setMessage('Password reset link sent! Check your email inbox to choose a new password.')
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication error. Please check your network and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#07090e] p-4 transition-colors">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center mx-auto mb-3 shadow-sm">
            <Wallet className="w-6 h-6 text-zinc-100 dark:text-zinc-900" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            ExpenseIQ
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm mt-1">
            Personal cash flow, autopays &amp; money manager
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white dark:bg-[#0e1017] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-6 sm:p-8 shadow-sm">
          {/* Header text */}
          <div className="mb-6">
            {view === 'forgot' ? (
              <div>
                <button
                  type="button"
                  onClick={() => { setView('signin'); setError(''); setMessage(''); }}
                  className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 mb-2 cursor-pointer font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Sign In
                </button>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Reset your password</h2>
                <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-0.5">
                  Enter your email address to receive a secure recovery link.
                </p>
              </div>
            ) : view === 'signup' ? (
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Create your account</h2>
                <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-0.5">
                  Enter your email and a strong password to start tracking.
                </p>
              </div>
            ) : (
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Welcome back</h2>
                <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-0.5">
                  Sign in with your email and password to access your dashboard.
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-medium leading-relaxed">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-5 p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-medium leading-relaxed flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-zinc-50 dark:bg-[#090a0f] border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-zinc-900 dark:text-zinc-100 text-sm placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600"
                />
              </div>
            </div>

            {/* Password */}
            {view !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Password
                  </label>
                  {view === 'signin' && (
                    <button
                      type="button"
                      onClick={() => { setView('forgot'); setError(''); setMessage(''); }}
                      className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Key className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full bg-zinc-50 dark:bg-[#090a0f] border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-10 py-2.5 text-zinc-900 dark:text-zinc-100 text-sm placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1 cursor-pointer transition-colors"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {view === 'signup' && (
                  <div className="mt-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 text-[11px] space-y-1">
                    <p className="font-semibold text-zinc-500 dark:text-zinc-400">Password Requirements:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
                      <div className={`flex items-center gap-1 ${hasLength ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-zinc-400'}`}>
                        <span>{hasLength ? '✓' : '○'}</span>
                        <span>8+ characters</span>
                      </div>
                      <div className={`flex items-center gap-1 ${hasNumber ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-zinc-400'}`}>
                        <span>{hasNumber ? '✓' : '○'}</span>
                        <span>1+ number</span>
                      </div>
                      <div className={`flex items-center gap-1 ${hasLetter ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-zinc-400'}`}>
                        <span>{hasLetter ? '✓' : '○'}</span>
                        <span>1+ letter</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Confirm Password (only on Sign Up) */}
            {view === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full bg-zinc-50 dark:bg-[#090a0f] border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-10 py-2.5 text-zinc-900 dark:text-zinc-100 text-sm placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1 cursor-pointer transition-colors"
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-[11px] text-rose-500 mt-1">Passwords do not match</p>
                )}
                {confirmPassword && password === confirmPassword && (
                  <p className="text-[11px] text-emerald-500 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Passwords match
                  </p>
                )}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || !email || (view !== 'forgot' && !password)}
              className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 font-medium text-xs sm:text-sm transition-colors disabled:opacity-50 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : view === 'signup' ? (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : view === 'forgot' ? (
                <>
                  Send Recovery Link
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Bottom switch */}
            <div className="pt-2 text-center">
              {view === 'signin' ? (
                <button
                  type="button"
                  onClick={() => { setView('signup'); setError(''); setMessage(''); }}
                  className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer"
                >
                  Don&apos;t have an account? <span className="underline font-medium text-zinc-800 dark:text-zinc-200">Create one</span>
                </button>
              ) : view === 'signup' ? (
                <button
                  type="button"
                  onClick={() => { setView('signin'); setError(''); setMessage(''); }}
                  className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer"
                >
                  Already have an account? <span className="underline font-medium text-zinc-800 dark:text-zinc-200">Sign in</span>
                </button>
              ) : null}
            </div>
          </form>
        </div>

        <p className="text-center text-[11px] text-zinc-400 dark:text-zinc-500 mt-6 font-mono">
          Private &amp; isolated with Supabase Row-Level Security
        </p>
      </div>
    </div>
  )
}
