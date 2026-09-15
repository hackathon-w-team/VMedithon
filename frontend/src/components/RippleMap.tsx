import type { Department, DependencyEdge, DepartmentId, DepartmentPrediction } from '../types'
import { STATUS } from '../lib/status'

interface RippleMapProps {
  departments: Department[]
  edges: DependencyEdge[]
  predictions: DepartmentPrediction[]
  highlightIds?: DepartmentId[]
}

const WIDTH = 460
const HEIGHT = 260
const RADIUS = 90
const CENTER_X = WIDTH / 2
const CENTER_Y = HEIGHT / 2 + 10

export default function RippleMap({ departments, edges, predictions, highlightIds = [] }: RippleMapProps) {
  const predictionById = Object.fromEntries(predictions.map((p) => [p.department, p]))

  const positions: Record<string, { x: number; y: number }> = {}
  departments.forEach((dept, i) => {
    const angle = (i / departments.length) * 2 * Math.PI - Math.PI / 2
    positions[dept.id] = {
      x: CENTER_X + RADIUS * Math.cos(angle),
      y: CENTER_Y + RADIUS * Math.sin(angle),
    }
  })

  const highlightSet = new Set(highlightIds)

  return (
    <div className="relative bg-[#0c0d12] border border-[#232634] rounded-2xl p-5 overflow-hidden shadow-2xl flex flex-col justify-between select-none">
      {/* Blueprint Grid & Ticks */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e2230_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />

      <div className="flex items-center justify-between mb-2 z-10">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400">
              Ripple Dependency Graph
            </span>
          </div>
          <div className="text-sm font-bold text-white tracking-tight">
            Inter-Department Bottleneck Propagation
          </div>
        </div>
        <div className="text-[10px] font-mono text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-800/40">
          FLOW VECTORS
        </div>
      </div>

      <div className="relative z-10 w-full">
        <svg width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Department dependency map">
          <defs>
            <marker id="ripple-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M1 1L9 5L1 9" fill="none" stroke="#64748b" strokeWidth="1.5" />
            </marker>
            <marker id="ripple-arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M1 1L9 5L1 9" fill="none" stroke="#38bdf8" strokeWidth="2" />
            </marker>
            <marker id="ripple-arrow-critical" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M1 1L9 5L1 9" fill="none" stroke="#ef4444" strokeWidth="2" />
            </marker>
          </defs>

        {edges.map((edge, i) => {
          const from = positions[edge.from]
          const to = positions[edge.to]
          if (!from || !to) return null
          const active = highlightSet.has(edge.from) && highlightSet.has(edge.to)
          const fromPred = predictionById[edge.from]
          const isCriticalFlow = fromPred?.status === 'critical'

          // Shrink the line so it doesn't run under the node circles.
          const dx = to.x - from.x
          const dy = to.y - from.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const nodeR = 30
          const x1 = from.x + (dx / dist) * nodeR
          const y1 = from.y + (dy / dist) * nodeR
          const x2 = to.x - (dx / dist) * nodeR
          const y2 = to.y - (dy / dist) * nodeR

          return (
            <g key={i}>
              {/* Base dependency line */}
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={active ? '#2563eb' : isCriticalFlow ? '#fca5a5' : '#e2e8f0'}
                strokeWidth={active ? 2 : 1.5}
                markerEnd={active ? 'url(#ripple-arrow-active)' : isCriticalFlow ? 'url(#ripple-arrow-critical)' : 'url(#ripple-arrow)'}
              />
              {/* Animated overlay particle line for active flow */}
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={active ? '#3b82f6' : isCriticalFlow ? '#ef4444' : '#94a3b8'}
                strokeWidth={active || isCriticalFlow ? 2 : 1.2}
                strokeDasharray="4,6"
                className="animate-flow-dash"
                opacity={active || isCriticalFlow ? 0.9 : 0.4}
              />
            </g>
          )
        })}

        {departments.map((dept) => {
          const pos = positions[dept.id]
          const prediction = predictionById[dept.id]
          const status = prediction?.status || 'ok'
          const cfg = STATUS[status]
          const isHighlighted = highlightSet.has(dept.id)
          const isCrit = status === 'critical'
          const isWarn = status === 'warning'

          return (
            <g key={dept.id} className="transition-transform duration-200 hover:scale-105" style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}>
              {/* Animated pulsating ripple ring on high-risk nodes */}
              {(isCrit || isWarn) && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={30}
                  fill="none"
                  stroke={cfg.color}
                  strokeWidth={2}
                  className="animate-ripple-ring"
                />
              )}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={30}
                fill="#12141c"
                stroke={isHighlighted ? '#38bdf8' : cfg.color}
                strokeWidth={isHighlighted ? 2.5 : isCrit ? 2 : 1.5}
                className={isCrit ? 'animate-pulse-glow' : ''}
              />
              <circle cx={pos.x} cy={pos.y} r={26} fill={cfg.color} opacity={0.16} />
              <text x={pos.x} y={pos.y - 3} textAnchor="middle" fontSize="10" fontWeight={600} fill="#f1f5f9">
                {dept.name.length > 10 ? `${dept.name.slice(0, 9)}…` : dept.name}
              </text>
              <text x={pos.x} y={pos.y + 11} textAnchor="middle" fontSize="11" fontFamily="DM Mono, monospace" fontWeight={600} fill={isCrit ? '#ef4444' : '#94a3b8'}>
                {prediction?.predicted_wait_min ?? 0}m
              </text>
            </g>
          )
        })}
        </svg>
      </div>
    </div>
  )
}
