import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { Department } from '../../types'

interface BklitBarChartProps {
  departments: Department[]
}

export const BklitBarChart: React.FC<BklitBarChartProps> = ({ departments }) => {
  const data = departments.map((d) => ({
    name: d.id.slice(0, 4).toUpperCase(),
    fullName: d.name,
    beds: d.beds_total ? Math.round((d.beds_occupied / d.beds_total) * 100) : 0,
    staff: d.staff_total ? Math.round((d.staff_assigned / d.staff_total) * 100) : 0,
    queue: d.patients_waiting,
  }))

  return (
    <div className="relative bg-[#0c0d12] border border-[#232634] rounded-2xl p-6 overflow-hidden flex flex-col justify-between select-none shadow-2xl group">
      {/* Blueprint grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e2230_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400">
              Comparative Metrics
            </span>
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            Capacity vs Staffing
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-200" />
            <span>Beds %</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-600" />
            <span>Staff %</span>
          </div>
        </div>
      </div>

      {/* Bar Chart Container */}
      <div className="relative w-full h-48 z-10 my-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4} barCategoryGap="25%">
            <defs>
              {/* Hatched Pattern for secondary bar */}
              <pattern id="bklit-bar-hatch" width="4" height="4" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="4" stroke="#e2e8f0" strokeWidth="1.2" />
              </pattern>
            </defs>

            <XAxis
              dataKey="name"
              stroke="#334155"
              tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'monospace' }}
              axisLine={{ stroke: '#1e2230' }}
              tickLine={false}
            />
            <YAxis
              stroke="#334155"
              tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              width={32}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null
                const d = payload[0].payload
                return (
                  <div className="bg-[#12141c]/95 backdrop-blur-md border border-[#2d3142] p-3 rounded-xl shadow-2xl text-white font-mono text-xs space-y-1 z-30 min-w-[140px]">
                    <div className="font-bold text-slate-200 border-b border-slate-800 pb-1">{d.fullName}</div>
                    <div className="flex justify-between text-slate-300">
                      <span>Beds:</span>
                      <span className="font-bold text-white">{d.beds}%</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Staff:</span>
                      <span className="font-bold text-slate-300">{d.staff}%</span>
                    </div>
                    <div className="flex justify-between text-cyan-400">
                      <span>Queue:</span>
                      <span className="font-bold">{d.queue} pts</span>
                    </div>
                  </div>
                )
              }}
            />

            {/* Primary Bed Occupancy Bar (Solid or highlight) */}
            <Bar
              dataKey="beds"
              name="Beds"
              radius={[4, 4, 0, 0]}
              isAnimationActive={true}
              animationDuration={1300}
              animationEasing="ease-out"
            >
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={entry.beds >= 95 ? '#ef4444' : entry.beds >= 85 ? '#f59e0b' : '#e2e8f0'}
                  className="transition-all hover:opacity-80 cursor-pointer"
                />
              ))}
            </Bar>

            {/* Secondary Staff Bar (Hatched texture / Dark Slate) */}
            <Bar
              dataKey="staff"
              name="Staff"
              fill="#475569"
              radius={[4, 4, 0, 0]}
              isAnimationActive={true}
              animationDuration={1600}
              animationEasing="ease-out"
              className="transition-all hover:opacity-80 cursor-pointer"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Axis Baseline */}
      <div className="flex items-center justify-between border-t border-[#1e2230] pt-2 z-10 text-[11px] font-mono text-slate-500">
        <span>ED: 85% OCC</span>
        <span>ICU: 83% OCC</span>
        <span>WARD: 90% OCC</span>
        <span>RAD: 0% BEDS</span>
      </div>
    </div>
  )
}
