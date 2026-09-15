import { useState } from 'react'
import type { Department, DependencyEdge, DepartmentId, DepartmentPrediction, ScenarioResult } from '../types'
import DeptCard from '../components/DeptCard'
import WaitRadial from '../components/WaitRadial'
import CapacityChart from '../components/CapacityChart'
import RippleMap from '../components/RippleMap'
import { BklitDashboardGrid } from '../components/bklit/BklitDashboardGrid'
import { IconArrow, IconStar } from '../components/Icons'
import { scenarioLabel, scenarioSublabel } from '../lib/format'

interface SituationPageProps {
  departments: Record<DepartmentId, Department>
  predictions: DepartmentPrediction[]
  edges: DependencyEdge[]
  recommendation: ScenarioResult | null
  recommendationLoading: boolean
  onExplore: () => void
  onPreviewRecommendation: () => void
}

export default function SituationPage({
  departments,
  predictions,
  edges,
  recommendation,
  recommendationLoading,
  onExplore,
  onPreviewRecommendation,
}: SituationPageProps) {
  const [viewStyle, setViewStyle] = useState<'bklit' | 'standard'>('bklit')
  const deptList = Object.values(departments)
  const predictionById = Object.fromEntries(predictions.map((p) => [p.department, p]))
  const critical = predictions.filter((p) => p.status === 'critical')
  const warning = predictions.filter((p) => p.status === 'warning')
  const flagged = [...critical, ...warning]
  const topThree = deptList.slice(0, 3)

  const recommendationTouchedIds = recommendation
    ? recommendation.actions.flatMap((a) => [a.from_department, a.to_department].filter(Boolean) as DepartmentId[])
    : []

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 animate-in fade-in duration-300 select-none">
      {/* Top Status Alert Banner in Bklit Dark Aesthetic */}
      <div
        className="relative bg-[#0c0d12] border border-[#232634] p-6 rounded-2xl shadow-2xl overflow-hidden"
        style={{
          boxShadow: critical.length > 0 ? '0 0 24px rgba(239, 68, 68, 0.12)' : '0 0 24px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(#1e2230_1px,transparent_1px)] [background-size:16px_16px] opacity-25 pointer-events-none" />

        <div className="flex items-start justify-between gap-4 flex-wrap relative z-10">
          <div className="flex-1 min-w-[220px]">
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    critical.length > 0 ? 'bg-red-400' : warning.length > 0 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    critical.length > 0 ? 'bg-red-500' : warning.length > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                />
              </span>
              <div
                className={`text-xs font-bold font-mono uppercase tracking-widest ${
                  critical.length > 0 ? 'text-red-400' : warning.length > 0 ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {critical.length > 0 ? 'CRITICAL ALERT · ACTION REQUIRED' : warning.length > 0 ? 'ATTENTION NEEDED' : 'OPERATIONAL TWIN · NOMINAL'}
              </div>
            </div>
            <div className="text-2xl font-bold text-white leading-snug tracking-tight">
              {flagged.length > 0
                ? `${flagged.map((p) => departments[p.department]?.name).join(' & ')} ${
                    flagged.length === 1 ? 'requires' : 'require'
                  } immediate attention.`
                : 'All hospital departments are operating within nominal thresholds.'}
            </div>
            <div className="text-slate-400 mt-2 leading-relaxed text-xs font-mono bg-[#12141c] p-3 rounded-xl border border-slate-800/80">
              {flagged.length > 0 ? flagged[0].status_reason : 'Continuous telemetry monitors active bed buffers and patient queues.'}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {topThree.map((d) => (
              <WaitRadial key={d.id} dept={d} prediction={predictionById[d.id]} />
            ))}
          </div>
        </div>
      </div>

      {/* AI Recommendation Banner */}
      <div className="relative bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-500/40 p-5 rounded-2xl flex items-center justify-between gap-4 flex-wrap shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

        <div className="flex items-start gap-3 relative z-10">
          <div className="w-9 h-9 bg-blue-600/30 border border-blue-400/50 rounded-xl flex items-center justify-center shrink-0 mt-0.5 text-amber-300 shadow-inner">
            <IconStar />
          </div>
          <div>
            <div className="text-[11px] font-bold font-mono text-cyan-300 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <span>⚡ AI SIMULATION RECOMMENDATION</span>
            </div>
            {recommendationLoading ? (
              <div className="text-slate-300 text-sm font-mono">Simulating counterfactual combinations…</div>
            ) : recommendation ? (
              <>
                <div className="font-bold text-lg text-white leading-snug">
                  {scenarioLabel(recommendation, departments)}
                </div>
                <div className="text-slate-300 text-xs font-mono mt-0.5">{scenarioSublabel(recommendation, departments)}</div>
              </>
            ) : (
              <div className="text-slate-400 text-sm">No recommendation available right now.</div>
            )}
          </div>
        </div>
        <button
          onClick={onPreviewRecommendation}
          disabled={!recommendation}
          className="relative z-10 shrink-0 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-cyan-500/20"
        >
          <span>Preview Counterfactual</span> <IconArrow />
        </button>
      </div>

      {/* Dashboard View Switcher */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
          <span>Telemetry & Analytics Engine</span>
        </div>
        <div className="flex items-center gap-1 bg-slate-200 p-1 rounded-lg">
          <button
            onClick={() => setViewStyle('bklit')}
            className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-all ${
              viewStyle === 'bklit'
                ? 'bg-[#09090b] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📊 Bklit Visualizer Matrix
          </button>
          <button
            onClick={() => setViewStyle('standard')}
            className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-all ${
              viewStyle === 'standard'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📋 Standard Cards
          </button>
        </div>
      </div>

      {/* Conditional Chart Presentation */}
      {viewStyle === 'bklit' ? (
        <div className="space-y-6">
          {/* Bklit 4-Quadrant Visual Matrix */}
          <BklitDashboardGrid
            departments={deptList}
            predictions={predictions}
            edges={edges}
          />

          {/* Connected Ripple Map in Dark Blueprint Accents */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CapacityChart departments={deptList} />
            <RippleMap departments={deptList} edges={edges} predictions={predictions} highlightIds={recommendationTouchedIds} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CapacityChart departments={deptList} />
          <RippleMap departments={deptList} edges={edges} predictions={predictions} highlightIds={recommendationTouchedIds} />
        </div>
      )}

      {/* Department Status Inspection Cards */}
      <div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Department status breakdown</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {deptList.map((d) => (
            <DeptCard key={d.id} dept={d} prediction={predictionById[d.id]} />
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2">Tap a department card to see the reason for its status.</p>
      </div>

      {/* Explore Actions */}
      <button
        onClick={onExplore}
        className="w-full bg-[#12141c] hover:bg-[#1a1d28] border border-cyan-500/40 text-cyan-300 hover:text-cyan-200 text-sm font-bold font-mono py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-cyan-950/20 group"
      >
        <span>EXPLORE SCENARIO OPTIMIZATIONS</span>
        <span className="group-hover:translate-x-1 transition-transform">
          <IconArrow />
        </span>
      </button>
    </div>
  )
}
