import type { Department, DepartmentId } from '../types'
import type { ScenarioPreview } from '../lib/format'

export default function DeltaRow({
  id,
  preview,
  departments,
}: {
  id: string
  preview: ScenarioPreview
  departments: Record<DepartmentId, Department>
}) {
  const before = preview.waitBefore[id]
  const after = preview.waitAfter[id]
  const delta = Math.round((after - before) * 10) / 10
  const improved = delta < 0
  const worse = delta > 0
  const name = departments[id as DepartmentId]?.name || id

  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/60 last:border-0 hover:bg-slate-900/40 transition-colors">
      <div>
        <div className="text-sm font-bold text-white">{name}</div>
        {improved && <div className="text-xs text-emerald-400 font-mono mt-0.5">↓ Saves {Math.abs(delta)} minutes</div>}
        {worse && <div className="text-xs text-amber-400 font-mono mt-0.5">↑ +{delta} min — within nominal bounds</div>}
        {!improved && !worse && <div className="text-xs text-slate-500 font-mono mt-0.5">Unaffected</div>}
      </div>
      <div className="flex items-center gap-2.5 text-right font-mono">
        <span className="text-base text-slate-500 line-through">{before}m</span>
        <span className="text-slate-600">→</span>
        <span className={`text-xl font-bold ${improved ? 'text-emerald-400' : worse ? 'text-amber-400' : 'text-slate-300'}`}>
          {Math.round(after * 10) / 10}
        </span>
        <span className="text-xs text-slate-400">min</span>
      </div>
    </div>
  )
}
