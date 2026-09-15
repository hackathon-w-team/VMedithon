import React, { useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { Department, DepartmentPrediction } from '../../types'

interface BklitWaveChartProps {
  departments: Department[]
  predictions: DepartmentPrediction[]
}

export const BklitWaveChart: React.FC<BklitWaveChartProps> = ({
  departments,
  predictions,
}) => {
  const totalQueue = departments.reduce((acc, d) => acc + d.patients_waiting, 0)
  const totalBeds = departments.reduce((acc, d) => acc + d.beds_occupied, 0)

  // Hourly synthetic projection based on current live queue & service times
  const data = [
    { time: '08:00', arrival: 14, processed: 12, backlog: totalQueue - 6 },
    { time: '10:00', arrival: 28, processed: 18, backlog: totalQueue - 2 },
    { time: '12:00', arrival: 36, processed: 22, backlog: totalQueue + 4 },
    { time: '14:00', arrival: totalQueue * 2 + 10, processed: totalQueue + 8, backlog: totalQueue },
    { time: '16:00', arrival: 32, processed: 26, backlog: Math.max(0, totalQueue - 3) },
    { time: '18:00', arrival: 22, processed: 24, backlog: Math.max(0, totalQueue - 7) },
    { time: '20:00', arrival: 15, processed: 19, backlog: Math.max(0, totalQueue - 10) },
  ]

  const [hoverIndex, setHoverIndex] = useState<number | null>(3)

  return (
    <div className="relative bg-[#0c0d12] border border-[#232634] rounded-2xl p-6 overflow-hidden flex flex-col justify-between select-none shadow-2xl group">
      {/* Blueprint Grid & Ticks */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e2230_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between z-10 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400">
              Patient Flow · Influx vs Throughput
            </span>
          </div>
          <div className="text-xl font-bold text-white tracking-tight flex items-baseline gap-2">
            <span>{totalQueue} pts waiting</span>
            <span className="text-xs text-cyan-400 font-mono font-normal bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
              Live Trajectory
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
            <span>Arrivals</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#64748b]" />
            <span>Discharges</span>
          </div>
        </div>
      </div>

      {/* SVG Wave Chart Container */}
      <div className="relative w-full h-48 z-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              {/* Bklit Hatched Pattern */}
              <pattern id="bklit-hatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="8" stroke="#38bdf8" strokeWidth="1.5" opacity="0.3" />
              </pattern>
              <linearGradient id="bklit-glow-blue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="bklit-glow-gray" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="time"
              stroke="#334155"
              tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              stroke="#334155"
              tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
              domain={[0, 'dataMax + 10']}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null
                return (
                  <div className="bg-[#12141c]/95 backdrop-blur-md border border-[#2d3142] p-3 rounded-xl shadow-2xl text-white font-mono text-xs space-y-1.5 z-30 min-w-[140px]">
                    <div className="text-slate-400 font-semibold border-b border-slate-800 pb-1 flex items-center justify-between">
                      <span>{label}</span>
                      <span className="text-[10px] text-cyan-400">● Live</span>
                    </div>
                    <div className="flex justify-between items-center text-cyan-300">
                      <span>Arrival:</span>
                      <span className="font-bold">{payload[0]?.value} pts</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Discharge:</span>
                      <span className="font-bold">{payload[1]?.value} pts</span>
                    </div>
                  </div>
                )
              }}
            />

            {/* Gray Area (Discharges) */}
            <Area
              type="monotone"
              dataKey="processed"
              stroke="#64748b"
              strokeWidth={2}
              fill="url(#bklit-glow-gray)"
              isAnimationActive={true}
              animationDuration={1500}
              animationEasing="ease-out"
            />

            {/* Blue Wave (Arrivals) */}
            <Area
              type="monotone"
              dataKey="arrival"
              stroke="#38bdf8"
              strokeWidth={2.5}
              fill="url(#bklit-glow-blue)"
              isAnimationActive={true}
              animationDuration={1800}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Timeline Axis Ticks */}
      <div className="flex items-center justify-between pt-2 border-t border-[#1e2230] z-10 text-[11px] font-mono text-slate-500">
        <span>08:00 AM SHIFT START</span>
        <span className="text-cyan-400">CURRENT PEAK SURGE</span>
        <span>20:00 PM NIGHT ROSTER</span>
      </div>
    </div>
  )
}
