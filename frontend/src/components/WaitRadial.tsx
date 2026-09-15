import { RadialBarChart, RadialBar } from 'recharts'
import type { Department, DepartmentPrediction } from '../types'
import { STATUS } from '../lib/status'

export default function WaitRadial({ dept, prediction }: { dept: Department; prediction?: DepartmentPrediction }) {
  const status = prediction?.status || 'ok'
  const cfg = STATUS[status]
  const wait = prediction?.predicted_wait_min ?? 0
  const pct = Math.min(100, Math.round((wait / 60) * 100))
  const data = [{ name: dept.name, value: pct, fill: cfg.color }]
  const isCrit = status === 'critical'

  return (
    <div className="text-center group transition-transform duration-200 hover:scale-105">
      <div className="relative">
        <RadialBarChart
          width={80}
          height={80}
          cx={40}
          cy={40}
          innerRadius={28}
          outerRadius={38}
          data={data}
          startAngle={90}
          endAngle={-270}
          style={{ margin: '0 auto' }}
        >
          <RadialBar
            dataKey="value"
            background={{ fill: '#f1f5f9' }}
            cornerRadius={4}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </RadialBarChart>
        {isCrit && (
          <span className="absolute top-1 right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
        )}
      </div>
      <div className={`text-base font-bold -mt-1 ${isCrit ? 'text-red-600' : 'text-slate-800'}`} style={{ fontFamily: 'DM Mono, monospace' }}>
        {wait}m
      </div>
      <div className="text-[10px] text-slate-500 font-medium truncate max-w-[72px] mx-auto">{dept.name}</div>
    </div>
  )
}
