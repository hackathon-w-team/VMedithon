import { useEffect, useState } from 'react'
import { api, ApiError } from '../api/client'
import type { Department, DepartmentId, HospitalState } from '../types'

type EditableFields = Pick<
  Department,
  'beds_total' | 'beds_occupied' | 'staff_total' | 'staff_assigned' | 'patients_waiting' | 'avg_service_time_min' | 'depends_on'
>

function toEditable(dept: Department): EditableFields {
  return {
    beds_total: dept.beds_total,
    beds_occupied: dept.beds_occupied,
    staff_total: dept.staff_total,
    staff_assigned: dept.staff_assigned,
    patients_waiting: dept.patients_waiting,
    avg_service_time_min: dept.avg_service_time_min,
    depends_on: dept.depends_on,
  }
}

const NUMERIC_FIELDS: { key: keyof EditableFields; label: string; step?: string }[] = [
  { key: 'beds_total', label: 'Beds Total (Capacity)' },
  { key: 'beds_occupied', label: 'Beds Occupied' },
  { key: 'staff_total', label: 'Staff Total (Roster)' },
  { key: 'staff_assigned', label: 'Staff On Duty' },
  { key: 'patients_waiting', label: 'Patients Waiting (Queue)' },
  { key: 'avg_service_time_min', label: 'Avg Svc Time (min)', step: '0.1' },
]

