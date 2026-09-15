import React from 'react'
import type { Department, DepartmentPrediction } from '../../types'

interface BklitConcentricRingsProps {
  departments: Department[]
  predictions: DepartmentPrediction[]
}

export const BklitConcentricRings: React.FC<BklitConcentricRingsProps> = ({
  departments,
  predictions,
}) => {
  const predictionMap = Object.fromEntries(predictions.map((p) => [p.department, p]))
  const totalWaiting = departments.reduce((acc, d) => acc + d.patients_waiting, 0)
  const avgWait =
    predictions.length > 0
      ? Math.round(predictions.reduce((acc, p) => acc + p.predicted_wait_min, 0) / predictions.length)
      : 0

  // 4 Concentric Rings
  const rings = [
    {
      id: 'emergency',
      name: 'Emergency',
      pct: predictionMap['emergency']?.predicted_occupancy_pct ?? 85,
      radius: 78,
      color: '#ef4444',
      strokeWidth: 7,
    },
    {
      id: 'icu',
      name: 'Intensive Care',
      pct: predictionMap['icu']?.predicted_occupancy_pct ?? 83,
      radius: 66,
      color: '#a855f7',
      strokeWidth: 7,
    },
    {
      id: 'general_ward',
      name: 'General Ward',
      pct: predictionMap['general_ward']?.predicted_occupancy_pct ?? 90,
      radius: 54,
      color: '#38bdf8',
      strokeWidth: 7,
    },
    {
      id: 'radiology',
      name: 'Radiology',
      pct: Math.min(100, (departments.find((d) => d.id === 'radiology')?.patients_waiting ?? 9) * 10),
      radius: 42,
      color: '#94a3b8',
      strokeWidth: 7,
    },
  ]

  return (
    <div className="relative bg-[#0c0d12] border border-[#232634] rounded-2xl p-6 overflow-hidden flex flex-col justify-between select-none shadow-2xl group">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e2230_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400">
              Department Load Rings
            </span>
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            Multi-Tier Concurrency
          </div>
        </div>
        <div className="text-right font-mono">
          <div className="text-xs text-slate-400">AVG DELAY</div>
          <div className="text-xs font-bold text-cyan-400">{avgWait} MIN</div>
        </div>
      </div>

      {/* Concentric Rings Visualizer */}
      <div className="relative w-full h-48 flex items-center justify-center z-10 my-2">
        <svg viewBox="0 0 200 200" className="w-48 h-48 -rotate-90">
          {rings.map((ring) => {
            const circumference = 2 * Math.PI * ring.radius
            const strokeDashoffset = circumference - (circumference * Math.min(ring.pct, 100)) / 100

            return (
              <g key={ring.id} className="transition-all duration-300">
                {/* Background track */}
                <circle
                  cx="100"
                  cy="100"
                  r={ring.radius}
                  fill="none"
                  stroke="#1e2230"
                  strokeWidth={ring.strokeWidth}
                />
                {/* Animated value arc */}
                <circle
                  cx="100"
                  cy="100"
                  r={ring.radius}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth={ring.strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </g>
            )
          })}
        </svg>

        {/* Center High-Contrast Metric */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-2xl font-bold font-mono text-white tracking-tight">
            {totalWaiting}
          </div>
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
            QUEUED PTS
          </div>
        </div>
      </div>

      {/* Footer Ring Labels */}
      <div className="grid grid-cols-2 gap-2 border-t border-[#1e2230] pt-2 z-10 text-[11px] font-mono text-slate-400">
        {rings.map((r) => (
          <div key={r.id} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
              <span className="truncate max-w-[80px]">{r.name}</span>
            </div>
            <span className="text-slate-200 font-bold">{r.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
