import React, { useState } from 'react'
import type { Hospital3DState } from '../adapters/types'
import type { Action, ActionType, DepartmentId } from '../../types'
import { dataService3D } from '../data/3DDataService'

interface ScenarioComparisonPanelProps {
  state: Hospital3DState | null
  activeScenarioId: string
  onSelectScenario: (scenarioId: string) => void
  onClose: () => void
  onFocusDepartment?: (deptId: string) => void
}

interface CustomActionRow {
  type: ActionType
  fromDept: DepartmentId
  toDept: DepartmentId
  amount: number
}

export const ScenarioComparisonPanel: React.FC<ScenarioComparisonPanelProps> = ({
  state,
  activeScenarioId,
  onSelectScenario,
  onClose,
  onFocusDepartment,
}) => {
  const [tab, setTab] = useState<'overview' | 'actions' | 'matrix' | 'ripples' | 'custom'>('overview')

  // Custom scenario builder state
  const [customActions, setCustomActions] = useState<CustomActionRow[]>([
    { type: 'move_staff', fromDept: 'radiology', toDept: 'emergency', amount: 2 },
    { type: 'open_beds', fromDept: 'general_ward', toDept: 'general_ward', amount: 4 },
  ])
  const [isSimulating, setIsSimulating] = useState(false)
  const [customSimSuccess, setCustomSimSuccess] = useState<string | null>(null)
  const [customSimError, setCustomSimError] = useState<string | null>(null)

  if (!state) return null

  const isBaseline = activeScenarioId === 'current'
  const isCustom = activeScenarioId === 'custom'
  const activeScenario = state.availableScenarios.find((s) => s.id === activeScenarioId) || state.recommendation

  const baselineTotalWait = state.departments.reduce((sum, d) => {
    const delta = d.deltaWaitMin ?? 0
    return sum + (d.predictedWaitMin - delta)
  }, 0)

  const simulatedTotalWait = isBaseline ? baselineTotalWait : (activeScenario ? activeScenario.totalWaitMin : baselineTotalWait)
  const netWaitRelief = !isBaseline && activeScenario ? activeScenario.deltaWaitMin : 0
  const waitReliefPct = baselineTotalWait > 0 && netWaitRelief > 0 ? Math.round((netWaitRelief / baselineTotalWait) * 100) : 0

  // Simplified scenario explanations
  const getSimpleExplanation = () => {
    if (isBaseline) {
      return {
        what: 'Baseline Live Operations: Shows current real-time queues and bed occupancy across all hospital units without any adjustments.',
        why: 'Emergency and ICU are experiencing high waiting times because inpatient beds downstream are full, causing patient transfer delays.',
        impacts: [
          'Live unadjusted hospital baseline state',
          'Identifies active queues & bed shortages',
          'Select a scenario or build a custom plan to simulate relief',
        ],
      }
    }
    if (isCustom) {
      return {
        what: `Custom User Plan: Simulating ${customActions.length} custom operational action${customActions.length > 1 ? 's' : ''}.`,
        why: 'Tests your specific staff reallocation and surge bed expansion strategy on live hospital queues.',
        impacts: [
          `Reduces total hospital wait by ${netWaitRelief} minutes (${waitReliefPct}% faster)`,
          `Resolves ${state.departments.filter((d) => d.status === 'critical').length === 0 ? 'all critical bottlenecks' : 'intake pressures'}`,
          'Maintains clinical safety across all donor departments',
        ],
      }
    }
    if (activeScenario?.isRecommended) {
      return {
        what: 'Recommended Optimization: Reallocates available roaming staff to Emergency while opening surge inpatient beds in General Ward.',
        why: 'Emergency has the longest wait times. Adding staff processes triage faster, and opening Ward beds lets admitted patients leave Emergency immediately.',
        impacts: [
          `Reduces total hospital wait by ${netWaitRelief} minutes (${waitReliefPct}% relief)`,
          'Clears Emergency intake backlog and stops transfer delays',
          'Keeps Radiology and ICU within safe operational limits',
        ],
      }
    }
    return {
      what: 'Alternative Scenario: Shifts staff and opens backup beds to relieve specific department queue pressures.',
      why: 'Balances patient load between high-intake units and recovery wards to prevent localized bottlenecks.',
      impacts: [
        `Reduces total hospital wait by ${netWaitRelief} minutes`,
        'Improves bed throughput and patient turnover',
        'Stabilizes department workload across hospital wings',
      ],
    }
  }

  const explanation = getSimpleExplanation()

  // Handle custom scenario simulation
  const handleRunCustomSimulation = async () => {
    setIsSimulating(true)
    setCustomSimError(null)
    setCustomSimSuccess(null)

    try {
      const actionsToSimulate: Action[] = customActions.map((a) => ({
        type: a.type,
        from_department: a.type === 'open_beds' ? undefined : a.fromDept,
        to_department: a.toDept,
        amount: Number(a.amount),
      }))

      await dataService3D.simulateCustomActions(actionsToSimulate)
      setCustomSimSuccess('Custom simulation applied to 2D Blueprint & 3D Twin!')
      onSelectScenario('custom')
    } catch (err) {
      setCustomSimError(err instanceof Error ? err.message : 'Simulation failed')
    } finally {
      setIsSimulating(false)
    }
  }

  const handleAddCustomAction = () => {
    setCustomActions((prev) => [
      ...prev,
      { type: 'move_staff', fromDept: 'general_ward', toDept: 'emergency', amount: 1 },
    ])
  }

  const handleRemoveCustomAction = (index: number) => {
    setCustomActions((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpdateCustomAction = (index: number, field: keyof CustomActionRow, value: any) => {
    setCustomActions((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    )
  }

  const deptOptions: { id: DepartmentId; label: string }[] = [
    { id: 'emergency', label: 'Emergency (ED)' },
    { id: 'icu', label: 'Intensive Care (ICU)' },
    { id: 'general_ward', label: 'General Ward' },
    { id: 'radiology', label: 'Radiology / CT' },
  ]

  return (
    <div className="absolute left-4 top-16 bottom-14 w-[470px] max-w-[calc(100vw-32px)] bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl z-30 text-white flex flex-col overflow-hidden animate-in fade-in slide-in-from-left duration-250 select-none">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
              Scenario Intelligence & Sandbox
            </span>
          </div>
          <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
            {isBaseline ? '📍 Live Baseline State' : isCustom ? '🛠 Custom Plan' : activeScenario?.title || 'Scenario Analysis'}
            {activeScenario?.isRecommended && !isBaseline && !isCustom && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                ★ OPTIMAL
              </span>
            )}
            {isCustom && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                SANDBOX ACTIVE
              </span>
            )}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          title="Close panel"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Scenario Selector Navigation Pills */}
      <div className="px-3 py-2 bg-slate-950/50 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        <button
          onClick={() => {
            onSelectScenario('current')
            setTab('overview')
          }}
          className={`text-xs font-mono px-2.5 py-1.5 rounded-lg transition-all shrink-0 cursor-pointer ${
            isBaseline
              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          📍 Baseline
        </button>
        {state.availableScenarios.map((scen, i) => (
          <button
            key={scen.id}
            onClick={() => {
              onSelectScenario(scen.id)
              setTab('overview')
            }}
            className={`text-xs font-mono px-2.5 py-1.5 rounded-lg transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeScenarioId === scen.id && !isCustom
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-950/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {scen.isRecommended && <span>★</span>}
            {scen.isRecommended ? 'Recommended' : `Plan #${i + 1}`}
          </button>
        ))}
        <button
          onClick={() => setTab('custom')}
          className={`text-xs font-mono px-2.5 py-1.5 rounded-lg transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
            tab === 'custom' || isCustom
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-950/50'
              : 'bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
          }`}
        >
          <span>+</span> Custom Plan
        </button>
      </div>

      {/* Key Quantified Metric Cards */}
      <div className="p-3.5 bg-slate-950/60 border-b border-slate-800 grid grid-cols-3 gap-2 text-center">
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-2.5">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Total Wait</div>
          <div className="text-base font-mono font-bold text-slate-100 mt-0.5">
            {simulatedTotalWait}m
          </div>
          <div className="text-[10px] font-mono mt-0.5">
            {!isBaseline && netWaitRelief > 0 ? (
              <span className="text-emerald-400 font-bold">-{netWaitRelief}m ({waitReliefPct}%)</span>
            ) : (
              <span className="text-slate-500">Live baseline</span>
            )}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-2.5">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Bottlenecks</div>
          <div className="text-base font-mono font-bold mt-0.5 text-slate-100">
            {isBaseline ? (
              <span className="text-rose-400">{state.departments.filter((d) => d.isBottleneck).length} Critical</span>
            ) : (
              <span className="text-emerald-400">{activeScenario?.criticalCount ?? 0} Critical</span>
            )}
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
            {!isBaseline ? 'Resolved' : 'Requires action'}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-2.5">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Opt. Score</div>
          <div className="text-base font-mono font-bold mt-0.5 text-cyan-300">
            {activeScenario && !isBaseline ? `+${activeScenario.score}` : '0.0 (Base)'}
          </div>
          <div className="text-[10px] font-mono text-emerald-400 mt-0.5">
            {!isBaseline ? 'High efficiency' : 'Standard'}
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/40 text-xs font-medium">
        <button
          onClick={() => setTab('overview')}
          className={`flex-1 py-2.5 text-center transition-all cursor-pointer ${
            tab === 'overview'
              ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-950/20 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Why It Helps
        </button>
        <button
          onClick={() => setTab('actions')}
          className={`flex-1 py-2.5 text-center transition-all cursor-pointer ${
            tab === 'actions'
              ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-950/20 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Action Steps ({activeScenario?.actions.length || 0})
        </button>
        <button
          onClick={() => setTab('matrix')}
          className={`flex-1 py-2.5 text-center transition-all cursor-pointer ${
            tab === 'matrix'
              ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-950/20 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Before / After
        </button>
        <button
          onClick={() => setTab('custom')}
          className={`flex-1 py-2.5 text-center transition-all cursor-pointer ${
            tab === 'custom'
              ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-950/20 font-bold'
              : 'text-amber-400/70 hover:text-amber-300'
          }`}
        >
          🛠 Custom Builder
        </button>
      </div>

      {/* Tab Body Content */}
      <div className="p-4 flex-1 overflow-y-auto space-y-3.5 text-xs">
        {/* TAB 1: OVERVIEW & PLAIN-ENGLISH RATIONALE */}
        {tab === 'overview' && (
          <div className="space-y-3">
            {/* What this does */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-cyan-400 font-mono font-bold text-[11px] uppercase">
                <span>🎯</span> What This Scenario Does
              </div>
              <p className="text-slate-300 leading-relaxed text-xs">
                {explanation.what}
              </p>
            </div>

            {/* Why it helps */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400 font-mono font-bold text-[11px] uppercase">
                <span>💡</span> Why It Helps
              </div>
              <p className="text-slate-300 leading-relaxed text-xs">
                {explanation.why}
              </p>
            </div>

            {/* Expected Impact */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="text-slate-200 font-semibold text-xs flex items-center gap-1.5">
                <span>📊</span> Expected Results:
              </div>
              <div className="space-y-1.5 font-mono text-[11px]">
                {explanation.impacts.map((imp, i) => (
                  <div key={i} className="flex items-center gap-2 text-emerald-400">
                    <span className="text-emerald-500 font-bold">✓</span> {imp}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: STEP-BY-STEP ACTION STEPS */}
        {tab === 'actions' && (
          <div className="space-y-2.5">
            {activeScenario && activeScenario.actions.length > 0 ? (
              activeScenario.actions.map((act, i) => (
                <div
                  key={i}
                  className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 flex items-start gap-3 hover:border-slate-700 transition-all"
                >
                  <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-200 text-xs tracking-wide">
                      {act.label}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-1 flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-slate-900 rounded border border-slate-800">
                        {act.type === 'move_staff' ? '👥 Staff Reallocation' : act.type === 'open_beds' ? '🛏 Surge Beds' : '🔄 Patient Flow'}
                      </span>
                      <span>Amount: <strong>{act.amount}</strong></span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500 font-mono bg-slate-950/50 rounded-xl border border-slate-800/60 p-4">
                <div className="text-2xl mb-1">📍</div>
                <div className="text-slate-300 font-bold mb-1">Baseline State Active</div>
                <div>No actions scheduled. Select a recommended plan or build a custom scenario.</div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BEFORE / AFTER DELTAS MATRIX */}
        {tab === 'matrix' && (
          <div className="space-y-2">
            {state.departments.map((dept) => {
              const deltaWait = dept.deltaWaitMin ?? 0
              const deltaStaff = dept.deltaStaff ?? 0
              const baselineWait = Math.round(dept.predictedWaitMin - deltaWait)

              return (
                <div
                  key={dept.id}
                  onClick={() => onFocusDepartment?.(dept.id)}
                  className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: dept.color }}
                      />
                      <span className="font-bold text-slate-200 text-xs">{dept.name}</span>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                        dept.status === 'critical'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : dept.status === 'warning'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {dept.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[11px] font-mono bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                    <div>
                      <div className="text-slate-500 text-[10px] font-bold">BASELINE</div>
                      <div className="text-slate-300">Wait: {baselineWait}m</div>
                      <div className="text-slate-300">Staff: {dept.staffAssigned - deltaStaff}</div>
                    </div>
                    <div>
                      <div className="text-cyan-400 text-[10px] font-bold">SIMULATED</div>
                      <div className="text-slate-200 font-bold">
                        Wait: {dept.predictedWaitMin}m{' '}
                        {deltaWait !== 0 && (
                          <span className={deltaWait < 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            ({deltaWait > 0 ? `+${deltaWait}` : deltaWait}m)
                          </span>
                        )}
                      </div>
                      <div className="text-slate-200">
                        Staff: {dept.staffAssigned}{' '}
                        {deltaStaff !== 0 && (
                          <span className={deltaStaff > 0 ? 'text-emerald-400' : 'text-amber-400'}>
                            ({deltaStaff > 0 ? `+${deltaStaff}` : deltaStaff})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* TAB 4: CUSTOM SCENARIO BUILDER SANDBOX */}
        {tab === 'custom' && (
          <div className="space-y-3">
            <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3 text-amber-200 text-xs">
              <div className="font-bold mb-0.5 flex items-center gap-1.5 text-amber-300">
                <span>🛠</span> Custom Scenario Sandbox Builder
              </div>
              <div className="text-[11px] text-amber-200/80">
                Manually configure staff movements or open surge beds, then simulate the outcome in the live Digital Twin.
              </div>
            </div>

            {/* Actions List */}
            <div className="space-y-2.5">
              {customActions.map((row, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
                      Intervention #{idx + 1}
                    </span>
                    {customActions.length > 1 && (
                      <button
                        onClick={() => handleRemoveCustomAction(idx)}
                        className="text-slate-500 hover:text-rose-400 text-xs font-mono transition-colors cursor-pointer"
                        title="Remove action"
                      >
                        ✕ Remove
                      </button>
                    )}
                  </div>

                  {/* Action Type */}
                  <div className="grid grid-cols-3 gap-2 items-center text-xs">
                    <label className="text-[11px] text-slate-400 font-mono">Action Type</label>
                    <select
                      value={row.type}
                      onChange={(e) => handleUpdateCustomAction(idx, 'type', e.target.value as ActionType)}
                      className="col-span-2 bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="move_staff">👥 Move Staff</option>
                      <option value="open_beds">🛏 Open Beds</option>
                      <option value="shift_workload">🔄 Shift Patients</option>
                    </select>
                  </div>

                  {/* Source Dept (only if move_staff or shift_workload) */}
                  {row.type !== 'open_beds' && (
                    <div className="grid grid-cols-3 gap-2 items-center text-xs">
                      <label className="text-[11px] text-slate-400 font-mono">From Dept</label>
                      <select
                        value={row.fromDept}
                        onChange={(e) => handleUpdateCustomAction(idx, 'fromDept', e.target.value as DepartmentId)}
                        className="col-span-2 bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-cyan-500"
                      >
                        {deptOptions.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Target Dept */}
                  <div className="grid grid-cols-3 gap-2 items-center text-xs">
                    <label className="text-[11px] text-slate-400 font-mono">To Dept</label>
                    <select
                      value={row.toDept}
                      onChange={(e) => handleUpdateCustomAction(idx, 'toDept', e.target.value as DepartmentId)}
                      className="col-span-2 bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-cyan-500"
                    >
                      {deptOptions.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Amount Stepper */}
                  <div className="grid grid-cols-3 gap-2 items-center text-xs">
                    <label className="text-[11px] text-slate-400 font-mono">Quantity</label>
                    <div className="col-span-2 flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateCustomAction(idx, 'amount', Math.max(1, row.amount - 1))}
                        className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-bold flex items-center justify-center cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={row.amount}
                        onChange={(e) => handleUpdateCustomAction(idx, 'amount', Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 text-center bg-slate-900 border border-slate-700 text-slate-100 font-mono rounded py-1 text-xs focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        onClick={() => handleUpdateCustomAction(idx, 'amount', Math.min(20, row.amount + 1))}
                        className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-bold flex items-center justify-center cursor-pointer"
                      >
                        +
                      </button>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {row.type === 'move_staff' ? 'staff' : row.type === 'open_beds' ? 'beds' : 'patients'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Action Button */}
            {customActions.length < 4 && (
              <button
                onClick={handleAddCustomAction}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-dashed border-slate-700 rounded-xl text-xs font-mono font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>+</span> Add Another Intervention
              </button>
            )}

            {/* Feedback messages */}
            {customSimSuccess && (
              <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-mono">
                ✓ {customSimSuccess}
              </div>
            )}
            {customSimError && (
              <div className="p-2.5 bg-rose-950/40 border border-rose-500/40 text-rose-300 rounded-xl text-xs font-mono">
                ⚠ {customSimError}
              </div>
            )}

            {/* Simulation Trigger Button */}
            <button
              onClick={handleRunCustomSimulation}
              disabled={isSimulating}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs rounded-xl transition-all shadow-lg shadow-amber-950/50 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSimulating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  <span>Computing Equilibrium Math…</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Run Custom Simulation</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Footer Action */}
      <div className="p-3.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
        <button
          onClick={() => onSelectScenario(isBaseline ? state.availableScenarios[0]?.id || 'current' : 'current')}
          className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
        >
          {isBaseline ? '⚡ View Recommended Plan' : '↺ Reset to Baseline'}
        </button>
        <button
          onClick={onClose}
          className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs px-4 py-2 rounded-lg transition-all shadow-md shadow-cyan-950/40 cursor-pointer"
        >
          Close & Inspect Twin
        </button>
      </div>
    </div>
  )
}
