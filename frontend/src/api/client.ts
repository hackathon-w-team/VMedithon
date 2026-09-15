import type {
  Action,
  DecisionLogEntry,
  Department,
  DependencyEdge,
  DepartmentId,
  DepartmentPrediction,
  HospitalState,
  ImportReport,
  PublicUser,
  ScenarioResult,
  UserRole,
} from '../types'

const BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000'

let authToken: string | null = localStorage.getItem('hdt_token')

export function setAuthToken(token: string | null) {
  authToken = token
  if (token) localStorage.setItem('hdt_token', token)
  else localStorage.removeItem('hdt_token')
}

export function getAuthToken() {
  return authToken
}

class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (authToken) headers.Authorization = `Bearer ${authToken}`

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail || detail
    } catch {
      // ignore parse errors, fall back to statusText
    }
    throw new ApiError(res.status, detail)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export { ApiError }

export const api = {
  // Auth
  register: (name: string, email: string, password: string, requestedRole: UserRole = 'staff') =>
    request<PublicUser>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, requested_role: requestedRole }),
    }),
  login: (email: string, password: string) =>
    request<{ access_token: string; user: PublicUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<PublicUser>('/api/auth/me'),
  pendingUsers: () => request<PublicUser[]>('/api/auth/pending'),
  allUsers: () => request<PublicUser[]>('/api/auth/users'),
  approveUser: (userId: string) =>
    request<PublicUser>(`/api/auth/approve/${userId}`, { method: 'POST' }),
  setUserRole: (userId: string, role: UserRole) =>
    request<PublicUser>(`/api/auth/role/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),

  // Hospital state
  getState: () => request<HospitalState>('/api/hospital/state'),
  getPredictions: () => request<DepartmentPrediction[]>('/api/hospital/predict'),
  getDependencies: () => request<DependencyEdge[]>('/api/hospital/dependencies'),
  resetState: () => request<HospitalState>('/api/hospital/reset', { method: 'POST' }),
  updateDepartment: (id: DepartmentId, update: Partial<Department> & { depends_on?: DepartmentId[] }) =>
    request<HospitalState>(`/api/hospital/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(update),
    }),

  // Live data feed (spreadsheet import/export)
  exportSpreadsheet: async (): Promise<Blob> => {
    const headers: Record<string, string> = {}
    if (authToken) headers.Authorization = `Bearer ${authToken}`
    const res = await fetch(`${BASE_URL}/api/hospital/export.xlsx`, { headers })
    if (!res.ok) throw new ApiError(res.status, res.statusText)
    return res.blob()
  },
  importSpreadsheet: async (file: File): Promise<ImportReport> => {
    const headers: Record<string, string> = {}
    if (authToken) headers.Authorization = `Bearer ${authToken}`
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`${BASE_URL}/api/hospital/import`, {
      method: 'POST',
      headers,
      body: formData,
    })
    if (!res.ok) {
      let detail = res.statusText
      try {
        const body = await res.json()
        detail = body.detail || detail
      } catch {
        // ignore
      }
      throw new ApiError(res.status, detail)
    }
    return res.json()
  },

  // Simulation
  simulate: (actions: Action[]) =>
    request<ScenarioResult>('/api/simulate', {
      method: 'POST',
      body: JSON.stringify({ actions }),
    }),
  optimize: (maxActions = 2) =>
    request<ScenarioResult[]>('/api/optimize', {
      method: 'POST',
      body: JSON.stringify({ max_actions: maxActions }),
    }),
  decisions: () => request<DecisionLogEntry[]>('/api/decisions'),

  // Notifications & Nurse Task Center
  getNotifications: () => request<NurseNotification[]>('/api/notifications'),
  acknowledgeNotification: (id: string) =>
    request<NurseNotification>(`/api/notifications/acknowledge/${id}`, { method: 'POST' }),
  dispatchNotification: (data: Partial<NurseNotification>) =>
    request<NurseNotification>('/api/notifications/dispatch', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}
