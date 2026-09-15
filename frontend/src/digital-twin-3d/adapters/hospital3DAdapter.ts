import type {
  Department,
  DepartmentId,
  DepartmentPrediction,
  DependencyEdge,
  HospitalState,
  ScenarioResult,
} from '../../types'
import type {
  Department3D,
  DepartmentType,
  Hospital3DState,
  PatientFlow3D,
  Resource3D,
  RippleEffect3D,
  Scenario3D,
  Status3D,
} from './types'

// Grid layout parameters
const ZONE_SPACING_X = 36
const ZONE_SPACING_Z = 32

function resolveDepartmentType(id: string, name: string): DepartmentType {
  const s = `${id} ${name}`.toLowerCase()
  if (s.includes('emergency') || s.includes('ed') || s.includes('er')) return 'emergency'
  if (s.includes('icu') || s.includes('intensive') || s.includes('critical')) return 'icu'
  if (s.includes('ward') || s.includes('general') || s.includes('inpatient')) return 'ward'
  if (s.includes('radiology') || s.includes('diagnostic') || s.includes('imaging') || s.includes('xray'))
    return 'radiology'
  if (s.includes('operat') || s.includes('surgery') || s.includes('theatre') || s.includes('or'))
    return 'operating_room'
  if (s.includes('lab') || s.includes('pathology')) return 'lab'
  if (s.includes('pharm')) return 'pharmacy'
  return 'general'
}

function resolveDepartmentColor(type: DepartmentType): string {
  switch (type) {
    case 'emergency':
      return '#ef4444' // red
    case 'icu':
      return '#8b5cf6' // purple
    case 'ward':
      return '#3b82f6' // blue
    case 'radiology':
      return '#06b6d4' // cyan
    case 'operating_room':
      return '#10b981' // emerald
    case 'lab':
      return '#f59e0b' // amber
    case 'pharmacy':
      return '#ec4899' // pink
    default:
      return '#64748b' // slate
  }
}

/**
 * Assign dynamic physical positions around a central atrium/corridor.
 * Known core departments get intuitive architectural anchors, while
 * any additional departments dynamically expand along the grid.
 */
function calculateGridPositions(deptList: Department[]): Map<string, { x: number; z: number }> {
  const positions = new Map<string, { x: number; z: number }>()

  // Preferred strategic anchors for known core departments
  const anchors: Record<string, { x: number; z: number }> = {
    emergency: { x: -ZONE_SPACING_X / 2, z: ZONE_SPACING_Z / 2 },
    radiology: { x: ZONE_SPACING_X / 2, z: ZONE_SPACING_Z / 2 },
    icu: { x: -ZONE_SPACING_X / 2, z: -ZONE_SPACING_Z / 2 },
    general_ward: { x: ZONE_SPACING_X / 2, z: -ZONE_SPACING_Z / 2 },
  }

  const unplaced: Department[] = []

  deptList.forEach((d) => {
    if (anchors[d.id]) {
      positions.set(d.id, anchors[d.id])
    } else {
      unplaced.push(d)
    }
  })

  // Arrange any additional dynamic departments along outer campus zones
  let row = 1
  let col = 0
  unplaced.forEach((d) => {
    const x = (col % 2 === 0 ? -1 : 1) * (ZONE_SPACING_X / 2 + Math.floor(col / 2) * ZONE_SPACING_X)
    const z = -ZONE_SPACING_Z * row
    positions.set(d.id, { x, z })
    col++
    if (col >= 4) {
      col = 0
      row++
    }
  })

  return positions
}

