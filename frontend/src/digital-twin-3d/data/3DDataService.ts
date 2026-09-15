import { ExistingHospitalAPIProvider } from '../adapters/apiProvider'
import { DemoHospitalDataProvider } from '../adapters/demoAdapter'
import type { Hospital3DState, HospitalDataProvider } from '../adapters/types'

export type DataServiceListener = (state: Hospital3DState | null, error: string | null, isDemo: boolean) => void

export class Hospital3DDataService {
  private apiProvider: ExistingHospitalAPIProvider
  private demoProvider: DemoHospitalDataProvider
  private currentProvider: HospitalDataProvider
  private isDemoMode = false
  private pollIntervalMs = 5000
  private timerId: number | null = null
  private listeners: Set<DataServiceListener> = new Set()
  private currentState: Hospital3DState | null = null
  private currentError: string | null = null
  private activeScenarioId = 'current'

  constructor() {
    this.apiProvider = new ExistingHospitalAPIProvider()
    this.demoProvider = new DemoHospitalDataProvider()
    this.currentProvider = this.apiProvider
  }

  public subscribe(listener: DataServiceListener): () => void {
    this.listeners.add(listener)
    // Emit initial state if available
    listener(this.currentState, this.currentError, this.isDemoMode)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.currentState, this.currentError, this.isDemoMode))
  }

  public async start(): Promise<void> {
    await this.refresh()
    if (this.timerId === null) {
      this.timerId = window.setInterval(() => {
        // Only poll if on current baseline or refreshing data
        this.refresh()
      }, this.pollIntervalMs)
    }
  }

  public stop(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId)
      this.timerId = null
    }
  }

  public setPollInterval(ms: number) {
    this.pollIntervalMs = ms
    if (this.timerId !== null) {
      this.stop()
      this.start()
    }
  }

  public toggleDemoMode(enableDemo?: boolean): void {
    const nextMode = enableDemo !== undefined ? enableDemo : !this.isDemoMode
    this.isDemoMode = nextMode
    this.currentProvider = nextMode ? this.demoProvider : this.apiProvider
    this.refresh()
  }

  public async setScenario(scenarioId: string): Promise<void> {
    this.activeScenarioId = scenarioId
    try {
      this.currentState = await this.currentProvider.getScenarioState(scenarioId)
      this.currentError = null
    } catch (err) {
      this.currentError = err instanceof Error ? err.message : 'Error switching scenario'
    }
    this.notify()
  }

  public async refresh(): Promise<void> {
    try {
      if (!this.isDemoMode && this.apiProvider) {
        await this.apiProvider.fetchFreshData()
      }
      this.currentState = await this.currentProvider.getScenarioState(this.activeScenarioId)
      this.currentError = null
    } catch (err) {
      this.currentError = err instanceof Error ? err.message : 'Hospital data connection unavailable'
      // If real API fails and state is null, we do not silently switch to demo, but notify UI
    }
    this.notify()
  }

  public async simulateCustomActions(actions: any[]): Promise<Hospital3DState | null> {
    try {
      const { api } = await import('../../api/client')
      const result = await api.simulate(actions)
      if (this.currentProvider && 'setCustomScenario' in this.currentProvider) {
        ;(this.currentProvider as any).setCustomScenario(result)
      }
      this.activeScenarioId = 'custom'
      this.currentState = await this.currentProvider.getScenarioState('custom')
      this.currentError = null
      this.notify()
      return this.currentState
    } catch (err) {
      this.currentError = err instanceof Error ? err.message : 'Simulation failed'
      this.notify()
      throw err
    }
  }

  public getCurrentState(): Hospital3DState | null {
    return this.currentState
  }

  public getIsDemoMode(): boolean {
    return this.isDemoMode
  }
}

// Export singleton instance for app-wide sharing
export const dataService3D = new Hospital3DDataService()
