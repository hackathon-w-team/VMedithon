import React from 'react'

interface TimelineControlProps {
  timestamp?: string
}

export const TimelineControl: React.FC<TimelineControlProps> = ({ timestamp }) => {
  const formattedTime = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '12:00'

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl px-4 py-2 flex items-center gap-4 z-20 text-white shadow-xl">
      <div className="flex items-center gap-2">
        <button
          disabled
          className="p-1 rounded bg-slate-800 text-slate-500 cursor-not-allowed"
          title="Timeline unavailable — simulation operates on steady-state queueing equilibrium rather than historical time-series steps"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </button>
        <span className="text-xs font-mono font-bold text-slate-300">{formattedTime}</span>
      </div>

      <div className="w-48 h-1.5 bg-slate-800 rounded-full relative overflow-hidden">
        <div className="h-full bg-blue-500 w-full" />
      </div>

      <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <span>Steady-State Operational Twin</span>
        <span
          className="text-slate-500 cursor-help ml-1"
          title="The hospital twin model calculates deterministic steady-state queuing outcomes rather than discrete time steps."
        >
          ℹ
        </span>
      </div>
    </div>
  )
}
