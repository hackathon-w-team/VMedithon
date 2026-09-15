import { useState, useEffect } from 'react'
import { api } from '../api/client'
import type { NurseNotification, HospitalState, DepartmentPrediction } from '../types'
import { useAuth } from '../context/AuthContext'

export default function NursePortalPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<NurseNotification[]>([])
  const [hospitalState, setHospitalState] = useState<HospitalState | null>(null)
  const [predictions, setPredictions] = useState<DepartmentPrediction[]>([])
  const [loading, setLoading] = useState(true)
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'shifts' | 'ward_vitals' | 'checklist'>('shifts')

  // Checklist state
  const [checks, setChecks] = useState<{ [key: string]: boolean }>({
    vitals_triage: true,
    med_inventory: true,
    icu_bed_sync: false,
    surge_protocol_ack: false,
    handoff_summary: false,
  })

  async function loadData() {
    try {
      const [notifs, state, preds] = await Promise.all([
        api.getNotifications(),
        api.getState(),
        api.getPredictions(),
      ])
      setNotifications(notifs || [])
      setHospitalState(state)
      setPredictions(preds || [])
    } catch (err) {
      console.error('Failed to load nurse portal data', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 10_000)
    return () => clearInterval(interval)
  }, [])

  async function handleAcknowledge(notifId: string) {
    setAcknowledgingId(notifId)
    try {
      const updated = await api.acknowledgeNotification(notifId)
      setNotifications((prev) => prev.map((n) => (n.id === notifId ? updated : n)))
    } catch (err) {
      console.error('Failed to acknowledge notification', err)
    } finally {
      setAcknowledgingId(null)
    }
  }

  const toggleCheck = (key: string) => {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const unreadAlerts = notifications.filter((n) => n?.status === 'unread')
  const acknowledgedAlerts = notifications.filter((n) => n?.status === 'acknowledged')
  const departmentList = hospitalState?.departments ? Object.values(hospitalState.departments) : []

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-slate-100 font-sans select-none">
      {/* Top Banner / Nurse Identity Badge */}
      <div className="bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-950 border border-rose-500/30 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300 text-2xl shadow-inner">
            👩‍⚕️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">
                {user?.name || 'Clinical Care Specialist'}
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase font-bold">
                Registered Nurse (RN)
              </span>
            </div>
            <div className="text-xs text-slate-400 font-mono mt-1 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Status: <strong className="text-emerald-400">On-Duty</strong>
              </span>
              <span>•</span>
              <span>Primary Station: <strong className="text-cyan-300">Emergency & Triage Unit</strong></span>
              <span>•</span>
              <span>Shift: <strong className="text-slate-200">Day Active (07:00 - 19:00)</strong></span>
            </div>
          </div>
        </div>

        {/* Quick Shift Stats */}
        <div className="flex items-center gap-2 self-stretch md:self-auto">
          <div className="bg-slate-900/90 border border-slate-800 px-4 py-2 rounded-xl text-center flex-1 md:flex-initial">
            <div className="text-lg font-bold font-mono text-rose-400">{unreadAlerts.length}</div>
            <div className="text-[10px] text-slate-400 font-mono uppercase">Action Items</div>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 px-4 py-2 rounded-xl text-center flex-1 md:flex-initial">
            <div className="text-lg font-bold font-mono text-emerald-400">{acknowledgedAlerts.length}</div>
            <div className="text-[10px] text-slate-400 font-mono uppercase">Accepted Shifts</div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('shifts')}
          className={`text-xs font-mono font-bold px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'shifts'
              ? 'bg-rose-500 text-slate-950 shadow-md shadow-rose-950/40'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <span>🚨 Shift Reassignments & Tasks</span>
          {unreadAlerts.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'shifts' ? 'bg-slate-950 text-rose-300' : 'bg-rose-500 text-slate-950 animate-pulse'
            }`}>
              {unreadAlerts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('ward_vitals')}
          className={`text-xs font-mono font-bold px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'ward_vitals'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/40'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <span>🏥 Ward Vitals & Bed Telemetry</span>
        </button>

        <button
          onClick={() => setActiveTab('checklist')}
          className={`text-xs font-mono font-bold px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'checklist'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/40'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <span>📋 Clinical Handover Checklist</span>
        </button>
      </div>

      {/* Tab 1: Shift Reassignments & Tasks */}
      {activeTab === 'shifts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200 font-mono uppercase tracking-wider flex items-center gap-2">
              <span>Shift Dispatches & Urgent Reassignment Queue</span>
              <span className="text-xs text-slate-500 font-normal">({notifications.length} total recorded)</span>
            </h2>
            <button
              onClick={loadData}
              className="text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1 cursor-pointer"
            >
              ↻ Refresh
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-500 font-mono">
              Loading nurse dispatch queue…
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-2xl text-center space-y-2">
              <div className="text-2xl">✓</div>
              <div className="text-sm font-bold text-slate-300">All Shift Duties Current</div>
              <p className="text-xs text-slate-500 font-mono">No pending unit reassignments or emergency task dispatches from Admin.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {notifications.map((n) => {
                const actionType = (n.action_type || 'shift').toUpperCase()
                const isCritical = n.action_type === 'surge' || n.title?.toLowerCase().includes('critical') || n.title?.toLowerCase().includes('emergency')
                const fromDept = n.from_department ? n.from_department.replace('_', ' ').toUpperCase() : null
                const toDept = n.to_department ? n.to_department.replace('_', ' ').toUpperCase() : null

                return (
                  <div
                    key={n.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                      n.status === 'unread'
                        ? 'bg-gradient-to-b from-rose-950/30 to-slate-900/90 border-rose-500/50 shadow-lg shadow-rose-950/30 ring-1 ring-rose-500/30'
                        : 'bg-slate-900/60 border-slate-800/80 opacity-80'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            {n.status === 'unread' && <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />}
                            <h3 className="font-bold text-white text-sm tracking-tight">{n.title || 'Shift Notification'}</h3>
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            Priority:{' '}
                            <strong className={isCritical ? 'text-rose-400 font-bold' : 'text-amber-400 font-bold'}>
                              {isCritical ? 'CRITICAL' : 'ROUTINE'}
                            </strong>{' '}
                            • Type: {actionType}
                          </div>
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

                      {/* Department Shift Route Box */}
                      {fromDept && toDept && (
                        <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs font-mono">
                          <div className="text-slate-400">
                            From: <strong className="text-slate-200 block text-xs">{fromDept}</strong>
                          </div>
                          <div className="text-cyan-400 font-bold text-sm">➔</div>
                          <div className="text-emerald-400">
                            Destination: <strong className="text-emerald-300 block text-xs">{toDept}</strong>
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-950/40 p-3 rounded-xl border border-slate-800/50">
                        {n.message}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 font-mono text-[11px] text-slate-400">
                      <div>Dispatched: {n.created_by || 'Admin'}</div>
                      {n.status === 'unread' ? (
                        <button
                          onClick={() => handleAcknowledge(n.id)}
                          disabled={acknowledgingId === n.id}
                          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-emerald-950/50 hover:scale-[1.02]"
                        >
                          {acknowledgingId === n.id ? 'Accepting…' : '✓ Accept & Acknowledge Shift'}
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                          <span>✓</span> Accepted & On-Duty
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Ward Vitals & Bed Telemetry */}
      {activeTab === 'ward_vitals' && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-200 font-mono uppercase tracking-wider">
            Live Department Occupancy & Clinical Nursing Staffing
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {departmentList.map((dept) => {
              const pred = predictions.find((p) => p.department === dept.id)
              const bedsTotal = dept.beds_total || 0
              const bedsOccupied = dept.beds_occupied || 0
              const availableBeds = Math.max(0, bedsTotal - bedsOccupied)
              const occupancy = bedsTotal > 0 ? Math.round((bedsOccupied / bedsTotal) * 100) : 0
              const isBottleneck = pred?.status === 'critical' || occupancy >= 90

              return (
                <div
                  key={dept.id}
                  className={`p-4 rounded-2xl border transition-all space-y-3 ${
                    isBottleneck
                      ? 'bg-rose-950/20 border-rose-500/40'
                      : 'bg-slate-900/80 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-sm text-white">{dept.name}</div>
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        isBottleneck
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      }`}
                    >
                      {isBottleneck ? 'High Load' : 'Normal'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center font-mono">
                    <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                      <div className="text-xs text-slate-400">Waiting</div>
                      <div className="text-sm font-bold text-slate-200">{dept.patients_waiting || 0}</div>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                      <div className="text-xs text-slate-400">Beds Free</div>
                      <div className="text-sm font-bold text-slate-200">{availableBeds}/{bedsTotal}</div>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                      <div className="text-xs text-slate-400">Staff</div>
                      <div className="text-sm font-bold text-cyan-400">{dept.staff_assigned || 0}</div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono text-slate-400">
                      <span>Bed Occupancy:</span>
                      <span className={occupancy >= 90 ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                        {occupancy}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          occupancy >= 90 ? 'bg-rose-500' : occupancy >= 70 ? 'bg-amber-400' : 'bg-cyan-400'
                        }`}
                        style={{ width: `${Math.min(100, occupancy)}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-[11px] font-mono text-slate-400 flex justify-between border-t border-slate-800/60 pt-2">
                    <span>Est. Patient Wait:</span>
                    <strong className={isBottleneck ? 'text-rose-400' : 'text-slate-300'}>
                      {pred ? `${Math.round(pred.predicted_wait_min)} min` : `${Math.round(dept.avg_service_time_min || 0)} min`}
                    </strong>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Clinical Handover Checklist */}
      {activeTab === 'checklist' && (
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Shift Transition & Patient Safety Checklist
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Protocol verification required prior to completing ward rotation handoff.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {[
              { id: 'vitals_triage', label: 'Triage & Vital Signs Reconciliation', desc: 'All incoming emergency admissions categorized with ESI scores.' },
              { id: 'med_inventory', label: 'Emergency Medication Cart & Controlled Substance Log', desc: 'Narcotics count verified with outgoing charge nurse.' },
              { id: 'icu_bed_sync', label: 'ICU Step-Down Bed Allocation Confirmation', desc: 'Critical patients transferred to telemetry units.' },
              { id: 'surge_protocol_ack', label: 'Acknowledge Hospital Surge Plan Phase 2', desc: 'Emergency response protocol reviewed with attending physician.' },
              { id: 'handoff_summary', label: 'Complete Electronic SBAR Handover Record', desc: 'Situation, Background, Assessment, Recommendation logged in EHR.' },
            ].map((item) => (
              <label
                key={item.id}
                onClick={() => toggleCheck(item.id)}
                className={`p-3.5 rounded-xl border flex items-start gap-3.5 cursor-pointer transition-all ${
                  checks[item.id]
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-slate-200'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={!!checks[item.id]}
                  onChange={() => {}}
                  className="mt-0.5 w-4 h-4 rounded text-emerald-500 focus:ring-0 cursor-pointer accent-emerald-500"
                />
                <div className="flex-1 text-xs">
                  <div className={`font-bold font-mono ${checks[item.id] ? 'text-emerald-300' : 'text-slate-300'}`}>
                    {item.label}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">{item.desc}</div>
                </div>
                {checks[item.id] && (
                  <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                    Verified ✓
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
