import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError } from '../api/client'
import type { Department, DepartmentId, HospitalState } from '../types'

type FieldKey =
  | 'beds_total'
  | 'beds_occupied'
  | 'staff_total'
  | 'staff_assigned'
  | 'patients_waiting'
  | 'avg_service_time_min'

export const LIVE_GRID_FIELDS: { key: FieldKey; label: string; step?: string }[] = [
  { key: 'beds_total', label: 'Beds Total' },
  { key: 'beds_occupied', label: 'Beds Occ.' },
  { key: 'staff_total', label: 'Staff Total' },
  { key: 'staff_assigned', label: 'Staff On Duty' },
  { key: 'patients_waiting', label: 'Waiting Queue' },
  { key: 'avg_service_time_min', label: 'Svc Time (min)', step: '0.1' },
]

type GridRow = Record<FieldKey, number>

const POLL_MS = 6000
const SAVE_DEBOUNCE_MS = 800
const DIRTY_PROTECT_MS = 2500

function toRow(dept: Department): GridRow {
  return {
    beds_total: dept.beds_total,
    beds_occupied: dept.beds_occupied,
    staff_total: dept.staff_total,
    staff_assigned: dept.staff_assigned,
    patients_waiting: dept.patients_waiting,
    avg_service_time_min: dept.avg_service_time_min,
  }
}

interface LiveDeptGridProps {
  onSynced?: (state: HospitalState) => void
  fields?: typeof LIVE_GRID_FIELDS
}

