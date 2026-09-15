import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../api/client'
import type { UserRole } from '../types'

const ROLE_OPTIONS: { value: UserRole; title: string; blurb: string; icon: string; badge: string }[] = [
  {
    value: 'nurse',
    title: 'Nurse / Clinical Care Specialist',
    blurb: 'Dedicated Nurse Portal, real-time unit shift alerts, patient vitals, and emergency task acceptance.',
    icon: '👩‍⚕️',
    badge: 'Clinical Care',
  },
  {
    value: 'data_entry',
    title: 'Ward Data Entry Officer',
    blurb: 'Continuously update live beds, staff assigned, and patient queue metrics.',
    icon: '📊',
    badge: 'Ward Metrics',
  },
]

export default function SignupPage({ onGoToLogin }: { onGoToLogin: () => void }) {
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [requestedRole, setRequestedRole] = useState<UserRole>('nurse')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLocalError(null)
    setSubmitting(true)
    try {
      await register(name, email, password, requestedRole)
      setSubmitted(true)
    } catch (e) {
      setLocalError(e instanceof ApiError ? e.message : 'Could not submit request')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 px-4 select-none">
        <div className="w-full max-w-sm bg-[#0c0d12] border border-[#232634] p-8 rounded-2xl shadow-2xl text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto text-xl">
            ✓
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            Authorization Request Submitted
          </div>
          <p className="text-xs text-slate-400 font-mono leading-relaxed">
            An administrator will review and authorize your account credentials. You will be able to log in once approval is granted.
          </p>
          <button
            onClick={onGoToLogin}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs uppercase tracking-wider py-3 rounded-xl transition-all shadow-lg shadow-cyan-500/20"
          >
            Return to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 px-4 py-8 select-none">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-white tracking-tight">
            Request Command Access
          </div>
          <div className="text-xs text-slate-400 font-mono mt-1">Hospital Digital Twin Authentication</div>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#0c0d12] border border-[#232634] p-7 rounded-2xl shadow-2xl space-y-4">
          <div>
            <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 block mb-1.5">Full Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dr. Jordan Lee"
              className="w-full bg-[#12141c] border border-slate-800 px-3.5 py-2.5 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 block mb-1.5">Work Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jlee@hospital.org"
              className="w-full bg-[#12141c] border border-slate-800 px-3.5 py-2.5 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 block mb-1.5">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full bg-[#12141c] border border-slate-800 px-3.5 py-2.5 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 block mb-1.5">
              Select Role Authorization
            </label>
            <div className="grid grid-cols-1 gap-2.5">
              {ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRequestedRole(opt.value)}
                  className={`text-left p-3.5 border rounded-xl transition-all cursor-pointer flex items-start gap-3 ${
                    requestedRole === opt.value
                      ? opt.value === 'nurse'
                        ? 'bg-rose-950/40 border-rose-500/80 shadow-md shadow-rose-950/40 ring-1 ring-rose-500/50'
                        : 'bg-blue-950/40 border-cyan-400 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-400/50'
                      : 'bg-[#12141c] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="text-xl shrink-0 mt-0.5">{opt.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className={`text-xs font-bold font-mono ${
                        requestedRole === opt.value
                          ? opt.value === 'nurse'
                            ? 'text-rose-300'
                            : 'text-cyan-300'
                          : 'text-slate-200'
                      }`}>
                        {opt.title}
                      </div>
                      <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded uppercase ${
                        requestedRole === opt.value
                          ? opt.value === 'nurse'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'bg-slate-800/80 text-slate-400'
                      }`}>
                        {opt.badge}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-1 leading-snug">{opt.blurb}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {localError && (
            <div className="text-xs text-red-400 bg-red-950/40 border border-red-500/40 px-3 py-2 rounded-xl font-mono">
              ⚠ {localError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold font-mono uppercase tracking-wider py-3 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-cyan-500/20 mt-2"
          >
            {submitting ? 'Submitting Request…' : 'Submit Access Request'}
          </button>
        </form>

        <div className="text-center text-xs text-slate-400 font-mono">
          Already authorized?{' '}
          <button onClick={onGoToLogin} className="text-cyan-400 font-semibold hover:underline">
            Sign In
          </button>
        </div>
      </div>
    </div>
  )
}
