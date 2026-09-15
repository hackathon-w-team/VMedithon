import React from 'react'
import type { Scenario3D } from '../adapters/types'

interface RecommendationBannerProps {
  recommendation: Scenario3D | null
  activeScenarioId: string
  onApplyRecommendation: () => void
  onDismiss?: () => void
}

export const RecommendationBanner: React.FC<RecommendationBannerProps> = ({
  recommendation,
  activeScenarioId,
  onApplyRecommendation,
}) => {
  if (!recommendation) return null

  const isAlreadyActive = activeScenarioId === recommendation.id

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md border border-emerald-500/40 rounded-xl shadow-2xl p-3.5 flex items-center gap-4 z-20 text-white max-w-2xl animate-in fade-in slide-in-from-top duration-300">
      <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 uppercase tracking-wider font-mono">
            AI OPTIMIZATION RECOMMENDATION
          </span>
          <span className="text-xs text-slate-400 font-mono">
            Score: <strong className="text-emerald-400">+{recommendation.score}</strong>
          </span>
        </div>

        <div className="text-xs font-semibold text-slate-100 truncate">
          {recommendation.description}
        </div>

        <div className="text-[11px] text-slate-400 flex items-center gap-3 mt-0.5">
          <span>
            Expected wait relief:{' '}
            <strong className="text-emerald-400 font-mono">-{recommendation.deltaWaitMin} min</strong>
          </span>
          <span>•</span>
          <span>Risk: <strong className="text-blue-300">LOW (Simulated)</strong></span>
        </div>
      </div>

      <div>
        <button
          onClick={onApplyRecommendation}
          className={`text-xs px-3.5 py-2 rounded-lg font-semibold transition-all shadow-lg ${
            isAlreadyActive
              ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
          }`}
        >
          {isAlreadyActive ? 'Active in 3D' : 'Simulate in 3D →'}
        </button>
      </div>
    </div>
  )
}
