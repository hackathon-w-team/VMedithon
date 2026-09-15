import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api, ApiError } from '../api/client'

export default function PendingPage() {
  const { user, logout } = useAuth()
  const [checking, setChecking] = useState(false)
  const [stillPending, setStillPending] = useState(false)

  async function checkAgain() {
    setChecking(true)
    setStillPending(false)
    try {
      await api.me()
      window.location.reload()
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        setStillPending(true)
      }
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 px-4 select-none">
      <div className="w-full max-w-sm bg-[#0c0d12] border border-[#232634] p-8 rounded-2xl shadow-2xl text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-xl">
          ⏳
        </div>
        <div className="text-xl font-bold text-white tracking-tight">
          Authorization Pending
        </div>
        <p className="text-xs text-slate-400 font-mono leading-relaxed">
          Hello {user?.name?.split(' ')[0] || 'there'} — your credentials are registered. An administrator must approve your role permissions before you can access the operational twin.
        </p>

        {stillPending && (
          <div className="text-xs text-amber-400 bg-amber-950/40 border border-amber-500/40 px-3 py-2 rounded-xl font-mono">
            Still pending administrator clearance.
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={checkAgain}
            disabled={checking}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold font-mono uppercase tracking-wider py-3 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-cyan-500/20"
          >
            {checking ? 'Polling Clearance…' : 'Check Approval Status'}
          </button>
          <button
            onClick={logout}
            className="w-full text-slate-500 text-xs font-mono py-2 hover:text-slate-300 transition-colors"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  )
}
