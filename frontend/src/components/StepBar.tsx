import type { View } from './Header'

const STEPS: { key: View; label: string; sub: string }[] = [
  { key: 'situation', label: '1. Situation', sub: "What's happening now" },
  { key: 'explore', label: '2. Options', sub: 'What could you try?' },
  { key: 'preview', label: '3. Preview', sub: 'What would happen?' },
]

export default function StepBar({ view }: { view: View }) {
  if (
    view === 'admin' ||
    view === 'decisions' ||
    view === 'manage-data' ||
    view === 'data-feed' ||
    view === 'data-entry' ||
    view === 'digital-twin-3d'
  )
    return null

  const currentIdx = STEPS.findIndex((s) => s.key === view)
  return (
    <div className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-6 py-0 flex items-center justify-center overflow-x-auto select-none scrollbar-none">
      <div className="flex items-center w-full max-w-5xl justify-start sm:justify-center">
        {STEPS.map((step, i) => {
          const active = i === currentIdx
          const done = i < currentIdx
          return (
            <div
              key={step.key}
              className={`flex items-center gap-2.5 px-4 sm:px-6 py-2.5 relative shrink-0 transition-all ${
                active ? 'border-b-2 border-cyan-400 bg-cyan-950/30' : 'border-b-2 border-transparent hover:bg-slate-900/30'
              }`}
              style={{ marginBottom: -1 }}
            >
              <div
                className={`w-5 h-5 flex items-center justify-center text-[11px] font-mono font-bold rounded-md transition-all ${
                  active
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                    : done
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-slate-900 text-slate-500 border border-slate-800'
                }`}
              >
                {done ? '✓' : i + 1}
              </div>
              <div>
                <div
                  className={`text-xs font-semibold tracking-wide ${
                    active ? 'text-cyan-300' : done ? 'text-slate-200' : 'text-slate-500'
                  }`}
                >
                  {step.label}
                </div>
                <div className="text-[10px] text-slate-400 font-mono hidden sm:block">{step.sub}</div>
              </div>
              {i < STEPS.length - 1 && (
                <div className="ml-2 sm:ml-4 text-slate-700">
                  <svg width="6" height="12" viewBox="0 0 8 16" fill="none">
                    <path d="M1 2l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
