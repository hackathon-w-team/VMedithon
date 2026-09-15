import React from 'react'
import type { Department3D } from '../adapters/types'

interface BottleneckAlertPanelProps {
  bottlenecks: Department3D[]
  onFocusDepartment: (deptId: string) => void
  onClose: () => void
}

export const BottleneckAlertPanel: React.FC<BottleneckAlertPanelProps> = ({
  bottlenecks,
  onFocusDepartment,
  onClose,
}) => {
  if (bottlenecks.length === 0) {
    return (
      <div className="absolute left-4 top-20 bg-slate-900/95 backdrop-blur-md border border-emerald-500/30 rounded-xl p-3 shadow-xl z-20 text-white max-w-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <span>✓ No Critical Bottlenecks Detected</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>
        <div className="text-[11px] text-slate-400 mt-1">
          All departments are operating within designed capacity thresholds.
        </div>
      </div>
    )
  }

  return (
    <div className="absolute left-4 top-20 bg-slate-900/95 backdrop-blur-md border border-red-500/40 rounded-xl p-4 shadow-2xl z-20 text-white max-w-md animate-in fade-in slide-in-from-left duration-200">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          <h4 className="font-bold text-xs uppercase tracking-wide text-red-400 font-mono">
            CRITICAL BOTTLENECK ANALYSIS
          </h4>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white p-0.5">
          ✕
        </button>
      </div>

      <div className="space-y-2.5">
        {bottlenecks.map((dept) => (
          <div key={dept.id} className="bg-slate-950/60 p-3 rounded-lg border border-red-500/20">
            <div className="flex items-center justify-between text-xs font-bold mb-1">
              <span className="text-slate-100">{dept.name}</span>
              <span className="text-red-400 font-mono">
                {dept.predictedWaitMin}m wait · {dept.bedOccupancyPct}% occ
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-900/70 p-2 rounded border border-slate-800">
              {dept.statusReason}
            </p>

            {dept.dependsOn.length > 0 && (
              <div className="mt-2 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-300">Downstream ripple pressure: </span>
                {dept.dependsOn.map((d) => d.replace('_', ' ').toUpperCase()).join(', ')}
              </div>
            )}

            <button
              onClick={() => onFocusDepartment(dept.id)}
              className="mt-2 text-[11px] text-blue-400 hover:text-blue-300 font-medium underline"
            >
              Inspect {dept.name} in 3D →
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
