import React from 'react'
import type { Department3D } from '../adapters/types'

interface DepartmentDetailsPanelProps {
  dept: Department3D | null
  onClose: () => void
  onFocus: (deptId: string) => void
}

export const DepartmentDetailsPanel: React.FC<DepartmentDetailsPanelProps> = ({ dept, onClose, onFocus }) => {
  if (!dept) return null

  const availableBeds = Math.max(0, dept.bedsTotal - dept.bedsOccupied)

  let statusBadgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
  if (dept.status === 'critical') {
    statusBadgeColor = 'bg-red-500/20 text-red-300 border-red-500/30'
  } else if (dept.status === 'warning') {
    statusBadgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30'
  }

  return (
    <div className="absolute right-4 top-20 bottom-20 w-96 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl shadow-2xl flex flex-col z-20 text-white overflow-hidden animate-in fade-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-start justify-between bg-slate-950/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: dept.color }}
            />
            <h3 className="font-bold text-base text-slate-100">{dept.name}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide ${statusBadgeColor}`}>
              {dept.status}
            </span>
            <span className="text-xs text-slate-400 capitalize">{dept.type.replace('_', ' ')} unit</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body: Operational Metrics */}
      <div className="p-4 flex-1 overflow-y-auto space-y-4 text-sm">
        {/* Scenario Deltas Banner if state has changed */}
        {dept.hasModifiedState && (
          <div className="bg-blue-950/40 border border-blue-500/30 rounded-lg p-3">
            <div className="text-xs font-bold text-blue-400 uppercase tracking-wide mb-1">
              ⚡ Scenario Simulation Impact
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {dept.deltaWaitMin !== undefined && (
                <div>
                  <span className="text-slate-400">Wait Delta: </span>
                  <span className={`font-mono font-bold ${dept.deltaWaitMin < 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {dept.deltaWaitMin > 0 ? `+${dept.deltaWaitMin}` : dept.deltaWaitMin} min
                  </span>
                </div>
              )}
              {dept.deltaStaff !== undefined && dept.deltaStaff !== 0 && (
                <div>
                  <span className="text-slate-400">Staff Reallocated: </span>
                  <span className={`font-mono font-bold ${dept.deltaStaff > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {dept.deltaStaff > 0 ? `+${dept.deltaStaff}` : dept.deltaStaff}
                  </span>
                </div>
              )}
              {dept.deltaBeds !== undefined && dept.deltaBeds !== 0 && (
                <div>
                  <span className="text-slate-400">Beds Added: </span>
                  <span className="font-mono font-bold text-emerald-400">+{dept.deltaBeds}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Primary Explanation Box: "Why is this department in this state?" */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            Operational Diagnosis
          </div>
          <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/50 p-2.5 rounded border border-slate-800/80">
            {dept.statusReason}
          </p>
        </div>

        {/* Inpatient Bed Capacity */}
        <div className="bg-slate-950/50 border border-slate-800/80 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">Inpatient Bed Capacity</span>
            <span className="font-mono font-bold text-slate-200">
              {dept.bedsTotal > 0 ? `${dept.bedsOccupied} / ${dept.bedsTotal}` : 'N/A (Outpatient)'}
            </span>
          </div>

          {dept.bedsTotal > 0 ? (
            <>
              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    dept.bedOccupancyPct >= 90
                      ? 'bg-red-500'
                      : dept.bedOccupancyPct >= 80
                      ? 'bg-amber-400'
                      : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(dept.bedOccupancyPct, 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 font-mono pt-1">
                <span>Occupancy: {dept.bedOccupancyPct}%</span>
                <span className={availableBeds === 0 ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                  {availableBeds} beds available
                </span>
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-400">Continuous diagnostic throughput; no overnight beds.</div>
          )}
        </div>

        {/* Patient Load & Predicted Wait Time */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-lg p-3">
            <div className="text-xs text-slate-400">Waiting Patients</div>
            <div className="text-xl font-bold font-mono text-slate-100 mt-1">
              {dept.patientsWaiting}
              <span className="text-xs font-normal text-slate-400 ml-1">pts</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Avg service: {dept.avgServiceTimeMin} min
            </div>
          </div>

          <div className="bg-slate-950/50 border border-slate-800/80 rounded-lg p-3">
            <div className="text-xs text-slate-400">Predicted Wait</div>
            <div
              className={`text-xl font-bold font-mono mt-1 ${
                dept.predictedWaitMin >= 90
                  ? 'text-red-400'
                  : dept.predictedWaitMin >= 45
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {dept.predictedWaitMin}
              <span className="text-xs font-normal text-slate-400 ml-1">min</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {dept.predictedWaitMin >= 90 ? 'Critical Delay' : dept.predictedWaitMin >= 45 ? 'Warning Delay' : 'Within Target'}
            </div>
          </div>
        </div>

        {/* Staffing Allocation */}
        <div className="bg-slate-950/50 border border-slate-800/80 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">Staffing Deployment</span>
            <span className="font-mono font-bold text-slate-200">
              {dept.staffAssigned} on duty / {dept.staffTotal} total
            </span>
          </div>
          {dept.staffShortage > 0 ? (
            <div className="mt-2 text-xs text-red-400 flex items-center gap-1.5">
              <span>⚠ Shortage of {dept.staffShortage} staff member(s) against ideal roster</span>
            </div>
          ) : (
            <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1.5">
              <span>✓ Fully staffed roster</span>
            </div>
          )}
        </div>

        {/* Ripple Dependencies */}
        {dept.dependsOn.length > 0 && (
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-lg p-3">
            <div className="text-xs font-semibold text-slate-300 mb-2">Downstream Dependencies:</div>
            <div className="flex flex-wrap gap-1.5">
              {dept.dependsOn.map((depId) => (
                <button
                  key={depId}
                  onClick={() => onFocus(depId)}
                  className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 font-mono transition-colors"
                >
                  → {depId.replace('_', ' ').toUpperCase()}
                </button>
              ))}
            </div>
            <div className="text-[11px] text-slate-400 mt-2 leading-tight">
              Admissions out of {dept.name} depend on these departments having open beds or diagnostic throughput.
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/50 flex justify-end">
        <button
          onClick={() => onFocus(dept.id)}
          className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md font-medium transition-colors"
        >
          Center 3D Camera
        </button>
      </div>
    </div>
  )
}