export function transformTo3DState(
  state: HospitalState,
  predictions: DepartmentPrediction[],
  edges: DependencyEdge[],
  scenarioResults: ScenarioResult[] = [],
  activeScenarioIndex: number | null = null, // null means current baseline state
): Hospital3DState {
  const predictionMap = new Map<string, DepartmentPrediction>()
  predictions.forEach((p) => predictionMap.set(p.department, p))

  const deptList = Object.values(state.departments)
  const positions = calculateGridPositions(deptList)

  // Map candidate scenarios from optimizer
  const scenarios3D: Scenario3D[] = scenarioResults.map((sr, idx) => {
    const actionLabels = sr.actions.map((a) => {
      if (a.type === 'move_staff') {
        const fromName = state.departments[a.from_department as DepartmentId]?.name || a.from_department
        const toName = state.departments[a.to_department as DepartmentId]?.name || a.to_department
        return {
          type: a.type,
          fromDept: a.from_department ?? undefined,
          toDept: a.to_department ?? undefined,
          amount: a.amount,
          label: `Move ${a.amount} staff: ${fromName} \u2192 ${toName}`,
        }
      }
      if (a.type === 'open_beds') {
        const toName = state.departments[a.to_department as DepartmentId]?.name || a.to_department
        return {
          type: a.type,
          toDept: a.to_department ?? undefined,
          amount: a.amount,
          label: `Open ${a.amount} beds in ${toName}`,
        }
      }
      const fromName = state.departments[a.from_department as DepartmentId]?.name || a.from_department
      const toName = state.departments[a.to_department as DepartmentId]?.name || a.to_department
      return {
        type: a.type,
        fromDept: a.from_department ?? undefined,
        toDept: a.to_department ?? undefined,
        amount: a.amount,
        label: `Shift ${a.amount} patients: ${fromName} \u2192 ${toName}`,
      }
    })

    const baselineTotalWait = predictions.reduce((acc, p) => acc + p.predicted_wait_min, 0)
    const deltaWait = Math.round(baselineTotalWait - sr.total_wait_min)

    return {
      id: `scenario-${idx}`,
      title: idx === 0 ? 'AI Recommended Optimization' : `Alternative Scenario #${idx + 1}`,
      description: actionLabels.map((a) => a.label).join(' & '),
      actions: actionLabels,
      totalWaitMin: sr.total_wait_min,
      deltaWaitMin: deltaWait,
      score: sr.score,
      criticalCount: sr.critical_departments.length,
      isRecommended: idx === 0,
    }
  })

  // Selected scenario (if any)
  const activeScenario = activeScenarioIndex !== null ? scenarios3D[activeScenarioIndex] : null
  const activeScenarioResult = activeScenarioIndex !== null ? scenarioResults[activeScenarioIndex] : null

  // If a scenario is selected, map its predictions and changes
  const scenarioPredictionMap = new Map<string, DepartmentPrediction>()
  if (activeScenarioResult) {
    activeScenarioResult.predictions.forEach((p) => scenarioPredictionMap.set(p.department, p))
  }

  // Calculate department deltas if scenario is active
  const departments3D: Department3D[] = deptList.map((dept) => {
    const pos = positions.get(dept.id) || { x: 0, z: 0 }
    const type = resolveDepartmentType(dept.id, dept.name)
    const color = resolveDepartmentColor(type)

    const basePred = predictionMap.get(dept.id)
    const scenPred = scenarioPredictionMap.get(dept.id)

    // Current or simulated values based on active scenario
    const effectivePred = scenPred || basePred
    const predictedWait = effectivePred?.predicted_wait_min ?? 0
    const predictedOcc = effectivePred?.predicted_occupancy_pct ?? (dept.beds_total > 0 ? (dept.beds_occupied / dept.beds_total) * 100 : 0)
    const status = (effectivePred?.status as Status3D) || 'ok'
    const statusReason = effectivePred?.status_reason || 'Operating within normal operational parameters.'

    // Check action deltas for this department
    let deltaStaff = 0
    let deltaBeds = 0
    if (activeScenarioResult) {
      activeScenarioResult.actions.forEach((a) => {
        if (a.type === 'move_staff') {
          if (a.from_department === dept.id) deltaStaff -= a.amount
          if (a.to_department === dept.id) deltaStaff += a.amount
        } else if (a.type === 'open_beds' && a.to_department === dept.id) {
          deltaBeds += a.amount
        }
      })
    }

    const baselineWait = basePred?.predicted_wait_min ?? 0
    const deltaWait = scenPred ? Math.round(scenPred.predicted_wait_min - baselineWait) : 0
    const deltaOcc = scenPred ? Math.round(scenPred.predicted_occupancy_pct - (basePred?.predicted_occupancy_pct ?? 0)) : 0

    const isBottleneck = status === 'critical' || predictedWait >= 90 || (dept.beds_total > 0 && dept.beds_occupied / dept.beds_total >= 0.85)

    return {
      id: dept.id,
      name: dept.name,
      type,
      gridX: pos.x,
      gridZ: pos.z,
      width: 22,
      depth: 20,
      color,
      bedsTotal: dept.beds_total + deltaBeds,
      bedsOccupied: dept.beds_occupied,
      bedOccupancyPct: Math.round(predictedOcc),
      staffTotal: dept.staff_total,
      staffAssigned: Math.max(0, dept.staff_assigned + deltaStaff),
      staffShortage: Math.max(0, dept.staff_total - (dept.staff_assigned + deltaStaff)),
      patientsWaiting: dept.patients_waiting,
      avgServiceTimeMin: dept.avg_service_time_min,
      predictedWaitMin: predictedWait,
      predictedOccupancyPct: Math.round(predictedOcc),
      status,
      statusReason,
      dependsOn: dept.depends_on,
      isBottleneck,
      hasModifiedState: deltaStaff !== 0 || deltaBeds !== 0 || deltaWait !== 0,
      deltaWaitMin: deltaWait,
      deltaOccupancyPct: deltaOcc,
      deltaStaff,
      deltaBeds,
    }
  })

  // Build 3D resources
  const resources: Resource3D[] = []
  departments3D.forEach((d) => {
    if (d.bedsTotal > 0) {
      resources.push({
        id: `${d.id}-beds`,
        departmentId: d.id,
        type: 'bed',
        name: `${d.name} Inpatient Beds`,
        total: d.bedsTotal,
        occupied: d.bedsOccupied,
        status: d.bedOccupancyPct >= 90 ? 'critical' : d.bedOccupancyPct >= 80 ? 'warning' : 'ok',
      })
    }

    if (d.type === 'radiology') {
      resources.push({
        id: `${d.id}-ct`,
        departmentId: d.id,
        type: 'equipment',
        name: 'CT Scanner Suite',
        total: 2,
        occupied: d.patientsWaiting > 5 ? 2 : 1,
        status: d.patientsWaiting > 8 ? 'critical' : 'ok',
      })
      resources.push({
        id: `${d.id}-mri`,
        departmentId: d.id,
        type: 'equipment',
        name: 'MRI Diagnostic Unit',
        total: 1,
        occupied: 1,
        status: 'ok',
      })
    } else if (d.type === 'icu') {
      resources.push({
        id: `${d.id}-ventilators`,
        departmentId: d.id,
        type: 'equipment',
        name: 'Mechanical Ventilators',
        total: d.bedsTotal,
        occupied: Math.min(d.bedsOccupied, d.bedsTotal),
        status: d.bedsOccupied >= d.bedsTotal ? 'critical' : 'ok',
      })
    } else if (d.type === 'emergency') {
      resources.push({
        id: `${d.id}-triage`,
        departmentId: d.id,
        type: 'station',
        name: 'Triage & Resuscitation Bays',
        total: 4,
        occupied: Math.min(4, Math.ceil(d.patientsWaiting / 4)),
        status: d.patientsWaiting >= 12 ? 'critical' : 'ok',
      })
    }
  })

  // Build dynamic patient flows based on dependency graph and patient arrival
  const flows: PatientFlow3D[] = []
  edges.forEach((edge, idx) => {
    const fromDept = departments3D.find((d) => d.id === edge.from)
    const toDept = departments3D.find((d) => d.id === edge.to)
    if (fromDept && toDept) {
      flows.push({
        id: `flow-${edge.from}-${edge.to}-${idx}`,
        fromDeptId: edge.from,
        toDeptId: edge.to,
        volume: fromDept.patientsWaiting + 2,
        status: toDept.isBottleneck ? 'congested' : 'normal',
      })
    }
  })

  // Build ripple effects
  const rippleEffects: RippleEffect3D[] = []
  if (activeScenarioResult) {
    // Actions generate ripples
    activeScenarioResult.actions.forEach((act, idx) => {
      if (act.type === 'move_staff' && act.from_department && act.to_department) {
        const fromD = departments3D.find((d) => d.id === act.from_department)
        const toD = departments3D.find((d) => d.id === act.to_department)
        if (fromD && toD) {
          rippleEffects.push({
            id: `ripple-staff-${idx}`,
            fromDeptId: act.from_department,
            toDeptId: act.to_department,
            impactType: 'positive',
            message: `Staff reallocation (+${act.amount}) accelerates treatment in ${toD.name}`,
            deltaWaitMin: toD.deltaWaitMin ?? 0,
          })
        }
      } else if (act.type === 'open_beds' && act.to_department) {
        const toD = departments3D.find((d) => d.id === act.to_department)
        // Find who depends on to_department
        departments3D
          .filter((d) => d.dependsOn.includes(act.to_department!))
          .forEach((upstream) => {
            rippleEffects.push({
              id: `ripple-bed-${upstream.id}-${act.to_department}`,
              fromDeptId: act.to_department!,
              toDeptId: upstream.id,
              impactType: 'positive',
              message: `Opened beds in ${toD?.name || 'ward'} relieve boarding backlog in ${upstream.name}`,
              deltaWaitMin: upstream.deltaWaitMin ?? 0,
            })
          })
      }
    })
  } else {
    // In baseline, highlight dependency ripple pressures
    departments3D.forEach((dept) => {
      dept.dependsOn.forEach((depId) => {
        const downstream = departments3D.find((d) => d.id === depId)
        if (downstream && downstream.bedOccupancyPct >= 85) {
          rippleEffects.push({
            id: `ripple-pressure-${dept.id}-${depId}`,
            fromDeptId: depId,
            toDeptId: dept.id,
            impactType: 'negative',
            message: `${downstream.name} high occupancy (${downstream.bedOccupancyPct}%) blocks transfer, inflating ${dept.name} wait times`,
            deltaWaitMin: Math.round((downstream.bedOccupancyPct - 85) * 0.8),
          })
        }
      })
    })
  }

  // Hospital KPI summary
  const totalBeds = departments3D.reduce((sum, d) => sum + d.bedsTotal, 0)
  const totalBedsOccupied = departments3D.reduce((sum, d) => sum + d.bedsOccupied, 0)
  const totalPatientsWaiting = departments3D.reduce((sum, d) => sum + d.patientsWaiting, 0)
  const avgWaitTimeMin =
    departments3D.length > 0
      ? Math.round(departments3D.reduce((sum, d) => sum + d.predictedWaitMin, 0) / departments3D.length)
      : 0

  const hasCritical = departments3D.some((d) => d.status === 'critical')
  const hasWarning = departments3D.some((d) => d.status === 'warning')
  const overallStatus: Status3D = hasCritical ? 'critical' : hasWarning ? 'warning' : 'ok'

  return {
    name: 'Metropolitan Hospital Digital Twin',
    timestamp: state.timestamp || new Date().toISOString(),
    overallStatus,
    departments: departments3D,
    resources,
    flows,
    rippleEffects,
    activeScenarioId: activeScenario ? activeScenario.id : 'current',
    availableScenarios: scenarios3D,
    recommendation: scenarios3D[0] || null,
    totalPatientsWaiting,
    totalBedsOccupied,
    totalBeds,
    avgWaitTimeMin,
  }
}
