import type { Action, Department, DepartmentId, DepartmentPrediction, ScenarioResult } from '../types'

export function deptName(id: DepartmentId | null | undefined, departments: Record<DepartmentId, Department>): string {
  if (!id) return 'Unknown'
  return departments[id]?.name || id
}

export function actionIconType(action: Action): 'staff' | 'bed' | 'redirect' {
  if (action.type === 'move_staff') return 'staff'
  if (action.type === 'open_beds') return 'bed'
  return 'redirect'
}

export function actionLabel(action: Action, departments: Record<DepartmentId, Department>): string {
  const from = deptName(action.from_department, departments)
  const to = deptName(action.to_department, departments)
  if (action.type === 'move_staff') return `Move ${action.amount} staff: ${from} \u2192 ${to}`
  if (action.type === 'open_beds') return `Open ${action.amount} beds in ${to}`
  return `Shift ${action.amount} patients: ${from} \u2192 ${to}`
}

export function scenarioLabel(scenario: ScenarioResult, departments: Record<DepartmentId, Department>): string {
  if (scenario.actions.length === 0) return 'Do nothing (current setup)'
  return scenario.actions.map((a) => actionLabel(a, departments)).join(' + ')
}

export function scenarioSublabel(scenario: ScenarioResult, departments: Record<DepartmentId, Department>): string {
  if (scenario.actions.length === 0) return 'Keep the current staffing and bed allocation.'
  const critical = scenario.critical_departments.length
  const criticalText =
    critical === 0
      ? 'No department stays critical.'
      : `${critical} department${critical > 1 ? 's remain' : ' remains'} critical.`
  return `Predicted total wait: ${scenario.total_wait_min} min. ${criticalText}`
}

export interface ScenarioPreview {
  headline: string
  summary: string
  waitBefore: Record<string, number>
  waitAfter: Record<string, number>
  stillCritical: DepartmentId[]
}

/** Builds a plain-language preview from real before/after numbers — every
 * word here is derived from the same predictions shown in the chart below
 * it, not separately-authored copy. */
export function buildScenarioPreview(
  baseline: DepartmentPrediction[],
  scenario: ScenarioResult,
  departments: Record<DepartmentId, Department>,
): ScenarioPreview {
  const waitBefore: Record<string, number> = {}
  const waitAfter: Record<string, number> = {}
  baseline.forEach((p) => (waitBefore[p.department] = p.predicted_wait_min))
  scenario.predictions.forEach((p) => (waitAfter[p.department] = p.predicted_wait_min))

  let biggestDrop = { id: '', amount: 0 }
  for (const id of Object.keys(waitBefore)) {
    const drop = waitBefore[id] - (waitAfter[id] ?? waitBefore[id])
    if (drop > biggestDrop.amount) biggestDrop = { id, amount: drop }
  }

  const headline =
    biggestDrop.amount > 0
      ? `${deptName(biggestDrop.id as DepartmentId, departments)} wait drops from ${waitBefore[biggestDrop.id]} to ${Math.round(waitAfter[biggestDrop.id])} minutes.`
      : scenario.actions.length === 0
        ? 'This is the current situation with no changes applied.'
        : "This scenario doesn't meaningfully improve wait times."

  const actionsText = scenario.actions.length
    ? `Applies: ${scenario.actions.map((a) => actionLabel(a, departments)).join('; ')}.`
    : 'No actions applied.'

  const criticalText =
    scenario.critical_departments.length === 0
      ? 'No department remains critical.'
      : `${scenario.critical_departments
          .map((id) => deptName(id, departments))
          .join(', ')} still needs attention.`

  return {
    headline,
    summary: `${actionsText} ${criticalText}`,
    waitBefore,
    waitAfter,
    stillCritical: scenario.critical_departments,
  }
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
