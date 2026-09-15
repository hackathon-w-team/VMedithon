import { useState } from 'react'
import LiveDeptGrid, { LIVE_GRID_FIELDS } from '../components/LiveDeptGrid'
import { formatTime } from '../lib/format'
import type { HospitalState } from '../types'

export default function DataEntryPage() {
  const [lastSynced, setLastSynced] = useState<Date | null>(null)

  function handleSynced(_s: HospitalState) {
    setLastSynced(new Date())
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 p-6 rounded-xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold">Field Telemetry Ingestion</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight mb-2">
              Ward Patient & Resource Telemetry
            </h1>
            <p className="text-xs md:text-sm text-slate-400 leading-relaxed max-w-xl">
              Enter real-time department indicators (free beds, on-duty clinical staff, active queue depth). Edits are debounced and autosaved directly into the Digital Twin core stream with zero manual export required.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-cyan-400 font-mono bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-lg shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {lastSynced ? `SYNCED ${formatTime(lastSynced.toISOString())}` : 'CONNECTING...'}
          </div>
        </div>
      </div>

      <LiveDeptGrid onSynced={handleSynced} fields={LIVE_GRID_FIELDS} />
    </div>
  )
}
