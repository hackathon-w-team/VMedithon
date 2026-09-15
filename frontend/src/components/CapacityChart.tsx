import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import type { Department } from '../types'

export default function CapacityChart({ departments }: { departments: Department[] }) {
  const data = departments.map((d) => ({
    name: d.id.slice(0, 4).toUpperCase(),
    fullName: d.name,
    beds: d.beds_total ? Math.round((d.beds_occupied / d.beds_total) * 100) : 0,
    staff: d.staff_total ? Math.round((d.staff_assigned / d.staff_total) * 100) : 0,
    bedsRaw: `${d.beds_occupied}/${d.beds_total}`,
    staffRaw: `${d.staff_assigned}/${d.staff_total}`,
  }))

  return (
    <div className="bg-white border border-slate-200 p-4 transition-all duration-200 hover:shadow-sm" style={{ borderRadius: 4 }}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          Live Capacity Overview (%)
        </div>
        <div className="text-[10px] font-mono text-slate-400">Target: &lt;85%</div>
      </div>
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={data} barGap={4} barCategoryGap="25%">
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#475569', fontWeight: 600, fontFamily: 'DM Mono, monospace' }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            width={32}
          />
          <ReferenceLine y={85} stroke="#f59e0b" strokeDasharray="3 3" opacity={0.6} />
          <Tooltip
            contentStyle={{
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              fontSize: 12,
              padding: '8px 12px',
            }}
            formatter={(val: unknown, name: unknown, item: any) => [
              `${val}% (${name === 'beds' ? item.payload.bedsRaw : item.payload.staffRaw})`,
              name === 'beds' ? 'Beds Occupancy' : 'Staff Deployed',
            ]}
            labelFormatter={(_, items) => items[0]?.payload.fullName || ''}
          />
          <Bar
            dataKey="beds"
            name="beds"
            radius={[4, 4, 0, 0]}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
          >
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={entry.beds >= 95 ? '#ef4444' : entry.beds >= 85 ? '#f59e0b' : '#10b981'}
                className="transition-all hover:opacity-80 cursor-pointer"
              />
            ))}
          </Bar>
          <Bar
            dataKey="staff"
            name="staff"
            fill="#93c5fd"
            radius={[4, 4, 0, 0]}
            isAnimationActive={true}
            animationDuration={1400}
            animationEasing="ease-out"
            className="transition-all hover:opacity-80 cursor-pointer"
          />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-2 flex-wrap border-t border-slate-100 pt-2">
        <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-300" /> Staff Deployed
        </span>
        <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-500" /> &lt;85% Normal
        </span>
        <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-500" /> 85-94% Warning
        </span>
        <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-500 animate-pulse" /> ≥95% Critical
        </span>
      </div>
    </div>
  )
}
