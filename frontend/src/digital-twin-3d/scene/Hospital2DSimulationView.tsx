import React from 'react'
import type { Department3D, Hospital3DState } from '../adapters/types'

interface Hospital2DSimulationViewProps {
  state: Hospital3DState
  selectedDeptId: string | null
  onSelectDept: (deptId: string | null) => void
  showFlows: boolean
  showRipples: boolean
  isBottleneckMode: boolean
}

export const Hospital2DSimulationView: React.FC<Hospital2DSimulationViewProps> = ({
  state,
  selectedDeptId,
  onSelectDept,
  showFlows,
  showRipples,
  isBottleneckMode,
}) => {
  const departments = state.departments

  const getDept = (id: string) => departments.find((d) => d.id === id)

  const emergency = getDept('emergency')
  const icu = getDept('icu')
  const generalWard = getDept('general_ward')
  const radiology = getDept('radiology')

  // Other dynamic departments if any
  const otherDepts = departments.filter(
    (d) => !['emergency', 'icu', 'general_ward', 'radiology'].includes(d.id),
  )

  const isBaseline = state.activeScenarioId === 'current'
  const activeScenario = state.availableScenarios.find((s) => s.id === state.activeScenarioId) || state.recommendation

  return (
    <div className="relative w-full h-full p-6 overflow-y-auto bg-slate-950 flex flex-col items-center">
      {/* Hospital Layout Canvas */}
      <div className="w-full max-w-6xl relative z-10 space-y-6">
        {/* Campus Header & Corridor System with Scenario Banner */}
        <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl px-5 py-3 backdrop-blur-md flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isBaseline ? 'bg-blue-500' : 'bg-cyan-400'} animate-pulse`} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                  {isBaseline ? 'Live Baseline Floorplan' : `Simulated Floorplan · ${activeScenario?.title || 'Active Plan'}`}
                </span>
                {!isBaseline && activeScenario && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded">
                    -{activeScenario.deltaWaitMin}m Total Wait Relief
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                {isBaseline
                  ? 'Real-time telemetry steady-state · Click a scenario above to test interventions'
                  : activeScenario?.description || 'Simulated resource interventions applied to departments below'}
              </div>
            </div>
          </div>
          <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
            {!isBaseline && (
              <span className="text-[11px] font-bold text-cyan-400 bg-cyan-950/60 px-2 py-1 rounded border border-cyan-500/30">
                ⚡ Simulation Applied
              </span>
            )}
            <span>Click card to inspect</span>
          </div>
        </div>

        {/* 2x2 Interactive Department Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
          {/* SVG Animated Flow & Ripple Layer */}
          {showFlows && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-0 hidden md:block"
              style={{ minHeight: '520px' }}
            >
              <defs>
                <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
                </linearGradient>
                <linearGradient id="rippleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.3" />
                </linearGradient>
              </defs>

              {/* Emergency -> General Ward Flow */}
              <line
                x1="45%"
                y1="25%"
                x2="55%"
                y2="75%"
                stroke="url(#flowGrad)"
                strokeWidth="3"
                strokeDasharray="6,6"
                className="animate-[dash_1.5s_linear_infinite]"
              />

              {/* Emergency -> Radiology Flow */}
              <line
                x1="45%"
                y1="25%"
                x2="55%"
                y2="25%"
                stroke="url(#flowGrad)"
                strokeWidth="3"
                strokeDasharray="6,6"
                className="animate-[dash_1.5s_linear_infinite]"
              />

              {/* ICU -> General Ward Flow */}
              <line
                x1="45%"
                y1="75%"
                x2="55%"
                y2="75%"
                stroke="url(#flowGrad)"
                strokeWidth="3"
                strokeDasharray="6,6"
                className="animate-[dash_1.5s_linear_infinite]"
              />
            </svg>
          )}

          {/* Emergency Department */}
          {emergency && (
            <DepartmentRoomCard
              dept={emergency}
              isSelected={selectedDeptId === emergency.id}
              onSelect={() => onSelectDept(selectedDeptId === emergency.id ? null : emergency.id)}
              isBottleneckMode={isBottleneckMode}
              icon="🚑"
              zoneLabel="AMBULANCE BAY & TRIAGE"
            />
          )}

          {/* Radiology Department */}
          {radiology && (
            <DepartmentRoomCard
              dept={radiology}
              isSelected={selectedDeptId === radiology.id}
              onSelect={() => onSelectDept(selectedDeptId === radiology.id ? null : radiology.id)}
              isBottleneckMode={isBottleneckMode}
              icon="🔬"
              zoneLabel="DIAGNOSTIC & IMAGING SUITE"
            />
          )}

          {/* Intensive Care Unit (ICU) */}
          {icu && (
            <DepartmentRoomCard
              dept={icu}
              isSelected={selectedDeptId === icu.id}
              onSelect={() => onSelectDept(selectedDeptId === icu.id ? null : icu.id)}
              isBottleneckMode={isBottleneckMode}
              icon="🫁"
              zoneLabel="CRITICAL CARE WING"
            />
          )}

          {/* General Inpatient Ward */}
          {generalWard && (
            <DepartmentRoomCard
              dept={generalWard}
              isSelected={selectedDeptId === generalWard.id}
              onSelect={() => onSelectDept(selectedDeptId === generalWard.id ? null : generalWard.id)}
              isBottleneckMode={isBottleneckMode}
              icon="🛏"
              zoneLabel="INPATIENT ADMISSION WARD"
            />
          )}

          {/* Dynamic Extra Departments if configured */}
          {otherDepts.map((d) => (
            <DepartmentRoomCard
              key={d.id}
              dept={d}
              isSelected={selectedDeptId === d.id}
              onSelect={() => onSelectDept(selectedDeptId === d.id ? null : d.id)}
              isBottleneckMode={isBottleneckMode}
              icon="🏥"
              zoneLabel="AUXILIARY WING"
            />
          ))}
        </div>

        {/* Cross-Department Flow & Dependency Summary Bar */}
        {showRipples && state.rippleEffects.length > 0 && (
          <div className="bg-slate-900/90 border border-red-500/30 rounded-xl p-4 space-y-2">
            <div className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              Active Cross-Department Ripple Pressures
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {state.rippleEffects.map((ripple) => (
                <div
                  key={ripple.id}
                  className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 flex items-start gap-2"
                >
                  <span className="text-amber-400 font-bold">⚡</span>
                  <div>
                    <span className="font-semibold text-slate-200">
                      {ripple.fromDeptId.toUpperCase()} → {ripple.toDeptId.toUpperCase()}:
                    </span>{' '}
                    {ripple.message}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface DepartmentRoomCardProps {
  dept: Department3D
  isSelected: boolean
  onSelect: () => void
  isBottleneckMode: boolean
  icon: string
  zoneLabel: string
}

const DepartmentRoomCard: React.FC<DepartmentRoomCardProps> = ({
  dept,
  isSelected,
  onSelect,
  isBottleneckMode,
  icon,
  zoneLabel,
}) => {
  const availableBeds = Math.max(0, dept.bedsTotal - dept.bedsOccupied)
  const isCritical = dept.status === 'critical'
  const isWarning = dept.status === 'warning'
  const deltaWait = dept.deltaWaitMin ?? 0
  const deltaStaff = dept.deltaStaff ?? 0
  const deltaBeds = dept.deltaBeds ?? 0
  const baselineWait = Math.round(dept.predictedWaitMin - deltaWait)

  let statusBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
  if (isCritical) statusBg = 'bg-red-500/20 text-red-300 border-red-500/40'
  else if (isWarning) statusBg = 'bg-amber-500/20 text-amber-300 border-amber-500/40'

  const highlightBorder = isSelected
    ? 'border-cyan-400 ring-2 ring-cyan-400/30 shadow-2xl shadow-cyan-500/20'
    : dept.hasModifiedState
    ? 'border-cyan-500/80 ring-1 ring-cyan-500/40 shadow-xl shadow-cyan-950/40'
    : isBottleneckMode && dept.isBottleneck
    ? 'border-red-500 ring-2 ring-red-500/30 shadow-2xl shadow-red-500/20'
    : 'border-slate-800 hover:border-slate-700'

  return (
    <div
      onClick={onSelect}
      className={`relative bg-slate-900/90 rounded-2xl border ${highlightBorder} p-5 cursor-pointer transition-all duration-200 backdrop-blur-md flex flex-col justify-between select-none group`}
    >
      {/* Top Header Strip */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-inner"
              style={{ backgroundColor: `${dept.color}25`, border: `1px solid ${dept.color}60` }}
            >
              {icon}
            </div>
            <div>
              <div className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">
                {zoneLabel}
              </div>
              <h3 className="font-bold text-lg text-slate-100 group-hover:text-cyan-300 transition-colors">
                {dept.name}
              </h3>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex flex-col items-end gap-1">
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-md border uppercase tracking-wider ${statusBg}`}
            >
              {dept.status}
            </span>
            {dept.isBottleneck ? (
              <span className="text-[10px] font-mono text-red-400 font-bold animate-pulse">
                ⚠ BOTTLENECK
              </span>
            ) : deltaWait < -15 ? (
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                ✓ RELIEF ACTIVE
              </span>
            ) : null}
          </div>
        </div>

        {/* Simulated Delta Strip if scenario modifies this department */}
        {dept.hasModifiedState && (
          <div className="mb-3 p-2 bg-cyan-950/40 rounded-xl border border-cyan-500/30 flex items-center justify-between text-xs font-mono flex-wrap gap-1.5">
            <span className="text-cyan-300 font-bold flex items-center gap-1 text-[11px]">
              <span>⚡</span> Simulated Plan:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {deltaStaff !== 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    deltaStaff > 0
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {deltaStaff > 0 ? `+${deltaStaff} Staff` : `${deltaStaff} Staff`}
                </span>
              )}
              {deltaBeds > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  +{deltaBeds} Surge Beds
                </span>
              )}
              {deltaWait !== 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    deltaWait < 0
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {deltaWait < 0 ? `${deltaWait}m Wait` : `+${deltaWait}m Wait`}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Diagnosis Pill */}
        <div className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 mb-4 line-clamp-2 leading-relaxed">
          {dept.statusReason}
        </div>

        {/* Inpatient Bed Matrix */}
        {dept.bedsTotal > 0 ? (
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Beds Occupancy:</span>
              <span className="font-mono font-bold text-slate-200">
                {dept.bedsOccupied} / {dept.bedsTotal} beds ({dept.bedOccupancyPct}%)
              </span>
            </div>

            {/* Bed Matrix Icons Grid */}
            <div className="grid grid-cols-10 gap-1.5 p-2.5 bg-slate-950/70 rounded-xl border border-slate-800/80">
              {Array.from({ length: Math.min(dept.bedsTotal, 40) }).map((_, idx) => {
                const isOccupied = idx < dept.bedsOccupied
                return (
                  <div
                    key={idx}
                    title={isOccupied ? `Bed #${idx + 1}: Occupied` : `Bed #${idx + 1}: Available`}
                    className={`h-4 rounded-[4px] flex items-center justify-center transition-all ${
                      isOccupied
                        ? 'bg-blue-600 border border-blue-400 shadow-sm shadow-blue-500/30'
                        : 'bg-slate-800/80 border border-slate-700/60 hover:bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        isOccupied
                          ? isCritical
                            ? 'bg-red-400 animate-pulse'
                            : 'bg-cyan-300'
                          : 'bg-slate-600'
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-0.5">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Occupied: {dept.bedsOccupied}
              </span>
              <span className={`flex items-center gap-1.5 font-bold ${availableBeds === 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                <span className={`w-2 h-2 rounded-full ${availableBeds === 0 ? 'bg-red-500' : 'bg-emerald-500'} inline-block`} />
                Available: {availableBeds}
              </span>
            </div>
          </div>
        ) : (
          <div className="mb-4 p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Throughput Equipment:</span>
            <span className="text-cyan-400 font-mono font-bold">CT Scanner Suite + MRI Active</span>
          </div>
        )}

        {/* 3 Metric Summary Blocks */}
        <div className="grid grid-cols-3 gap-2.5 text-center">
          {/* Waiting Patients */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5">
            <div className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">Queue</div>
            <div className="text-lg font-bold font-mono text-slate-100 mt-0.5">
              {dept.patientsWaiting}
              <span className="text-[10px] font-normal text-slate-400 ml-0.5">pts</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {dept.patientsWaiting > 10 ? '🔴 Congested' : '🟢 Normal'}
            </div>
          </div>

          {/* Predicted Wait Time */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5">
            <div className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">Wait Time</div>
            <div
              className={`text-lg font-bold font-mono mt-0.5 ${
                dept.predictedWaitMin >= 90
                  ? 'text-red-400'
                  : dept.predictedWaitMin >= 45
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {dept.predictedWaitMin}
              <span className="text-[10px] font-normal text-slate-400 ml-0.5">min</span>
            </div>
            <div className="text-[10px] font-mono mt-0.5">
              {deltaWait !== 0 ? (
                <span className={deltaWait < 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {deltaWait < 0 ? `-${Math.abs(deltaWait)}m` : `+${deltaWait}m`}
                </span>
              ) : (
                <span className="text-slate-500">Base: {baselineWait}m</span>
              )}
            </div>
          </div>

          {/* Staff Allocation */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5">
            <div className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">Staffing</div>
            <div className="text-lg font-bold font-mono text-slate-100 mt-0.5">
              {dept.staffAssigned}/{dept.staffTotal}
            </div>
            <div className="text-[10px] font-mono mt-0.5">
              {deltaStaff !== 0 ? (
                <span className={deltaStaff > 0 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {deltaStaff > 0 ? `+${deltaStaff} added` : `${deltaStaff} moved`}
                </span>
              ) : dept.staffShortage > 0 ? (
                <span className="text-amber-400">-{dept.staffShortage} short</span>
              ) : (
                <span className="text-emerald-400">✓ Optimal</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <span className="text-slate-500 font-mono text-[11px]">
          {dept.dependsOn.length > 0 ? `Depends on: ${dept.dependsOn.join(', ')}` : 'Terminal Station'}
        </span>
        <button className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
          {isSelected ? 'Close Details ✕' : 'Inspect Details →'}
        </button>
      </div>
    </div>
  )
}
