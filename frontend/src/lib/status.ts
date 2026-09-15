import type { Status } from '../types'

export const STATUS: Record<Status, { label: string; color: string; pillCls: string; border: string }> = {
  critical: { label: 'Critical', color: '#ef4444', pillCls: 'bg-red-100 text-red-700', border: '#fca5a5' },
  warning: { label: 'Attention', color: '#f59e0b', pillCls: 'bg-amber-100 text-amber-700', border: '#fcd34d' },
  ok: { label: 'Normal', color: '#22c55e', pillCls: 'bg-green-100 text-green-700', border: '#86efac' },
}