export default function ManageDataPage() {
  const [state, setState] = useState<HospitalState | null>(null)
  const [edits, setEdits] = useState<Record<string, EditableFields>>({})
  const [savingId, setSavingId] = useState<DepartmentId | null>(null)
  const [savedId, setSavedId] = useState<DepartmentId | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .getState()
      .then((s) => {
        setState(s)
        const initial: Record<string, EditableFields> = {}
        Object.values(s.departments).forEach((d) => {
          initial[d.id] = toEditable(d)
        })
        setEdits(initial)
      })
      .finally(() => setLoading(false))
  }, [])

  function updateField(deptId: DepartmentId, key: keyof EditableFields, rawValue: number) {
    const value = Math.max(0, rawValue)
    setEdits((prev) => {
      const current = prev[deptId]
      if (!current) return prev
      const next = { ...current, [key]: value }

      // Validate logical constraints
      if (key === 'beds_occupied' && value > next.beds_total) {
        setErrors((e) => ({ ...e, [deptId]: `Occupied beds (${value}) cannot exceed total beds (${next.beds_total})` }))
      } else if (key === 'staff_assigned' && value > next.staff_total) {
        setErrors((e) => ({ ...e, [deptId]: `Staff on duty (${value}) cannot exceed total staff (${next.staff_total})` }))
      } else {
        setErrors((e) => ({ ...e, [deptId]: '' }))
      }

      return { ...prev, [deptId]: next }
    })
  }

  // Counterfactual Action: Admit 1 patient
  function handleAdmit(deptId: DepartmentId) {
    setEdits((prev) => {
      const current = prev[deptId]
      if (!current) return prev
      const freeBeds = Math.max(0, current.beds_total - current.beds_occupied)
      if (freeBeds <= 0 || current.patients_waiting <= 0) return prev
      return {
        ...prev,
        [deptId]: {
          ...current,
          beds_occupied: current.beds_occupied + 1,
          patients_waiting: current.patients_waiting - 1,
        },
      }
    })
    setErrors((e) => ({ ...e, [deptId]: '' }))
  }

  // Counterfactual Action: Discharge 1 patient
  function handleDischarge(deptId: DepartmentId) {
    setEdits((prev) => {
      const current = prev[deptId]
      if (!current || current.beds_occupied <= 0) return prev
      return {
        ...prev,
        [deptId]: {
          ...current,
          beds_occupied: current.beds_occupied - 1,
        },
      }
    })
    setErrors((e) => ({ ...e, [deptId]: '' }))
  }

  function toggleDependsOn(deptId: DepartmentId, otherId: DepartmentId) {
    setEdits((prev) => {
      const current = prev[deptId].depends_on
      const next = current.includes(otherId) ? current.filter((d) => d !== otherId) : [...current, otherId]
      return { ...prev, [deptId]: { ...prev[deptId], depends_on: next } }
    })
  }

  async function handleSave(deptId: DepartmentId) {
    const draft = edits[deptId]
    if (!draft) return

    // Pre-save validation
    if (draft.beds_occupied > draft.beds_total) {
      setErrors((prev) => ({ ...prev, [deptId]: 'Occupied beds cannot exceed total capacity' }))
      return
    }
    if (draft.staff_assigned > draft.staff_total) {
      setErrors((prev) => ({ ...prev, [deptId]: 'Staff on duty cannot exceed total roster' }))
      return
    }

    setSavingId(deptId)
    setErrors((prev) => ({ ...prev, [deptId]: '' }))
    setSavedId(null)
    try {
      const updated = await api.updateDepartment(deptId, draft)
      setState(updated)
      setEdits((prev) => ({ ...prev, [deptId]: toEditable(updated.departments[deptId]) }))
      setSavedId(deptId)
      setTimeout(() => setSavedId((current) => (current === deptId ? null : current)), 2500)
    } catch (e) {
      setErrors((prev) => ({ ...prev, [deptId]: e instanceof ApiError ? e.message : 'Could not save changes' }))
    } finally {
      setSavingId(null)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-sm text-cyan-400 font-mono flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        Loading hospital telemetry…
      </div>
    )
  }
  if (!state) {
    return <div className="max-w-4xl mx-auto p-6 text-sm text-rose-400 font-mono">Telemetry stream unavailable. Could not load hospital state.</div>
  }

  const departments = Object.values(state.departments)

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 select-none">
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 p-6 rounded-xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold">Node Telemetry Configuration</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight mb-2">
          Hospital Node Overrides & Counterfactuals
        </h1>
        <p className="text-xs md:text-sm text-slate-400 leading-relaxed max-w-2xl">
          Directly configure bed capacities, active roster duty, waiting queues, and service times. Admitting patients automatically reduces waiting queues and consumes available beds in real time.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5">
        {departments.map((dept) => {
          const draft = edits[dept.id]
          if (!draft) return null
          const otherDepts = departments.filter((d) => d.id !== dept.id)
          const isSaving = savingId === dept.id
          const isSaved = savedId === dept.id
          const error = errors[dept.id]
          const freeBeds = Math.max(0, draft.beds_total - draft.beds_occupied)
          const canAdmit = freeBeds > 0 && draft.patients_waiting > 0
          const canDischarge = draft.beds_occupied > 0
          const estWait = Math.round((draft.patients_waiting * draft.avg_service_time_min) / Math.max(1, draft.staff_assigned))

          return (
            <div key={dept.id} data-testid={`dept-card-${dept.id}`} className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl overflow-hidden shadow-md transition-all hover:border-slate-700">
              <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-500" />
                  <span className="text-sm font-bold text-slate-200 tracking-wide">{dept.name}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-slate-400 bg-slate-800/60 border border-slate-700/50 px-2.5 py-0.5 rounded">
                    Free: <strong className={freeBeds === 0 && draft.beds_total > 0 ? 'text-rose-400' : 'text-emerald-400'}>{freeBeds}</strong> beds
                  </span>
                  <span className="text-slate-400 bg-slate-800/60 border border-slate-700/50 px-2.5 py-0.5 rounded">
                    Est. Wait: <strong className="text-cyan-300">{estWait}m</strong>
                  </span>
                </div>
              </div>

              {/* Quick Counterfactual Admission Controls */}
              <div className="px-5 py-3 bg-slate-950/40 border-b border-slate-800/60 flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-mono text-slate-400">
                  Direct Admission Action:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAdmit(dept.id)}
                    disabled={!canAdmit}
                    className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    + Admit 1 Patient (Beds -1, Queue -1)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDischarge(dept.id)}
                    disabled={!canDischarge}
                    className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    - Discharge Patient (Beds +1)
                  </button>
                </div>
              </div>

              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {NUMERIC_FIELDS.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <label className="text-[11px] font-mono font-medium text-slate-400 block tracking-wide">
                      {field.label}
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={field.step || '1'}
                      value={draft[field.key] as number}
                      onChange={(e) => updateField(dept.id, field.key, Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-colors"
                    />
                  </div>
                ))}
              </div>

              <div className="px-5 pb-4">
                <label className="text-[11px] font-mono font-medium text-slate-400 block mb-2 tracking-wide">
                  Upstream Dependencies (Transfers & Flow Routing)
                </label>
                <div className="flex flex-wrap gap-2">
                  {otherDepts.map((other) => {
                    const checked = draft.depends_on.includes(other.id)
                    return (
                      <button
                        key={other.id}
                        type="button"
                        onClick={() => toggleDependsOn(dept.id, other.id)}
                        className={`text-xs font-mono font-medium px-3 py-1.5 rounded-lg border transition-all ${
                          checked
                            ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 shadow-sm shadow-cyan-950'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                        }`}
                      >
                        {checked ? '✓ ' : '+ '}{other.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="px-5 py-3.5 bg-slate-950/40 border-t border-slate-800/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleSave(dept.id)}
                    disabled={isSaving || !!error}
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold font-mono px-4 py-2 rounded-lg transition-all shadow-md shadow-cyan-950/40 disabled:opacity-50 cursor-pointer"
                  >
                    {isSaving ? 'UPDATING...' : 'COMMIT OVERRIDE'}
                  </button>
                  {isSaved && (
                    <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-800/50 px-2.5 py-1 rounded">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Live in simulation engine
                    </span>
                  )}
                  {error && <span className="text-xs font-mono text-rose-400 bg-rose-950/40 border border-rose-800/50 px-2.5 py-1 rounded">{error}</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
