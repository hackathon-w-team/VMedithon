import type { Department, DepartmentId, ScenarioResult } from '../types'
import { ActionIcon } from '../components/Icons'
import { IconArrow, IconStar } from '../components/Icons'
import { actionIconType, scenarioLabel, scenarioSublabel } from '../lib/format'

export default function ExplorePage({
  scenarios,
  departments,
  loading,
  onSelect,
}: {
  scenarios: ScenarioResult[]
  departments: Record<DepartmentId, Department>
  loading: boolean
  onSelect: (scenario: ScenarioResult) => void
}) {
  const withActions = scenarios.filter((s) => s.actions.length > 0)

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 select-none animate-in fade-in duration-300">
      {/* Top Header Card */}
      <div className="relative bg-[#0c0d12] border border-[#232634] p-6 rounded-2xl shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#1e2230_1px,transparent_1px)] [background-size:16px_16px] opacity-25 pointer-events-none" />
        <div className="relative z-10">
          <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Counterfactual Exploration Matrix</span>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            Select an Optimization Intervention
          </div>
          <div className="text-xs text-slate-400 font-mono mt-1">
            Simulate downstream capacity ripple effects before deploying changes to live wards.
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-sm font-mono text-slate-400 text-center py-12 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
          <span>Executing combinatorial optimizer search…</span>
        </div>
      ) : (
        <div className="space-y-4">
          {withActions.map((scenario, i) => {
            const isRecommended = i === 0
            const iconType = actionIconType(scenario.actions[0])
            return (
              <button
                key={i}
                onClick={() => onSelect(scenario)}
                className={`w-full text-left bg-[#0c0d12] border rounded-2xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl overflow-hidden group ${
                  isRecommended
                    ? 'border-blue-500/60 shadow-lg shadow-blue-950/30'
                    : 'border-[#232634] hover:border-slate-600'
                }`}
              >
                {isRecommended && (
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold font-mono uppercase tracking-widest px-5 py-2 flex items-center gap-2">
                    <IconStar /> AI System Recommended · Optimal Total Wait Reduction
                  </div>
                )}
                <div className="p-5 flex items-center gap-4">
                  <div
                    className={`w-12 h-12 flex items-center justify-center shrink-0 rounded-xl border ${
                      isRecommended
                        ? 'bg-blue-600/20 text-cyan-300 border-blue-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    <ActionIcon type={iconType} />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-white text-base group-hover:text-cyan-400 transition-colors">
                      {scenarioLabel(scenario, departments)}
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-1">
                      {scenarioSublabel(scenario, departments)}
                    </div>
                  </div>
                  <div className="text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all shrink-0">
                    <IconArrow />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Info Card */}
      <div className="bg-[#12141c] border border-slate-800/80 rounded-2xl p-5 text-xs font-mono text-slate-400 leading-relaxed">
        <span className="font-bold text-slate-200">OPTIMIZER TELEMETRY:</span> These scenarios reflect the lowest total hospital wait time solutions found via multi-action combinatorial simulation across interdependent hospital units.
      </div>
    </div>
  )
}
