import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { Department, DepartmentId } from '../types'
import type { ScenarioPreview } from '../lib/format'

export default function WaitComparisonChart({
  preview,
  departments,
}: {
  preview: ScenarioPreview
  departments: Record<DepartmentId, Department>
}) {
  const deptIds = Object.keys(preview.waitBefore)
  const data = deptIds.map((id) => ({
    name: departments[id as DepartmentId]?.name || id,
    Before: preview.waitBefore[id],
    After: preview.waitAfter[id],
  }))

  return (
    <div className="bg-white border border-slate-200 p-4 transition-all duration-200 hover:shadow-sm" style={{ borderRadius: 4 }}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Wait times — before vs after (minutes)
        </div>
        <div className="text-[10px] font-mono text-emerald-600 font-semibold">Lower is better ↓</div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barGap={4} barCategoryGap="30%">
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} />
          <Tooltip
            contentStyle={{ borderRadius: 6, border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 }}
            formatter={(val: unknown) => [`${val} min`]}
          />
          <Bar
            dataKey="Before"
            fill="#fca5a5"
            radius={[4, 4, 0, 0]}
            name="Before"
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
          />
          <Bar
            dataKey="After"
            radius={[4, 4, 0, 0]}
            name="After"
            isAnimationActive={true}
            animationDuration={1500}
            animationEasing="ease-out"
          >
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={entry.After < entry.Before ? '#22c55e' : entry.After > entry.Before ? '#f59e0b' : '#93c5fd'}
                className="transition-all hover:opacity-80"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-1 flex-wrap">
        <span className="text-[10px] text-slate-400 flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5" style={{ background: '#fca5a5', borderRadius: 1 }} /> Before
        </span>
        <span className="text-[10px] text-slate-400 flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5" style={{ background: '#22c55e', borderRadius: 1 }} /> Improved
        </span>
        <span className="text-[10px] text-slate-400 flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5" style={{ background: '#f59e0b', borderRadius: 1 }} /> Slightly higher
        </span>
      </div>
    </div>
  )
}
