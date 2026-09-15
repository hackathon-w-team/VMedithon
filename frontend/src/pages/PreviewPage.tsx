import { useEffect, useState } from 'react'
import type { Department, DepartmentId, DepartmentPrediction, ScenarioResult } from '../types'
import { ActionIcon, IconCheck } from '../components/Icons'
import WaitComparisonChart from '../components/WaitComparisonChart'
import DeltaRow from '../components/DeltaRow'
import { actionIconType, buildScenarioPreview, scenarioLabel } from '../lib/format'

export default function PreviewPage({
  scenario,
  baseline,
  departments,
}: {
  scenario: ScenarioResult
  baseline: DepartmentPrediction[]
  departments: Record<DepartmentId, Department>
}) {
  const [showCalc, setShowCalc] = useState(false)
  const preview = buildScenarioPreview(baseline, scenario, departments)
  const deptIds = Object.keys(preview.waitBefore)

  useEffect(() => {
    setShowCalc(false)
  }, [scenario])

  const totalBefore = deptIds.reduce((s, id) => s + preview.waitBefore[id], 0)
  const totalAfter = deptIds.reduce((s, id) => s + preview.waitAfter[id], 0)
  const biggestImpact = deptIds.reduce((max, id) => {
    const drop = preview.waitBefore[id] - preview.waitAfter[id]
    return drop > max ? drop : max
  }, 0)
  const iconType = scenario.actions.length > 0 ? actionIconType(scenario.actions[0]) : 'redirect'

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 select-none animate-in fade-in duration-300">
      {/* Scenario Header Card */}
      <div className="relative bg-[#0c0d12] border border-[#232634] p-6 rounded-2xl shadow-2xl overflow-hidden flex items-start gap-4">
        <div className="absolute inset-0 bg-[radial-gradient(#1e2230_1px,transparent_1px)] [background-size:16px_16px] opacity-25 pointer-events-none" />
        <div className="w-12 h-12 flex items-center justify-center shrink-0 rounded-xl bg-blue-600/20 border border-blue-500/40 text-cyan-300 relative z-10 shadow-inner">
          <ActionIcon type={iconType} />
        </div>
        <div className="relative z-10">
          <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest mb-1">
            ⚡ Counterfactual Simulation Preview
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {scenarioLabel(scenario, departments)}
          </div>
        </div>
      </div>

      {/* Impact Headline */}
      <div className="border border-emerald-500/40 bg-emerald-950/30 p-5 rounded-2xl flex items-center gap-3.5 shadow-lg shadow-emerald-950/20">
        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
          <IconCheck />
        </div>
        <div>
          <div className="font-bold text-emerald-300 text-base">{preview.headline}</div>
          <div className="text-xs font-mono text-slate-300 mt-0.5">{preview.summary}</div>
        </div>
      </div>

      {/* 3 High-Impact KPI Blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Time saved, biggest impact',
            value: `${Math.round(biggestImpact * 10) / 10} min`,
            color: 'text-emerald-400',
            border: 'border-emerald-500/30',
          },
          {
            label: 'Departments still critical',
            value: preview.stillCritical.length === 0 ? 'None' : String(preview.stillCritical.length),
            color: 'text-cyan-400',
            border: 'border-cyan-500/30',
          },
          {
            label: 'Total wait reduced by',
            value: `${Math.round((totalBefore - totalAfter) * 10) / 10} min`,
            color: 'text-purple-400',
            border: 'border-purple-500/30',
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className={`bg-[#0c0d12] border ${kpi.border} p-5 rounded-2xl text-center shadow-xl select-none`}
          >
            <div className={`text-3xl font-bold font-mono ${kpi.color}`}>
              {kpi.value}
            </div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mt-1.5">{kpi.label}</div>
          </div>
        ))}
      </div>

      <WaitComparisonChart preview={preview} departments={departments} />

      {/* Department Breakdown */}
      <div className="bg-[#0c0d12] border border-[#232634] rounded-2xl overflow-hidden shadow-xl">
        <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-950/60">
          <div className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-widest">
            Department Delta Breakdown
          </div>
        </div>
        <div className="divide-y divide-slate-800/60 text-slate-200">
          {deptIds.map((id) => (
            <DeltaRow key={id} id={id} preview={preview} departments={departments} />
          ))}
        </div>
      </div>

      {/* Model Transparency & Math details */}
      <div className="bg-[#12141c] border border-slate-800/80 p-5 rounded-2xl text-xs font-mono text-slate-400 leading-relaxed">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span>
            Deterministic Queueing Model · Real-Time Backend Physics
          </span>
          <button className="text-cyan-400 hover:text-cyan-300 font-semibold underline" onClick={() => setShowCalc((v) => !v)}>
            {showCalc ? 'Hide calculation detail' : 'See how this was calculated'}
          </button>
        </div>
        {showCalc && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 text-xs text-slate-300 space-y-1 font-mono">
            <div>• Model: deterministic queueing formula (patients waiting × avg service time ÷ staff on duty)</div>
            <div>• Ripple term: departments this one depends on add boarding delay once passing 85% bed occupancy</div>
            <div>• Assumptions: no new admissions during transition, full staff availability once reassigned</div>
            <div>• Full mathematical transparency — zero black-box simulation</div>
          </div>
        )}
      </div>
    </div>
  )
}
