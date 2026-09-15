import React, { useEffect, useRef, useState } from 'react'
import type { DependencyEdge, DepartmentPrediction, HospitalState, ScenarioResult } from '../types'
import { transformTo3DState } from './adapters/hospital3DAdapter'
import type { Department3D, Hospital3DState } from './adapters/types'
import { dataService3D } from './data/3DDataService'
import { CameraPreset, HospitalScene } from './scene/HospitalScene'
import { Hospital2DSimulationView } from './scene/Hospital2DSimulationView'
import { DepartmentDetailsPanel } from './ui/DepartmentDetailsPanel'
import { ScenarioComparisonPanel } from './ui/ScenarioComparisonPanel'

interface DigitalTwin3DProps {
  initialHospitalState?: HospitalState | null
  initialPredictions?: DepartmentPrediction[]
  initialEdges?: DependencyEdge[]
  initialScenarios?: ScenarioResult[]
}

export const DigitalTwin3DView: React.FC<DigitalTwin3DProps> = ({
  initialHospitalState,
  initialPredictions = [],
  initialEdges = [],
  initialScenarios = [],
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<HospitalScene | null>(null)

  // Default to robust 2D Architectural Simulation Map
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d')

  // Initialize state synchronously if initial data is present
  const [state, setState] = useState<Hospital3DState | null>(() => {
    if (initialHospitalState) {
      return transformTo3DState(
        initialHospitalState,
        initialPredictions,
        initialEdges,
        initialScenarios,
        null,
      )
    }
    return dataService3D.getCurrentState()
  })

  const [error, setError] = useState<string | null>(null)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Interactive UI state
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null)
  const [activeScenarioId, setActiveScenarioId] = useState<string>('current')
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('overview')
  const [isBottleneckMode, setIsBottleneckMode] = useState(false)
  const [showRipples, setShowRipples] = useState(true)
  const [showFlows, setShowFlows] = useState(true)
  const [showScenarioHub, setShowScenarioHub] = useState(true)
  const [showLegend, setShowLegend] = useState(false)

  // 1. Initialize Three.js Scene if 3D mode is active
  useEffect(() => {
    if (viewMode !== '3d' || !containerRef.current) return

    try {
      const scene = new HospitalScene(containerRef.current, (deptId) => {
        setSelectedDeptId(deptId)
      })
      sceneRef.current = scene

      if (state) {
        scene.updateState(state, selectedDeptId)
      }
    } catch (e) {
      console.warn('WebGL 3D Scene could not initialize, falling back to 2D view', e)
      setViewMode('2d')
    }

    return () => {
      sceneRef.current?.dispose()
      sceneRef.current = null
    }
  }, [viewMode])

  // 2. Subscribe to Data Service for live updates & polling
  useEffect(() => {
    const unsubscribe = dataService3D.subscribe((newState, newError, demo) => {
      if (newState) {
        setState(newState)
        setActiveScenarioId(newState.activeScenarioId)
      }
      setError(newError)
      setIsDemoMode(demo)
    })

    dataService3D.start()

    return () => {
      unsubscribe()
      dataService3D.stop()
    }
  }, [])

  // 3. Update 3D Scene when state or selection changes
  useEffect(() => {
    if (viewMode === '3d' && sceneRef.current && state) {
      sceneRef.current.updateState(state, selectedDeptId)
    }
  }, [viewMode, state, selectedDeptId])

  // Handlers
  const handleSelectScenario = async (scenarioId: string) => {
    setActiveScenarioId(scenarioId)
    if (scenarioId !== 'current') {
      setShowScenarioHub(true)
    }
    await dataService3D.setScenario(scenarioId)
  }

  const handleSelectCameraPreset = (preset: CameraPreset) => {
    setCameraPreset(preset)
    sceneRef.current?.setCameraPreset(preset)
  }

  const handleFocusDepartment = (deptId: string) => {
    setSelectedDeptId(deptId)
    sceneRef.current?.focusDepartment(deptId)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await dataService3D.refresh()
    setRefreshing(false)
  }

  const selectedDept: Department3D | null =
    state?.departments.find((d) => d.id === selectedDeptId) || null

  const scenarios = state?.availableScenarios || []
  const activeScenario = scenarios.find((s) => s.id === activeScenarioId)

  return (
    <div className="relative w-full h-[calc(100vh-62px)] flex flex-col bg-slate-950 overflow-hidden select-none font-sans">
      {/* Streamlined Precision Simulation Toolbar (No duplicated branding or duplicate nav) */}
      <div className="bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/80 px-4 py-2 flex items-center justify-between gap-3 z-20 flex-wrap">
        {/* Left: View Mode Segmented Switch & Scenario Trigger */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner">
            <button
              onClick={() => setViewMode('2d')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === '2d'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/50 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🗺</span> 2D Blueprint Sim
            </button>
            <button
              onClick={() => setViewMode('3d')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === '3d'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/50 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🧊</span> 3D Isometric View
            </button>
          </div>

          <button
            onClick={() => setShowScenarioHub((v) => !v)}
            className={`text-xs font-mono font-semibold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-2 cursor-pointer ${
              showScenarioHub
                ? 'bg-cyan-950/80 border-cyan-500/80 text-cyan-300 shadow-sm shadow-cyan-950'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Scenario Intelligence</span>
            {activeScenario && activeScenarioId !== 'current' && (
              <span className="text-[10px] bg-cyan-500 text-slate-950 font-bold px-1.5 py-0.2 rounded">
                -{activeScenario.deltaWaitMin}m
              </span>
            )}
          </button>
        </div>

        {/* Center: Scenario Selection Strip */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800/90 shadow-inner overflow-x-auto scrollbar-none">
          <button
            onClick={() => handleSelectScenario('current')}
            className={`text-xs font-mono px-3 py-1.5 rounded-lg transition-all shrink-0 cursor-pointer ${
              activeScenarioId === 'current'
                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📍 Baseline
          </button>
          {scenarios.map((scen, idx) => (
            <button
              key={scen.id}
              onClick={() => handleSelectScenario(scen.id)}
              className={`text-xs font-mono px-3 py-1.5 rounded-lg transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                activeScenarioId === scen.id
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-950/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {scen.isRecommended && <span className="text-amber-300">★</span>}
              {scen.isRecommended ? 'Optimal Plan' : `Scenario #${idx + 1}`}
            </button>
          ))}
        </div>

        {/* Right: Simulation Layers & Camera Controls */}
        <div className="flex items-center gap-2">
          {/* Layer toggles */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setShowLegend((v) => !v)}
              className={`text-xs font-mono px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                showLegend
                  ? 'bg-purple-950/80 text-purple-300 border border-purple-500/50 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Color & Operations Guide"
            >
              <span>🎨</span>
              <span>Legend</span>
            </button>
            <button
              onClick={() => setIsBottleneckMode((v) => !v)}
              className={`text-xs font-mono px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                isBottleneckMode
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-500/50 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Highlight bottleneck departments"
            >
              ⚠ Bottlenecks
            </button>
            <button
              onClick={() => setShowRipples((v) => !v)}
              className={`text-xs font-mono px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                showRipples
                  ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/50 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle downstream ripple dependencies"
            >
              ⚡ Ripples
            </button>
            <button
              onClick={() => setShowFlows((v) => !v)}
              className={`text-xs font-mono px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                showFlows
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle patient flow corridors"
            >
              〰 Flows
            </button>
          </div>

          {/* 3D Camera Presets (Only shown in 3D Mode) */}
          {viewMode === '3d' && (
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 px-1 font-mono">CAM:</span>
              {(['overview', 'emergency', 'icu', 'ward', 'top-down'] as CameraPreset[]).map((cam) => (
                <button
                  key={cam}
                  onClick={() => handleSelectCameraPreset(cam)}
                  className={`text-xs font-mono px-2 py-1 rounded-lg capitalize transition-all cursor-pointer ${
                    cameraPreset === cam
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cam === 'top-down' ? '2D Top' : cam}
                </button>
              ))}
            </div>
          )}

          {/* Refresh Action */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh Digital Twin simulation stream"
          >
            <svg
              className={`w-4 h-4 ${refreshing ? 'animate-spin text-cyan-400' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Interactive Scenario Commander HUD Banner */}
      {state && (
        <div
          className={`px-4 py-2 border-b transition-all flex items-center justify-between gap-3 z-20 flex-wrap ${
            activeScenarioId !== 'current'
              ? 'bg-gradient-to-r from-cyan-950/90 via-slate-900/95 to-slate-950/90 border-cyan-500/40 shadow-lg shadow-cyan-950/40'
              : 'bg-slate-950/90 border-slate-800/80'
          }`}
        >
          {activeScenarioId !== 'current' ? (
            <>
              {/* Active Simulation Mode Information */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-cyan-500 text-slate-950 uppercase tracking-wide">
                    {activeScenarioId === 'custom' ? '🛠 Custom Sandbox' : activeScenario?.isRecommended ? '★ Optimal AI Plan' : '⚡ Alternative Plan'}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-200">
                  {activeScenario?.title || 'Simulated Scenario'}:{' '}
                  <span className="text-slate-400 font-normal text-[11px]">
                    {activeScenario?.description || 'Simulating counterfactual interventions'}
                  </span>
                </div>
              </div>

              {/* Quantified Outcome Telemetry Chips */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800 text-xs font-mono">
                  <span className="text-slate-400 text-[10px]">TOTAL WAIT:</span>
                  <span className="text-slate-500 line-through text-[11px]">{state.departments.reduce((s, d) => s + (d.predictedWaitMin - (d.deltaWaitMin ?? 0)), 0)}m</span>
                  <span className="text-emerald-400 font-bold">
                    → {activeScenario?.totalWaitMin ?? 0}m (-{activeScenario?.deltaWaitMin ?? 0}m)
                  </span>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800 text-xs font-mono">
                  <span className="text-slate-400 text-[10px]">BOTTLENECKS:</span>
                  <span className="text-emerald-400 font-bold">
                    {activeScenario?.criticalCount === 0 ? '✓ 0 Critical (Resolved)' : `${activeScenario?.criticalCount} Critical`}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowScenarioHub((v) => !v)}
                    className="text-xs font-mono font-semibold px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition-colors cursor-pointer"
                  >
                    {showScenarioHub ? 'Hide Analysis' : '📖 View Rationale & Steps'}
                  </button>
                  <button
                    onClick={() => handleSelectScenario('current')}
                    className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                    title="Reset simulation to real-time baseline"
                  >
                    ↺ Reset
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Baseline Indicator with Quick Simulation Action */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-xs font-mono font-bold text-slate-300">
                    📍 Live Baseline Equilibrium Active
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono hidden md:block">
                  {state.totalPatientsWaiting} patients in queue · {state.departments.filter((d) => d.isBottleneck).length > 0 ? 'Intake pressure detected in Emergency' : 'Standard flow'}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSelectScenario(scenarios[0]?.id || 'scenario-0')}
                  className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-md shadow-cyan-950/40 cursor-pointer flex items-center gap-1.5"
                >
                  <span>★</span>
                  <span>Simulate Recommended AI Plan</span>
                  {scenarios[0] && (
                    <span className="text-[10px] bg-slate-950/30 px-1 rounded">
                      -{scenarios[0].deltaWaitMin}m
                    </span>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowScenarioHub(true)
                  }}
                  className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors cursor-pointer"
                >
                  <span>+ Custom Sandbox</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Main Simulation Viewport Container */}
      <div className="relative flex-1 w-full min-h-0 overflow-hidden">
        {/* 2D Architectural Simulation View */}
        {viewMode === '2d' && state && (
          <Hospital2DSimulationView
            state={state}
            selectedDeptId={selectedDeptId}
            onSelectDept={setSelectedDeptId}
            showFlows={showFlows}
            showRipples={showRipples}
            isBottleneckMode={isBottleneckMode}
          />
        )}

        {/* 3D WebGL Three.js Canvas Container */}
        {viewMode === '3d' && (
          <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />
        )}

        {/* Loading overlay if state is not loaded yet */}
        {!state && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 z-20">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto mb-3" />
              <div className="text-sm font-semibold text-slate-200">Synchronizing Digital Twin Telemetry…</div>
              <div className="text-xs text-slate-500 mt-1">Calculating steady-state equilibrium & ripple graph</div>
            </div>
          </div>
        )}

        {/* Connection Failure Notice */}
        {error && !state && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 bg-rose-950/90 border border-rose-500/50 rounded-xl p-4 shadow-2xl text-white max-w-md text-center backdrop-blur-md">
            <div className="text-rose-400 font-bold text-sm mb-1">Hospital stream connection unavailable</div>
            <p className="text-xs text-slate-300 mb-3">{error}</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={handleRefresh}
                className="text-xs px-3 py-1.5 bg-rose-700 hover:bg-rose-600 rounded font-semibold transition-colors"
              >
                Retry Connection
              </button>
            </div>
          </div>
        )}

        {/* Left Side: Elaborated Scenario Intelligence Hub (Drawer) */}
        {showScenarioHub && (
          <ScenarioComparisonPanel
            state={state}
            activeScenarioId={activeScenarioId}
            onSelectScenario={handleSelectScenario}
            onClose={() => setShowScenarioHub(false)}
            onFocusDepartment={handleFocusDepartment}
          />
        )}

        {/* Right Side: Department Details Inspector Drawer */}
        {selectedDept && (
          <DepartmentDetailsPanel
            dept={selectedDept}
            onClose={() => setSelectedDeptId(null)}
            onFocus={handleFocusDepartment}
          />
        )}

        {/* Right Side / Floating: Operations & Color Legend HUD */}
        {showLegend && (
          <div className="absolute right-4 top-4 bottom-16 w-[380px] max-w-[calc(100vw-32px)] bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl z-30 text-white flex flex-col overflow-hidden animate-in fade-in slide-in-from-right duration-250 select-none">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">🎨</span>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">Operations & Color Guide</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Digital Twin Simulation Map Visuals</p>
                </div>
              </div>
              <button
                onClick={() => setShowLegend(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close guide"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Legend Body */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {/* 1. Department Operations & Signatures */}
              <div className="space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1.5">
                  <span>🏥</span> Department Operation Colors
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#ef4444] shrink-0 mt-0.5 shadow-sm shadow-red-500/50" />
                    <div>
                      <div className="font-bold text-slate-200">Emergency Unit (Red)</div>
                      <div className="text-[11px] text-slate-400">Triage intake, acute trauma, incoming ambulance admissions & resuscitation.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#8b5cf6] shrink-0 mt-0.5 shadow-sm shadow-purple-500/50" />
                    <div>
                      <div className="font-bold text-slate-200">Intensive Care Unit (ICU - Purple)</div>
                      <div className="text-[11px] text-slate-400">Critical intensive care, mechanical ventilators, and life support monitoring.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#3b82f6] shrink-0 mt-0.5 shadow-sm shadow-blue-500/50" />
                    <div>
                      <div className="font-bold text-slate-200">General Inpatient Ward (Blue)</div>
                      <div className="text-[11px] text-slate-400">Post-operative recovery beds, inpatient stays & step-down capacity.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#06b6d4] shrink-0 mt-0.5 shadow-sm shadow-cyan-500/50" />
                    <div>
                      <div className="font-bold text-slate-200">Radiology & Imaging (Cyan)</div>
                      <div className="text-[11px] text-slate-400">CT scan, MRI suites, and X-Ray diagnostic throughput.</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Operational Status Beacons */}
              <div className="space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1.5">
                  <span>🚦</span> Live Status Indicator Beacons
                </div>
                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span><strong>Normal:</strong> Wait &lt; 45m · Occupancy &lt; 80%</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-950/30 border border-amber-500/30 text-amber-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span><strong>Warning:</strong> Wait 45-89m · Occupancy 80-89%</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    <span><strong>Critical:</strong> Wait ≥ 90m · Occupancy ≥ 90%</span>
                  </div>
                </div>
              </div>

              {/* 3. Interconnection Corridors & Ripples */}
              <div className="space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1.5">
                  <span>⚡</span> Corridors & System Pressures
                </div>
                <div className="space-y-2 text-[11px] text-slate-300">
                  <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-cyan-400 font-bold text-base leading-none">〰</span>
                    <div>
                      <div className="font-semibold text-slate-200">Cyan Dashed Lines (Flow Corridors)</div>
                      <div className="text-slate-400">Active patient transfer movement between stations.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-rose-400 font-bold text-base leading-none">⚡</span>
                    <div>
                      <div className="font-semibold text-slate-200">Red / Amber Arcs (Ripple Pressures)</div>
                      <div className="text-slate-400">Downstream transfer lockup holding patients back in upstream units.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Unified Minimalist Bottom Telemetry & Status Strip */}
        {state && (
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between gap-4 pointer-events-none z-10 flex-wrap">
            {/* Left KPI Counters */}
            <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl px-4 py-2 flex items-center gap-4 text-xs font-mono text-slate-300 shadow-xl">
              <div>
                Beds:{' '}
                <strong className="text-slate-100 font-bold">
                  {state.totalBedsOccupied} / {state.totalBeds}
                </strong>{' '}
                <span className="text-slate-400 font-normal">
                  ({state.totalBeds > 0 ? Math.round((state.totalBedsOccupied / state.totalBeds) * 100) : 0}%)
                </span>
              </div>
              <div className="text-slate-700">|</div>
              <div>
                Queue:{' '}
                <strong className={state.totalPatientsWaiting > 20 ? 'text-amber-400 font-bold' : 'text-slate-100 font-bold'}>
                  {state.totalPatientsWaiting} pts
                </strong>
              </div>
              <div className="text-slate-700">|</div>
              <div>
                Avg Wait:{' '}
                <strong className={state.avgWaitTimeMin >= 45 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {state.avgWaitTimeMin} min
                </strong>
              </div>
              <div className="hidden sm:block text-slate-700">|</div>
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-cyan-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Deterministic Steady-State Twin</span>
              </div>
            </div>

            {/* Right Guide Pill & Quick Legend Toggle */}
            <div className="pointer-events-auto flex items-center gap-2">
              <button
                onClick={() => setShowLegend((v) => !v)}
                className="bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-2 text-[11px] font-mono text-purple-300 flex items-center gap-1.5 shadow-xl transition-colors cursor-pointer"
                title="View Color & Operations Legend"
              >
                <span>🎨</span>
                <span>Color Guide</span>
              </button>
              <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl px-3.5 py-2 text-[11px] font-mono text-slate-400 flex items-center gap-2 shadow-xl">
                {viewMode === '2d' ? (
                  <>
                    <span className="text-cyan-400">👆 Click Department</span>
                    <span>•</span>
                    <span>Inspect Telemetry</span>
                  </>
                ) : (
                  <>
                    <span className="text-cyan-400">🖱 Left Click: Rotate</span>
                    <span>•</span>
                    <span>Scroll: Zoom</span>
                    <span>•</span>
                    <span>Click: Inspect</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
