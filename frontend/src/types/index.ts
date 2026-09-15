export type Status = 'ok' | 'warning' | 'critical'

export type DepartmentId = 'emergency' | 'icu' | 'general_ward' | 'radiology'

export interface Department {
  id: DepartmentId
  name: string
  beds_total: number
  beds_occupied: number
  staff_total: number
  staff_assigned: number
  patients_waiting: number
  avg_service_time_min: number
  depends_on: DepartmentId[]
}

export interface HospitalState {
  departments: Record<DepartmentId, Department>
  timestamp: string | null
}

export interface DepartmentPrediction {
  department: DepartmentId
  predicted_wait_min: number
  predicted_occupancy_pct: number
  status: Status
  status_reason: string
}

export type ActionType = 'move_staff' | 'open_beds' | 'shift_workload'

export interface Action {
  type: ActionType
  from_department?: DepartmentId | null
  to_department?: DepartmentId | null
  amount: number
}

export interface ScenarioResult {
  actions: Action[]
  predictions: DepartmentPrediction[]
  score: number
  total_wait_min: number
  max_wait_min: number
  critical_departments: DepartmentId[]
}

export interface DependencyEdge {
  from: DepartmentId
  to: DepartmentId
}

export type UserRole = 'admin' | 'nurse' | 'data_entry'
export type UserStatus = 'pending' | 'approved'

export interface PublicUser {
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
}

export interface NurseNotification {
  id: string
  timestamp: string
  title: string
  message: string
  target_role: UserRole
  target_user_id?: string | null
  from_department?: DepartmentId | null
  to_department?: DepartmentId | null
  action_type: 'reassignment' | 'task' | 'surge' | 'broadcast'
  status: 'unread' | 'acknowledged'
  acknowledged_by?: string | null
  acknowledged_at?: string | null
  created_by: string
}

export interface ImportReport {
  state: HospitalState
  rows_read: number
  departments_updated: DepartmentId[]
  changes: Record<string, string[]>
  warnings: string[]
}

export interface DecisionLogEntry {
  id: string
  timestamp: string
  user_name: string
  kind: 'simulate' | 'optimize' | 'reset'
  action_labels: string[]
  total_wait_min: number | null
  score: number | null
}
