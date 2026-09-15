import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { IconLock } from '../components/Icons'

export default function LoginPage({ onGoToSignup }: { onGoToSignup: () => void }) {
  const { login, error, clearError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    clearError()
    setSubmitting(true)
    try {
      await login(email, password)
    } catch {
      // error surfaced via context
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 px-4 select-none">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-600/30 border border-blue-500/50 flex items-center justify-center mx-auto mb-3 rounded-2xl text-cyan-300 shadow-inner">
            <svg width="22" height="22" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" rx="1" fill="#38bdf8" />
              <rect x="8" y="1" width="5" height="5" rx="1" fill="#38bdf8" fillOpacity="0.4" />
              <rect x="1" y="8" width="5" height="5" rx="1" fill="#38bdf8" fillOpacity="0.4" />
              <rect x="8" y="8" width="5" height="5" rx="1" fill="#38bdf8" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            Hospital Digital Twin
          </div>
          <div className="text-xs text-slate-400 font-mono mt-1">
            Command Center & Simulation Twin Portal
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#0c0d12] border border-[#232634] p-7 rounded-2xl shadow-2xl space-y-4">
          <div>
            <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 block mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@hospital.demo"
              className="w-full bg-[#12141c] border border-slate-800 px-3.5 py-2.5 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 block mb-1.5">
              Access Key / Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#12141c] border border-slate-800 px-3.5 py-2.5 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono transition-colors"
            />
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-950/40 border border-red-500/40 px-3 py-2 rounded-xl font-mono">
              ⚠ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold font-mono uppercase tracking-wider py-3 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-cyan-500/20 mt-2"
          >
            {submitting ? 'Authenticating…' : 'Access Command Center'}
          </button>
        </form>

        <div className="text-center text-xs text-slate-400 font-mono">
          Need authorized access?{' '}
          <button onClick={onGoToSignup} className="text-cyan-400 font-semibold hover:underline">
            Request an Account
          </button>
        </div>

        {/* Quick Demo Access Roles */}
        <div className="bg-[#0c0d12] border border-[#232634] p-4 rounded-2xl space-y-2.5">
          <div className="text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <IconLock /> Quick Demo Access (1-Click Fill)
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs font-mono">
            <button
              type="button"
              onClick={() => {
                setEmail('nurse@hospital.demo')
                setPassword('nurse123')
              }}
              className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/40 hover:border-rose-400 text-left transition-all cursor-pointer group"
            >
              <div className="text-rose-300 font-bold flex items-center gap-1">
                <span>👩‍⚕️</span> Nurse
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">nurse123</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail('admin@hospital.demo')
                setPassword('admin123')
              }}
              className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/40 hover:border-blue-400 text-left transition-all cursor-pointer group"
            >
              <div className="text-cyan-300 font-bold flex items-center gap-1">
                <span>🛡️</span> Admin
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">admin123</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail('dataentry@hospital.demo')
                setPassword('data123')
              }}
              className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 hover:border-amber-400 text-left transition-all cursor-pointer group"
            >
              <div className="text-amber-300 font-bold flex items-center gap-1">
                <span>📊</span> Data
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">data123</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
