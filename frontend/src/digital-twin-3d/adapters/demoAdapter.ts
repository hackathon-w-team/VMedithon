import type {
  DependencyEdge,
  Department,
  DepartmentId,
  DepartmentPrediction,
  HospitalState,
  ScenarioResult,
} from '../../types'
import { transformTo3DState } from './hospital3DAdapter'
import type { Hospital3DState, HospitalDataProvider, Scenario3D } from './types'

const DEMO_STATE: HospitalState = {
  timestamp: new Date().toISOString(),
  departments: {
    emergency: {
      id: 'emergency' as DepartmentId,
      name: 'Emergency Department',
      beds_total: 20,
      beds_occupied: 18,
      staff_total: 12,
      staff_assigned: 10,
      patients_waiting: 16,
      avg_service_time_min: 35,
      depends_on: ['general_ward' as DepartmentId, 'radiology' as DepartmentId],
    },
    icu: {
      id: 'icu' as DepartmentId,
      name: 'Intensive Care Unit',
      beds_total: 12,
      beds_occupied: 11,
      staff_total: 8,
      staff_assigned: 8,
      patients_waiting: 2,
      avg_service_time_min: 90,
      depends_on: ['general_ward' as DepartmentId],
    },
    general_ward: {
      id: 'general_ward' as DepartmentId,
      name: 'General Ward',
      beds_total: 40,
      beds_occupied: 37,
      staff_total: 14,
      staff_assigned: 14,
      patients_waiting: 4,
      avg_service_time_min: 25,
      depends_on: [],
    },
    radiology: {
      id: 'radiology' as DepartmentId,
      name: 'Radiology / Diagnostics',
      beds_total: 0,
      beds_occupied: 0,
      staff_total: 6,
      staff_assigned: 6,
      patients_waiting: 10,
      avg_service_time_min: 20,
      depends_on: [],
    },
  },
}

const DEMO_PREDICTIONS: DepartmentPrediction[] = [
  {
    department: 'emergency' as DepartmentId,
    predicted_wait_min: 88.5,
    predicted_occupancy_pct: 90.0,
    status: 'critical',
    status_reason:
      'General Ward is at 92.5% bed occupancy — patients cannot be admitted out of Emergency, adding boarding delay on top of incoming triage caseload.',
  },
  {
    department: 'icu' as DepartmentId,
    predicted_wait_min: 32.0,
    predicted_occupancy_pct: 91.7,
    status: 'warning',
    status_reason: 'Near maximum ICU bed capacity with 11 of 12 beds occupied.',
  },
  {
    department: 'general_ward' as DepartmentId,
    predicted_wait_min: 22.0,
    predicted_occupancy_pct: 92.5,
    status: 'warning',
    status_reason: 'High bed utilization (37/40 beds occupied) limiting step-down capacity.',
  },
  {
    department: 'radiology' as DepartmentId,
    predicted_wait_min: 33.3,
    predicted_occupancy_pct: 0.0,
    status: 'ok',
    status_reason: 'Operating normally with steady diagnostic throughput across CT and X-Ray suites.',
  },
]

const DEMO_EDGES: DependencyEdge[] = [
  { from: 'emergency' as DepartmentId, to: 'general_ward' as DepartmentId },
  { from: 'emergency' as DepartmentId, to: 'radiology' as DepartmentId },
  { from: 'icu' as DepartmentId, to: 'general_ward' as DepartmentId },
]

const DEMO_SCENARIOS: ScenarioResult[] = [
  {
    actions: [
      {
        type: 'move_staff',
        from_department: 'general_ward' as DepartmentId,
        to_department: 'emergency' as DepartmentId,
        amount: 2,
      },
      {
        type: 'open_beds',
        to_department: 'general_ward' as DepartmentId,
        amount: 4,
      },
    ],
    predictions: [
      {
        department: 'emergency' as DepartmentId,
        predicted_wait_min: 42.0,
        predicted_occupancy_pct: 75.0,
        status: 'ok',
        status_reason: 'Staff increase (+2) and unblocked General Ward admissions reduced wait by 46.5 mins.',
      },
      {
        department: 'icu' as DepartmentId,
        predicted_wait_min: 28.0,
        predicted_occupancy_pct: 83.3,
        status: 'ok',
        status_reason: 'Step-down transfers to General Ward restored.',
      },
      {
        department: 'general_ward' as DepartmentId,
        predicted_wait_min: 26.0,
        predicted_occupancy_pct: 84.1,
        status: 'ok',
        status_reason: '4 additional beds opened; manageable staff coverage.',
      },
      {
        department: 'radiology' as DepartmentId,
        predicted_wait_min: 33.3,
        predicted_occupancy_pct: 0.0,
        status: 'ok',
        status_reason: 'Operating normally with steady diagnostic throughput.',
      },
    ],
    score: 84.5,
    total_wait_min: 129.3,
    max_wait_min: 42.0,
    critical_departments: [],
  },
]

export class DemoHospitalDataProvider implements HospitalDataProvider {
  private customScenario: ScenarioResult | null = null

  public setCustomScenario(result: ScenarioResult | null) {
    this.customScenario = result
  }

  async getHospitalState(): Promise<Hospital3DState> {
    return transformTo3DState(DEMO_STATE, DEMO_PREDICTIONS, DEMO_EDGES, DEMO_SCENARIOS, null)
  }

  async getScenarioState(scenarioId: string): Promise<Hospital3DState> {
    if (scenarioId === 'current') return this.getHospitalState()
    if (scenarioId === 'custom' && this.customScenario) {
      return transformTo3DState(DEMO_STATE, DEMO_PREDICTIONS, DEMO_EDGES, [this.customScenario, ...DEMO_SCENARIOS], 0)
    }
    return transformTo3DState(DEMO_STATE, DEMO_PREDICTIONS, DEMO_EDGES, DEMO_SCENARIOS, 0)
  }

  async getAvailableScenarios(): Promise<Scenario3D[]> {
    const s = await this.getHospitalState()
    return s.availableScenarios
  }
}
