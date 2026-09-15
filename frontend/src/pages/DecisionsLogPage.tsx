import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { DecisionLogEntry } from '../types'
import { formatDateTime } from '../lib/format'

const KIND_LABEL: Record<string, string> = {
  simulate: 'Ran custom scenario',
  optimize: 'Requested recommendation',
  reset: 'Reset demo data',
  data_update: 'Updated hospital data',
}

const KIND_CLS: Record<string, string> = {
  simulate: 'bg-blue-950/60 border border-blue-500/40 text-cyan-300',
  optimize: 'bg-purple-950/60 border border-purple-500/40 text-purple-300',
  reset: 'bg-slate-850 border border-slate-700 text-slate-300',
  data_update: 'bg-amber-950/60 border border-amber-500/40 text-amber-300',
}

export default function DecisionsLogPage() {
  const [entries, setEntries] = useState<DecisionLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .decisions()
      .then(setEntries)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 select-none animate-in fade-in duration-300">
      <div className="relative bg-[#0c0d12] border border-[#232634] p-6 rounded-2xl shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#1e2230_1px,transparent_1px)] [background-size:16px_16px] opacity-25 pointer-events-none" />
        <div className="relative z-10">
          <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Audit Trail & Historical Telemetry</span>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            Decision & Intervention Logs
          </div>
          <div className="text-xs text-slate-400 font-mono mt-1">
            Historical audit record of all simulation runs, optimizations, and data updates.
          </div>
        </div>
      </div>

      <div className="bg-[#0c0d12] border border-[#232634] rounded-2xl overflow-hidden shadow-xl">
        <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-950/60">
          <div className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-widest">
            Recorded Operational Actions
          </div>
        </div>
        {loading ? (
          <div className="p-6 text-xs font-mono text-slate-400">Loading historical audit logs…</div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-xs font-mono text-slate-500 text-center">
            No scenarios or data changes have been recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {entries.map((entry) => (
              <div key={entry.id} className="p-5 hover:bg-slate-900/40 transition-colors">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-[10px] font-bold font-mono uppercase tracking-wider px-2 py-0.5 rounded ${KIND_CLS[entry.kind]}`}
                    >
                      {KIND_LABEL[entry.kind] || entry.kind}
                    </span>
                    <span className="text-sm font-bold text-white">{entry.user_name}</span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">{formatDateTime(entry.timestamp)}</span>
                </div>
                {entry.action_labels.length > 0 && (
                  <ul className="mt-2.5 text-xs text-slate-300 font-mono list-disc list-inside space-y-1 bg-[#12141c] p-3 rounded-xl border border-slate-800/60">
                    {entry.action_labels.map((label, i) => (
                      <li key={i}>{label}</li>
                    ))}
                  </ul>
                )}
                {(entry.total_wait_min !== null || entry.score !== null) && (
                  <div className="mt-2.5 flex gap-4 text-xs text-slate-400 font-mono">
                    {entry.total_wait_min !== null && (
                      <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        Predicted Total Wait: <strong className="text-cyan-300">{entry.total_wait_min}m</strong>
                      </span>
                    )}
                    {entry.score !== null && (
                      <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        Optimization Score: <strong className="text-emerald-300">{entry.score}</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
