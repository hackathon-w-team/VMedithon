import { useState } from 'react'
import type { Department, DepartmentPrediction } from '../types'
import { STATUS } from '../lib/status'

export default function DeptCard({ dept, prediction }: { dept: Department; prediction?: DepartmentPrediction }) {
  const status = prediction?.status || 'ok'
  const cfg = STATUS[status]
  const bedPct = dept.beds_total ? Math.round((dept.beds_occupied / dept.beds_total) * 100) : 0
  const staffPct = dept.staff_total ? Math.round((dept.staff_assigned / dept.staff_total) * 100) : 0
  const [open, setOpen] = useState(false)
  const isCrit = status === 'critical'
  const isWarn = status === 'warning'

  let badgeBorder = 'border-slate-800 bg-slate-900/60 text-slate-300'
  if (isCrit) badgeBorder = 'border-red-500/40 bg-red-950/40 text-red-400'
  else if (isWarn) badgeBorder = 'border-amber-500/40 bg-amber-950/40 text-amber-400'

  return (
    <div
      className="relative bg-[#0c0d12] border border-[#232634] rounded-2xl p-4 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-600 hover:shadow-2xl select-none group"
      style={{
        boxShadow: isCrit ? '0 0 20px rgba(239, 68, 68, 0.15)' : undefined,
      }}
      onClick={() => setOpen((v) => !v)}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            {(isCrit || isWarn) && (
              <span className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isCrit ? 'bg-red-400' : 'bg-amber-400'}`} />
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isCrit ? 'bg-red-500' : 'bg-amber-500'}`} />
              </span>
            )}
            <div className="font-bold text-white text-sm group-hover:text-cyan-400 transition-colors">
              {dept.name}
            </div>
          </div>
          <span className={`inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 mt-1.5 rounded border ${badgeBorder}`}>
            {cfg.label}
          </span>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-2xl font-bold font-mono ${isCrit ? 'text-red-400' : 'text-white'}`} style={{ lineHeight: 1 }}>
            {prediction?.predicted_wait_min ?? 0}
            <span className="text-xs font-normal text-slate-400 ml-1">min</span>
          </div>
          {dept.patients_waiting > 0 && (
            <div className={`text-[11px] font-mono mt-1 ${dept.patients_waiting > 10 ? 'text-red-400 font-bold' : 'text-slate-400'}`}>
              {dept.patients_waiting} waiting
            </div>
          )}
        </div>
      </div>

      <div className="mt-3.5 space-y-2">
        {/* Beds */}
        <div>
          <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-mono">
            <span>BEDS OCCUPIED</span>
            <span className="text-white font-bold">
              {dept.beds_occupied}/{dept.beds_total} · {bedPct}%
            </span>
          </div>
          <div className="h-1.5 bg-[#1e2230] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${bedPct}%`,
                background: bedPct >= 95 ? '#ef4444' : bedPct >= 85 ? '#f59e0b' : '#10b981',
              }}
            />
          </div>
        </div>

        {/* Staff */}
        <div>
          <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-mono">
            <span>STAFF DEPLOYED</span>
            <span className="text-white font-bold">
              {dept.staff_assigned}/{dept.staff_total} · {staffPct}%
            </span>
          </div>
          <div className="h-1.5 bg-[#1e2230] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${staffPct}%`,
                background: staffPct >= 90 ? '#ef4444' : staffPct >= 75 ? '#f59e0b' : '#38bdf8',
              }}
            />
          </div>
        </div>
      </div>

      {open && prediction && (
        <div className="mt-3 pt-3 border-t border-[#1e2230] text-xs text-slate-300 leading-relaxed bg-[#12141c] p-2.5 rounded-xl font-mono">
          {prediction.status_reason}
        </div>
      )}
    </div>
  )
}
