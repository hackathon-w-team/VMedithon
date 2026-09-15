import { useEffect, useState } from 'react'
import type { NurseNotification, PublicUser } from '../types'
import { api } from '../api/client'
import { IconBack, IconLogOut } from './Icons'

export type View =
  | 'situation'
  | 'explore'
  | 'preview'
  | 'admin'
  | 'decisions'
  | 'manage-data'
  | 'data-feed'
  | 'data-entry'
  | 'nurse'
  | 'digital-twin-3d'

interface HeaderProps {
  view: View
  showBack: boolean
  onBack: () => void
  user: PublicUser
  onLogout: () => void
  onNavigate: (view: View) => void
}

export default function Header({ view, showBack, onBack, user, onLogout, onNavigate }: HeaderProps) {
  const [now, setNow] = useState(new Date())
  const [notifications, setNotifications] = useState<NurseNotification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  // Poll notifications
  useEffect(() => {
    let mounted = true
    async function fetchNotifs() {
      try {
        const notifs = await api.getNotifications()
        if (mounted) setNotifications(notifs)
      } catch {
        // ignore
      }
    }
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 10_000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  async function handleAcknowledge(notifId: string) {
    setAcknowledgingId(notifId)
    try {
      const updated = await api.acknowledgeNotification(notifId)
      setNotifications((prev) => prev.map((n) => (n.id === notifId ? updated : n)))
    } finally {
      setAcknowledgingId(null)
    }
  }

  const t = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const unreadCount = notifications.filter((n) => n.status === 'unread').length
  const isDashboardActive = view === 'situation' || view === 'explore' || view === 'preview'

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80 px-4 lg:px-6 py-2.5 select-none transition-colors">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Branding & Back Button */}
        <div className="flex items-center gap-3 shrink-0">
          {showBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs font-mono font-medium text-slate-400 hover:text-cyan-400 px-2 py-1 rounded-md hover:bg-slate-900 border border-slate-800 transition-all cursor-pointer"
            >
              <IconBack /> BACK
            </button>
          )}
          <div
            onClick={() => onNavigate(user.role === 'nurse' ? 'nurse' : user.role === 'data_entry' ? 'data-entry' : 'situation')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-inner group-hover:border-cyan-400/80 transition-all">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="8" rx="2" fill="currentColor" fillOpacity="0.15" />
                <rect x="2" y="14" width="20" height="8" rx="2" fill="currentColor" fillOpacity="0.15" />
                <line x1="6" y1="6" x2="6.01" y2="6" strokeWidth="3" />
                <line x1="6" y1="18" x2="6.01" y2="18" strokeWidth="3" />
              </svg>
            </div>
            <div className="hidden sm:block">
              <div className="font-bold text-slate-100 text-sm tracking-tight flex items-center gap-2">
                Hospital Twin
                <span className="text-[9px] font-mono px-1.5 py-0.2 bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 rounded">
                  v3.0
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono tracking-wider uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Command Center
              </div>
            </div>
          </div>
        </div>

        {/* Center: Clean Segmented Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800/90 shadow-xl overflow-x-auto max-w-full scrollbar-none">
          {/* Admin-only: Dashboard Tab */}
          {user.role === 'admin' && (
            <button
              onClick={() => onNavigate('situation')}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                isDashboardActive
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/50 font-bold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="9" rx="1" />
                <rect x="14" y="3" width="7" height="5" rx="1" />
                <rect x="14" y="12" width="7" height="9" rx="1" />
                <rect x="3" y="16" width="7" height="5" rx="1" />
              </svg>
              <span>Dashboard</span>
            </button>
          )}

          {/* Admin-only: Digital Twin 3D / 2D Tab */}
          {user.role === 'admin' && (
            <button
              onClick={() => onNavigate('digital-twin-3d')}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                view === 'digital-twin-3d'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/50 font-bold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              <span>Digital Twin</span>
            </button>
          )}

          {/* Admin-only: Decision Log Tab */}
          {user.role === 'admin' && (
            <button
              onClick={() => onNavigate('decisions')}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                view === 'decisions'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/50 font-bold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span>Decision Log</span>
            </button>
          )}

          {/* Nurse-only: Nurse Care Portal Tab */}
          {user.role === 'nurse' && (
            <button
              onClick={() => onNavigate('nurse')}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                view === 'nurse'
                  ? 'bg-rose-500 text-slate-950 shadow-md shadow-rose-950/50 font-bold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <span className="text-sm">👩‍⚕️</span>
              <span>Nurse Portal</span>
              {unreadCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  view === 'nurse' ? 'bg-slate-950 text-rose-300' : 'bg-rose-500 text-slate-950'
                }`}>
                  {unreadCount}
                </span>
              )}
            </button>
          )}

          {/* Data Entry only: Ward Telemetry Data Entry Tab */}
          {user.role === 'data_entry' && (
            <button
              onClick={() => onNavigate('data-entry')}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                view === 'data-entry'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/50 font-bold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span>Update Data</span>
            </button>
          )}

          {/* Admin-only: Hospital Data Overrides */}
          {user.role === 'admin' && (
            <button
              onClick={() => onNavigate('manage-data')}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                view === 'manage-data'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/50 font-bold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="21" x2="4" y2="14" />
                <line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" />
                <line x1="20" y1="12" x2="20" y2="3" />
                <line x1="1" y1="14" x2="7" y2="14" />
                <line x1="9" y1="8" x2="15" y2="8" />
                <line x1="17" y1="16" x2="23" y2="16" />
              </svg>
              <span>Hospital Data</span>
            </button>
          )}

          {/* Admin-only: Live Data Feed Ingestion */}
          {user.role === 'admin' && (
            <button
              onClick={() => onNavigate('data-feed')}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                view === 'data-feed'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/50 font-bold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3h18v18H3z" />
                <path d="M3 9h18" />
                <path d="M3 15h18" />
                <path d="M9 3v18" />
                <path d="M15 3v18" />
              </svg>
              <span>Data Feed</span>
            </button>
          )}

          {/* Admin-only: Clearance & Personnel Panel */}
          {user.role === 'admin' && (
            <button
              onClick={() => onNavigate('admin')}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                view === 'admin'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/50 font-bold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Admin</span>
            </button>
          )}
        </nav>

        {/* Right: Live Telemetry Indicator, Notification Bell & User Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 relative">
          {/* Notification Bell with Badge */}
          <button
            onClick={() => setShowNotifications((v) => !v)}
            className={`relative p-2 rounded-xl border transition-all cursor-pointer ${
              showNotifications
                ? 'bg-rose-950/80 border-rose-500/80 text-rose-300 shadow-lg shadow-rose-950/50'
                : unreadCount > 0
                ? 'bg-slate-900 border-rose-500/50 text-rose-300 hover:bg-slate-800'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Nurse Shift & Clinical Task Alerts"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-slate-950 font-bold font-mono text-[10px] rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-800">
            <div
              className={`w-8 h-8 rounded-lg border font-mono font-bold text-xs flex items-center justify-center shadow-inner ${
                user.role === 'nurse'
                  ? 'bg-rose-950/80 border-rose-500/50 text-rose-300'
                  : 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300'
              }`}
            >
              {user.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
            </div>
            <div className="hidden lg:block text-left leading-tight">
              <div className="text-xs font-bold text-slate-200 truncate max-w-[120px]">{user.name}</div>
              <div
                className={`text-[10px] font-mono uppercase tracking-wider ${
                  user.role === 'nurse' ? 'text-rose-400 font-bold' : 'text-cyan-400'
                }`}
              >
                {user.role.replace('_', ' ')}
              </div>
            </div>
            <button
              onClick={onLogout}
              className="text-slate-400 hover:text-rose-400 transition-colors p-1.5 rounded-lg hover:bg-slate-800 border border-transparent hover:border-slate-700 cursor-pointer ml-1"
              title="Log out"
            >
              <IconLogOut />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Nurse Shift & Clinical Task Notification Center Modal */}
      {showNotifications && (
        <div className="absolute right-4 top-14 w-[420px] max-w-[calc(100vw-32px)] bg-slate-900/98 backdrop-blur-2xl border border-slate-800 rounded-2xl shadow-2xl z-50 text-white flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 select-none max-h-[calc(100vh-100px)]">
          {/* Drawer Header */}
          <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">👩‍⚕️</span>
              <div>
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  Clinical Shift & Task Alerts
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      {unreadCount} Action Required
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">
                  {user.role === 'nurse' ? 'Nurse Portal Task Dispatches & Reassignments' : 'Hospital Shift Dispatches & Broadcasts'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowNotifications(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Notifications List */}
          <div className="p-4 overflow-y-auto space-y-3 text-xs flex-1">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-slate-500 font-mono">
                ✓ No active notifications or pending task dispatches.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                    n.status === 'unread'
                      ? 'bg-rose-950/20 border-rose-500/40 shadow-md shadow-rose-950/30'
                      : 'bg-slate-950/60 border-slate-800/80 opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-slate-100 text-xs flex items-center gap-2">
                      {n.status === 'unread' && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
                      <span>{n.title}</span>
                    </div>
                    <span
                      className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        n.status === 'unread'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {n.status}
                    </span>
                  </div>

                  {/* Route movement banner if reassignment */}
                  {n.from_department && n.to_department && (
                    <div className="flex items-center gap-2 font-mono text-[11px] bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800 text-cyan-300">
                      <span>🔄 Shift Route:</span>
                      <strong className="text-slate-200">{n.from_department.replace('_', ' ').toUpperCase()}</strong>
                      <span>→</span>
                      <strong className="text-emerald-300">{n.to_department.replace('_', ' ').toUpperCase()}</strong>
                    </div>
                  )}

                  <p className="text-slate-300 text-xs leading-relaxed">{n.message}</p>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/60">
                    <span>Dispatched by: {n.created_by}</span>
                    {n.status === 'unread' ? (
                      <button
                        onClick={() => handleAcknowledge(n.id)}
                        disabled={acknowledgingId === n.id}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1 rounded-lg transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1 shadow-sm shadow-emerald-950/40"
                      >
                        {acknowledgingId === n.id ? 'Accepting…' : '✓ Accept Shift'}
                      </button>
                    ) : (
                      <span className="text-emerald-400">✓ Acknowledged</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </header>
  )
}
