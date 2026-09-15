import React from 'react'
import type { Hospital3DState, Scenario3D } from '../adapters/types'
import type { CameraPreset } from '../scene/HospitalScene'

interface CommandCenterHeaderProps {
  state: Hospital3DState | null
  activeScenarioId: string
  onSelectScenario: (scenarioId: string) => void
  cameraPreset: CameraPreset
  onSelectCameraPreset: (preset: CameraPreset) => void
  viewMode: '2d' | '3d'
  onToggleViewMode: (mode: '2d' | '3d') => void
  isDemoMode: boolean
  onToggleDemoMode: () => void
  isBottleneckMode: boolean
  onToggleBottleneckMode: () => void
  showFlows: boolean
  onToggleFlows: () => void
  showRipples: boolean
  onToggleRipples: () => void
  onRefresh: () => void
  refreshing: boolean
}

export const CommandCenterHeader: React.FC<CommandCenterHeaderProps> = ({
  state,
  activeScenarioId,
  onSelectScenario,
  cameraPreset,
  onSelectCameraPreset,
  viewMode,
  onToggleViewMode,
  isDemoMode,
  onToggleDemoMode,
  isBottleneckMode,
  onToggleBottleneckMode,
  showFlows,
  onToggleFlows,
  showRipples,
  onToggleRipples,
  onRefresh,
  refreshing,
}) => {
  const scenarios = state?.availableScenarios || []
  const overallStatus = state?.overallStatus || 'ok'

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white px-6 py-3 flex items-center justify-between flex-wrap gap-4 z-20 relative">
      {/* Left: Brand & Live Indicator */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
              HOSPITAL DIGITAL TWIN
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
                OPERATIONAL TWIN
              </span>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              {state?.name || 'Metropolitan Hospital'} · {state ? new Date(state.timestamp).toLocaleTimeString() : 'Connecting…'}
            </div>
          </div>
        </div>

        {/* 2D Map vs 3D View Mode Toggle */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => onToggleViewMode('2d')}
            className={`text-xs px-3 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === '2d'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🗺</span> 2D Simulation Map
          </button>
          <button
            onClick={() => onToggleViewMode('3d')}
            className={`text-xs px-3 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === '3d'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🧊</span> 3D Isometric View
          </button>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              overallStatus === 'critical'
                ? 'bg-red-500 animate-pulse'
                : overallStatus === 'warning'
                ? 'bg-amber-400 animate-pulse'
                : 'bg-emerald-500'
            }`}
          />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            {isDemoMode ? 'DEMO ENVIRONMENT' : 'LIVE TWIN'}
          </span>
        </div>
      </div>

      {/* Middle: Scenario Mode Selector */}
      <div className="flex items-center gap-2 bg-slate-950/70 p-1 rounded-lg border border-slate-800">
        <span className="text-[11px] font-mono text-slate-400 px-2 uppercase tracking-wide">State:</span>
        <button
          onClick={() => onSelectScenario('current')}
          className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
            activeScenarioId === 'current'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Current State
        </button>

        {scenarios.map((scen, idx) => (
          <button
            key={scen.id}
            onClick={() => onSelectScenario(scen.id)}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
              activeScenarioId === scen.id
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {scen.isRecommended && <span className="text-amber-300 text-[10px]">★</span>}
            {scen.isRecommended ? 'Recommended Scenario' : `Scenario ${idx + 1}`}
          </button>
        ))}
      </div>

      {/* Right: Camera Presets & Visualization Controls */}
      <div className="flex items-center gap-3">
        {/* View mode switches */}
        <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800">
          <button
            onClick={onToggleBottleneckMode}
            className={`text-xs px-2.5 py-1 rounded transition-colors ${
              isBottleneckMode
                ? 'bg-red-500/20 text-red-300 border border-red-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Highlight bottlenecks and ripple blockers"
          >
            ⚠ Bottlenecks
          </button>

          <button
            onClick={onToggleRipples}
            className={`text-xs px-2.5 py-1 rounded transition-colors ${
              showRipples
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle cross-department ripple arcs"
          >
            ⚡ Ripples
          </button>

          <button
            onClick={onToggleFlows}
            className={`text-xs px-2.5 py-1 rounded transition-colors ${
              showFlows
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle patient flow streams"
          >
            〰 Flows
          </button>
        </div>

        {/* Camera Quick Buttons */}
        <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800">
          <span className="text-[10px] text-slate-500 px-1 font-mono">CAM:</span>
          {(['overview', 'emergency', 'icu', 'ward', 'radiology', 'top-down'] as CameraPreset[]).map((cam) => (
            <button
              key={cam}
              onClick={() => onSelectCameraPreset(cam)}
              className={`text-xs px-2 py-1 rounded capitalize transition-colors ${
                cameraPreset === cam
                  ? 'bg-slate-700 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {cam === 'top-down' ? '2D Top' : cam === 'ward' ? 'Ward' : cam}
            </button>
          ))}
        </div>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-50"
          title="Refresh hospital state"
        >
          <svg
            className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
        </button>

        {/* Demo Mode Toggle */}
        <button
          onClick={onToggleDemoMode}
          className={`text-xs px-2.5 py-1 rounded-md font-mono transition-colors ${
            isDemoMode
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-slate-500 hover:text-slate-300'
          }`}
          title="Toggle offline fallback demo data"
        >
          {isDemoMode ? 'Demo: ON' : 'Demo: OFF'}
        </button>
      </div>
    </div>
  )
}
