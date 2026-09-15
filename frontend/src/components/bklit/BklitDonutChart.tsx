import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { Department } from '../../types'

interface BklitDonutChartProps {
  departments: Department[]
}

export const BklitDonutChart: React.FC<BklitDonutChartProps> = ({ departments }) => {
  const totalBeds = departments.reduce((acc, d) => acc + d.beds_total, 0)
  const totalOccupied = departments.reduce((acc, d) => acc + d.beds_occupied, 0)
  const occupancyPct = totalBeds > 0 ? Math.round((totalOccupied / totalBeds) * 100) : 0

  const data = departments
    .filter((d) => d.beds_total > 0)
    .map((d) => ({
      name: d.name,
      id: d.id,
      value: d.beds_occupied,
      total: d.beds_total,
      available: Math.max(0, d.beds_total - d.beds_occupied),
      pct: Math.round((d.beds_occupied / d.beds_total) * 100),
    }))

  // Monochrome / slate / blue palette matching Bklit reference
  const segmentColors = ['#e2e8f0', '#94a3b8', '#475569', '#334155']

  return (
    <div className="relative bg-[#0c0d12] border border-[#232634] rounded-2xl p-6 overflow-hidden flex flex-col justify-between select-none shadow-2xl group">
      {/* Background blueprint subtle texture */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e2230_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400">
              Bed Capacity Breakdown
            </span>
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            Campus Occupancy
          </div>
        </div>
        <div className="text-right font-mono">
          <div className="text-xs text-slate-400">STATUS</div>
          <div className={`text-xs font-bold ${occupancyPct >= 85 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {occupancyPct >= 85 ? 'HIGH UTILIZATION' : 'NOMINAL'}
          </div>
        </div>
      </div>

      {/* Donut Chart with Center Metric */}
      <div className="relative w-full h-48 flex items-center justify-center z-10 my-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {/* Diagonal stripes pattern */}
              <pattern id="donut-hatch" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="6" stroke="#94a3b8" strokeWidth="1.5" />
              </pattern>
            </defs>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null
                const item = payload[0].payload
                return (
                  <div className="bg-[#12141c]/95 backdrop-blur-md border border-[#2d3142] p-3 rounded-xl shadow-2xl text-white font-mono text-xs space-y-1 z-30 min-w-[130px]">
                    <div className="font-bold text-slate-200 border-b border-slate-800 pb-1">{item.name}</div>
                    <div className="flex justify-between text-slate-400">
                      <span>Occupied:</span>
                      <span className="text-white font-bold">{item.value} / {item.total}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Utilization:</span>
                      <span className="text-cyan-400 font-bold">{item.pct}%</span>
                    </div>
                  </div>
                )
              }}
            />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={75}
              paddingAngle={4}
              dataKey="value"
              isAnimationActive={true}
              animationDuration={1400}
              animationEasing="ease-out"
              stroke="#0c0d12"
              strokeWidth={3}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={index === 1 ? 'url(#donut-hatch)' : segmentColors[index % segmentColors.length]}
                  className="transition-all hover:opacity-80 cursor-pointer"
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center Big Metric */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-2xl font-bold font-mono text-white tracking-tight">
            {occupancyPct}%
          </div>
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            {totalOccupied}/{totalBeds} BEDS
          </div>
        </div>
      </div>

      {/* Footer Legend */}
      <div className="flex items-center justify-between border-t border-[#1e2230] pt-2 z-10 text-[11px] font-mono text-slate-400">
        {data.map((d, i) => (
          <div key={d.id} className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-sm"
              style={{ backgroundColor: segmentColors[i % segmentColors.length] }}
            />
            <span>{d.id.slice(0, 3).toUpperCase()}: {d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