export default function LiveDeptGrid({ onSynced, fields = LIVE_GRID_FIELDS }: LiveDeptGridProps) {
  const [state, setState] = useState<HospitalState | null>(null)
  const [grid, setGrid] = useState<Record<string, GridRow>>({})
  const [savingIds, setSavingIds] = useState<Set<DepartmentId>>(new Set())
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  const dirtyUntil = useRef<Record<string, number>>({})
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const refresh = useCallback(async () => {
    try {
      const s = await api.getState()
      setState(s)
      onSynced?.(s)
      const now = Date.now()
      setGrid((prev) => {
        const next = { ...prev }
        for (const dept of Object.values(s.departments)) {
          const protectedUntil = dirtyUntil.current[dept.id] || 0
          if (now < protectedUntil) continue
          next[dept.id] = toRow(dept)
        }
        return next
      })
    } catch {
      // Silent on background poll failures
    } finally {
      setLoading(false)
    }
  }, [onSynced])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, POLL_MS)
    return () => clearInterval(id)
  }, [refresh])

  function scheduleSave(deptId: DepartmentId, customRow?: GridRow) {
    dirtyUntil.current[deptId] = Date.now() + DIRTY_PROTECT_MS
    clearTimeout(saveTimers.current[deptId])
    saveTimers.current[deptId] = setTimeout(() => doSave(deptId, customRow), SAVE_DEBOUNCE_MS)
  }

  async function doSave(deptId: DepartmentId, customRow?: GridRow) {
    const row = customRow || grid[deptId]
    if (!row) return

    // Pre-flight logical validation
    if (row.beds_occupied > row.beds_total) {
      setRowErrors((prev) => ({ ...prev, [deptId]: 'Occupied beds cannot exceed total capacity' }))
      return
    }
    if (row.staff_assigned > row.staff_total) {
      setRowErrors((prev) => ({ ...prev, [deptId]: 'Staff on duty cannot exceed total roster' }))
      return
    }

    setSavingIds((prev) => new Set(prev).add(deptId))
    setRowErrors((prev) => ({ ...prev, [deptId]: '' }))
    try {
      const updated = await api.updateDepartment(deptId, row)
      setState(updated)
      onSynced?.(updated)
      dirtyUntil.current[deptId] = Date.now() + 800
    } catch (e) {
      setRowErrors((prev) => ({ ...prev, [deptId]: e instanceof ApiError ? e.message : 'Could not save' }))
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev)
        next.delete(deptId)
        return next
      })
    }
  }

  function updateCell(deptId: DepartmentId, key: FieldKey, rawValue: number) {
    const val = Math.max(0, rawValue)
    setGrid((prev) => {
      const current = prev[deptId]
      if (!current) return prev
      const nextRow = { ...current, [key]: val }

      // Validate logical constraints
      if (key === 'beds_occupied' && val > nextRow.beds_total) {
        setRowErrors((e) => ({ ...e, [deptId]: `Max occupied is ${nextRow.beds_total}` }))
      } else if (key === 'staff_assigned' && val > nextRow.staff_total) {
        setRowErrors((e) => ({ ...e, [deptId]: `Max staff on duty is ${nextRow.staff_total}` }))
      } else {
        setRowErrors((e) => ({ ...e, [deptId]: '' }))
      }

      return { ...prev, [deptId]: nextRow }
    })
    scheduleSave(deptId)
  }

  // Counterfactual Action: Admit 1 Patient into an available bed
  function handleAdmitPatient(deptId: DepartmentId) {
    const row = grid[deptId]
    if (!row) return
    const freeBeds = Math.max(0, row.beds_total - row.beds_occupied)
    if (freeBeds <= 0 || row.patients_waiting <= 0) return

    const updatedRow: GridRow = {
      ...row,
      beds_occupied: row.beds_occupied + 1,
      patients_waiting: row.patients_waiting - 1,
    }

    setGrid((prev) => ({ ...prev, [deptId]: updatedRow }))
    setRowErrors((prev) => ({ ...prev, [deptId]: '' }))
    scheduleSave(deptId, updatedRow)
  }

  // Counterfactual Action: Discharge 1 Patient, freeing up a bed
  function handleDischargePatient(deptId: DepartmentId) {
    const row = grid[deptId]
    if (!row || row.beds_occupied <= 0) return

    const updatedRow: GridRow = {
      ...row,
      beds_occupied: row.beds_occupied - 1,
    }

    setGrid((prev) => ({ ...prev, [deptId]: updatedRow }))
    setRowErrors((prev) => ({ ...prev, [deptId]: '' }))
    scheduleSave(deptId, updatedRow)
  }

  if (loading) {
    return (
      <div className="text-sm font-mono text-cyan-400 p-6 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        Loading reactive telemetry matrix…
      </div>
    )
  }
  if (!state) {
    return <div className="text-sm font-mono text-rose-400 p-6">Telemetry unavailable. Could not fetch hospital state.</div>
  }

  const departments = Object.values(state.departments)

  return (
    <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl overflow-hidden shadow-xl select-none">
      <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
            Real-Time Node Telemetry & Direct Counterfactual Controls
          </span>
        </div>
        <div className="text-[11px] font-mono text-slate-400">
          Admitting patient decreases waiting queue and decreases available beds in real time.
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-950/90 border-b border-slate-800">
              <th className="text-left px-4 py-3 text-xs font-mono font-bold text-slate-400 uppercase tracking-wider sticky left-0 bg-slate-950">
                Department Node
              </th>
              {fields.map((f) => (
                <th key={f.key} className="text-left px-3 py-3 text-xs font-mono font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  {f.label}
                </th>
              ))}
              <th className="text-left px-3 py-3 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider whitespace-nowrap">
                Beds Available
              </th>
              <th className="text-left px-3 py-3 text-xs font-mono font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                Quick Counterfactuals
              </th>
              <th className="px-3 py-3 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {departments.map((dept) => {
              const row = grid[dept.id]
              if (!row) return null
              const isSaving = savingIds.has(dept.id)
              const error = rowErrors[dept.id]
              const freeBeds = Math.max(0, row.beds_total - row.beds_occupied)
              const canAdmit = freeBeds > 0 && row.patients_waiting > 0
              const canDischarge = row.beds_occupied > 0

              return (
                <tr key={dept.id} data-testid={`live-grid-row-${dept.id}`} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-200 whitespace-nowrap sticky left-0 bg-slate-900/95">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      <span>{dept.name}</span>
                    </div>
                  </td>
                  {fields.map((f) => (
                    <td key={f.key} className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        step={f.step || '1'}
                        value={row[f.key]}
                        onChange={(e) => updateCell(dept.id, f.key, Number(e.target.value))}
                        className="w-24 bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 focus:border-cyan-500 focus:bg-slate-950 px-2.5 py-1.5 text-xs text-cyan-300 font-mono rounded focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      row.beds_total === 0
                        ? 'text-slate-500 bg-slate-950'
                        : freeBeds === 0
                        ? 'text-rose-400 bg-rose-950/40 border border-rose-800/40'
                        : 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/40'
                    }`}>
                      {row.beds_total > 0 ? `${freeBeds} free` : 'N/A'}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleAdmitPatient(dept.id)}
                        disabled={!canAdmit || isSaving}
                        title={canAdmit ? "Admit 1 waiting patient into available bed" : "No free beds or waiting queue"}
                        className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        + Admit (Bed -1, Queue -1)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDischargePatient(dept.id)}
                        disabled={!canDischarge || isSaving}
                        title={canDischarge ? "Discharge 1 patient (free +1 bed)" : "No occupied beds to discharge"}
                        className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        - Discharge
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-[11px] whitespace-nowrap text-right">
                    {isSaving && <span className="text-cyan-400 font-mono animate-pulse">Syncing…</span>}
                    {!isSaving && !error && <span className="text-emerald-500 font-mono text-xs">●</span>}
                    {error && <span className="text-rose-400 font-mono text-[10px]">{error}</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
