export type DepartmentType =
  | 'emergency'
  | 'icu'
  | 'ward'
  | 'radiology'
  | 'operating_room'
  | 'lab'
  | 'pharmacy'
  | 'general'

export type Status3D = 'ok' | 'warning' | 'critical'

export interface Department3D {
  id: string
  name: string
  type: DepartmentType
  gridX: number
  gridZ: number
  width: number
  depth: number
  color: string
  // Capacity & occupancy
  bedsTotal: number
  bedsOccupied: number
  bedOccupancyPct: number
  // Staff
  staffTotal: number
  staffAssigned: number
  staffShortage: number
  // Load & metrics
  patientsWaiting: number
  avgServiceTimeMin: number
  predictedWaitMin: number
  predictedOccupancyPct: number
  status: Status3D
  statusReason: string
  dependsOn: string[]
  // Simulation analysis
  isBottleneck: boolean
  hasModifiedState: boolean
  deltaWaitMin?: number
  deltaOccupancyPct?: number
  deltaStaff?: number
  deltaBeds?: number
}

export interface Resource3D {
  id: string
  departmentId: string
  type: 'bed' | 'equipment' | 'station'
  name: string
  total: number
  occupied: number
  status: Status3D
}

export interface PatientFlow3D {
  id: string
  fromDeptId: string
  toDeptId: string
  volume: number
  status: 'normal' | 'congested'
  curvePoints?: [number, number, number][]
}

export interface RippleEffect3D {
  id: string
  fromDeptId: string
  toDeptId: string
  impactType: 'positive' | 'negative' | 'neutral'
  message: string
  deltaWaitMin: number
}

export interface Action3D {
  type: string
  fromDept?: string
  toDept?: string
  amount: number
  label: string
}

export interface Scenario3D {
  id: string
  title: string
  description: string
  actions: Action3D[]
  totalWaitMin: number
  deltaWaitMin: number
  score: number
  criticalCount: number
  isRecommended: boolean
}

export interface Hospital3DState {
  name: string
  timestamp: string
  overallStatus: Status3D
  departments: Department3D[]
  resources: Resource3D[]
  flows: PatientFlow3D[]
  rippleEffects: RippleEffect3D[]
  activeScenarioId: string // 'current' | 'recommended' | scenario index/id
  availableScenarios: Scenario3D[]
  recommendation: Scenario3D | null
  totalPatientsWaiting: number
  totalBedsOccupied: number
  totalBeds: number
  avgWaitTimeMin: number
}

export interface HospitalDataProvider {
  getHospitalState(): Promise<Hospital3DState>
  getScenarioState(scenarioId: string): Promise<Hospital3DState>
  getAvailableScenarios(): Promise<Scenario3D[]>
}
