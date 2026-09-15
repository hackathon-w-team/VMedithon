import { useEffect, useState, useCallback } from 'react'
import { api } from '../api/client'
import type { PublicUser, UserRole } from '../types'

const ROLE_BADGE_STYLE: Record<UserRole, string> = {
  admin: 'bg-purple-950/60 border border-purple-500/40 text-purple-300',
  nurse: 'bg-rose-950/60 border border-rose-500/40 text-rose-300',
  data_entry: 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300',
}

const ASSIGNABLE_ROLES: UserRole[] = ['nurse', 'data_entry', 'admin']

export default function AdminPage() {
  const [users, setUsers] = useState<PublicUser[]>([])
  const [loading, setLoading] = useState(true)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null)

  // Dispatch task state
  const [dispatchTitle, setDispatchTitle] = useState('')
  const [dispatchMessage, setDispatchMessage] = useState('')
  const [fromDept, setFromDept] = useState<'emergency' | 'icu' | 'general_ward' | 'radiology'>('radiology')
  const [toDept, setToDept] = useState<'emergency' | 'icu' | 'general_ward' | 'radiology'>('emergency')
  const [dispatching, setDispatching] = useState(false)
  const [dispatchSuccess, setDispatchSuccess] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const all = await api.allUsers()
      setUsers(all)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function approve(id: string) {
    setApprovingId(id)
    try {
      await api.approveUser(id)
      await load()
    } finally {
      setApprovingId(null)
    }
  }

  async function changeRole(id: string, role: UserRole) {
    setChangingRoleId(id)
    try {
      await api.setUserRole(id, role)
      await load()
    } finally {
      setChangingRoleId(null)
    }
  }

  async function handleDispatchTask(e: React.FormEvent) {
    e.preventDefault()
    if (!dispatchTitle.trim()) return
    setDispatching(true)
    setDispatchSuccess(null)
    try {
      await api.dispatchNotification({
        title: dispatchTitle,
        message: dispatchMessage || `Reassigned from ${fromDept.replace('_', ' ').toUpperCase()} to ${toDept.replace('_', ' ').toUpperCase()} to assist with operational surge.`,
        from_department: fromDept,
        to_department: toDept,
        target_role: 'nurse',
        action_type: 'reassignment',
      })
      setDispatchSuccess('Shift reassignment alert dispatched to all active Nurses!')
      setDispatchTitle('')
      setDispatchMessage('')
      setTimeout(() => setDispatchSuccess(null), 5000)
    } catch {
      // ignore
    } finally {
      setDispatching(false)
    }
  }

  const pending = users.filter((u) => u.status === 'pending')
  const approved = users.filter((u) => u.status === 'approved')
  const nurses = approved.filter((u) => u.role === 'nurse')

  if (loading && users.length === 0) {
    return (
      <div className="p-8 text-center text-xs font-mono text-slate-400 select-none">
        <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto mb-3" />
        Loading personnel directory…
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 select-none font-sans">
      {/* Header Banner */}
      <div className="bg-[#0c0d12] border border-[#232634] p-5 rounded-2xl flex items-center justify-between shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase font-bold tracking-widest mb-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            Clearance Administration
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Personnel Directory & Shift Dispatch</h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Authorize accounts, assign role permissions, and dispatch real-time shift alerts to nurses.
          </p>
        </div>
      </div>

      {/* Nurse Shift & Task Dispatch Form */}
      <div className="bg-[#0c0d12] border border-rose-500/30 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-5 py-3 border-b border-rose-500/20 bg-rose-950/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold font-mono text-rose-300 uppercase tracking-widest">
            <span>👩‍⚕️</span> Nurse Task Dispatch & Shift Reassignment
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
            {nurses.length} Registered Nurse{nurses.length !== 1 ? 's' : ''}
          </span>
        </div>

        <form onSubmit={handleDispatchTask} className="p-5 space-y-3.5 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Task / Alert Title</label>
              <input
                required
                value={dispatchTitle}
                onChange={(e) => setDispatchTitle(e.target.value)}
                placeholder="e.g. Urgent Triage Bay 2 Reassignment"
                className="w-full bg-[#12141c] border border-slate-800 px-3 py-2 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-400 font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">From Unit</label>
                <select
                  value={fromDept}
                  onChange={(e) => setFromDept(e.target.value as any)}
                  className="w-full bg-[#12141c] border border-slate-800 px-2 py-2 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-rose-400 font-mono cursor-pointer"
                >
                  <option value="radiology">Radiology</option>
                  <option value="general_ward">General Ward</option>
                  <option value="icu">ICU</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">To Unit</label>
                <select
                  value={toDept}
                  onChange={(e) => setToDept(e.target.value as any)}
                  className="w-full bg-[#12141c] border border-slate-800 px-2 py-2 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-rose-400 font-mono cursor-pointer"
                >
                  <option value="emergency">Emergency</option>
                  <option value="icu">ICU</option>
                  <option value="general_ward">General Ward</option>
                  <option value="radiology">Radiology</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-mono text-slate-400 block mb-1">Clinical Instructions / Message</label>
            <input
              value={dispatchMessage}
              onChange={(e) => setDispatchMessage(e.target.value)}
              placeholder="e.g. Please report immediately to handle acute triage surge (+2 Staff surge)."
              className="w-full bg-[#12141c] border border-slate-800 px-3 py-2 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-400 font-mono"
            />
          </div>

          {dispatchSuccess && (
            <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 rounded-xl font-mono text-xs">
              ✓ {dispatchSuccess}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={dispatching}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold font-mono text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-md shadow-rose-950/50 cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              <span>📢</span>
              <span>{dispatching ? 'Dispatching Alert…' : 'Dispatch Task Alert to Nurses'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Pending Authorization Requests Section */}
      <div className="bg-[#0c0d12] border border-[#232634] rounded-2xl overflow-hidden shadow-xl">
        <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between">
          <div className="text-xs font-bold font-mono text-amber-400 uppercase tracking-widest flex items-center gap-2">
            <span>⚠</span> Pending Authorization Queue ({pending.length})
          </div>
        </div>

        {pending.length === 0 ? (
          <div className="p-6 text-center text-xs font-mono text-slate-500">
            ✓ No pending access requests in queue.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {pending.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-900/40 transition-colors gap-3">
                <div>
                  <div className="text-sm font-bold text-white">{u.name}</div>
                  <div className="text-xs font-mono text-slate-400">{u.email}</div>
                  <div className="text-[11px] font-mono text-amber-300 mt-0.5">
                    Requested Clearance: <span className="font-bold uppercase">{u.role.replace('_', ' ')}</span>
                  </div>
                </div>
                <button
                  onClick={() => approve(u.id)}
                  disabled={approvingId === u.id}
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold font-mono uppercase tracking-wider px-4 py-2 rounded-xl transition-all disabled:opacity-50 shadow-md shadow-cyan-500/20 cursor-pointer"
                >
                  {approvingId === u.id ? 'Authorizing…' : 'Authorize'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Accounts Section */}
      <div className="bg-[#0c0d12] border border-[#232634] rounded-2xl overflow-hidden shadow-xl">
        <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-950/60">
          <div className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-widest">
            Active Personnel Roster ({approved.length})
          </div>
        </div>
        <div className="divide-y divide-slate-800/60">
          {approved.map((u) => (
            <div key={u.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-900/40 transition-colors gap-3">
              <div>
                <div className="text-sm font-bold text-white">{u.name}</div>
                <div className="text-xs font-mono text-slate-400">{u.email}</div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-[10px] font-bold font-mono px-2.5 py-1 rounded uppercase tracking-wide ${ROLE_BADGE_STYLE[u.role]}`}
                >
                  {u.role.replace('_', ' ')}
                </span>
                {u.email.toLowerCase() === 'admin@hospital.demo' ? (
                  <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/40 px-2.5 py-1 rounded">
                    Root Admin (Locked)
                  </span>
                ) : (
                  <select
                    value={u.role}
                    disabled={changingRoleId === u.id}
                    onChange={(e) => changeRole(u.id, e.target.value as UserRole)}
                    className="text-xs font-mono bg-[#12141c] border border-slate-800 text-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-cyan-400 disabled:opacity-50 cursor-pointer"
                  >
                    {ASSIGNABLE_ROLES.map((r) => (
                      <option key={r} value={r} className="bg-slate-900 text-slate-100">
                        {r.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
