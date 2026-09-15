import { api } from '../../api/client'
import type { DependencyEdge, DepartmentPrediction, HospitalState, ScenarioResult } from '../../types'
import { transformTo3DState } from './hospital3DAdapter'
import type { Hospital3DState, HospitalDataProvider, Scenario3D } from './types'

export class ExistingHospitalAPIProvider implements HospitalDataProvider {
  private cachedState: HospitalState | null = null
  private cachedPredictions: DepartmentPrediction[] = []
  private cachedEdges: DependencyEdge[] = []
  private cachedScenarios: ScenarioResult[] = []
  private customScenario: ScenarioResult | null = null

  public setCustomScenario(result: ScenarioResult | null) {
    this.customScenario = result
  }

  public seedInitialData(
    state: HospitalState | null,
    preds: DepartmentPrediction[],
    deps: DependencyEdge[],
    scenarios: ScenarioResult[],
  ) {
    if (state) this.cachedState = state
    if (preds.length > 0) this.cachedPredictions = preds
    if (deps.length > 0) this.cachedEdges = deps
    if (scenarios.length > 0) this.cachedScenarios = scenarios
  }

  async fetchFreshData(): Promise<void> {
    const [state, preds, deps] = await Promise.all([
      api.getState(),
      api.getPredictions(),
      api.getDependencies(),
    ])

    this.cachedState = state
    this.cachedPredictions = preds
    this.cachedEdges = deps

    // Concurrently retrieve optimizer recommendations without blocking core state
    api.optimize(2).then((scenarios) => {
      this.cachedScenarios = scenarios
    }).catch(() => {})
  }

  async getHospitalState(): Promise<Hospital3DState> {
    if (!this.cachedState) {
      await this.fetchFreshData()
    }

    return transformTo3DState(
      this.cachedState!,
      this.cachedPredictions,
      this.cachedEdges,
      this.cachedScenarios,
      null, // baseline
    )
  }

  async getScenarioState(scenarioId: string): Promise<Hospital3DState> {
    if (!this.cachedState) {
      await this.fetchFreshData()
    }

    if (scenarioId === 'current') {
      return this.getHospitalState()
    }

    if (scenarioId === 'custom' && this.customScenario) {
      return transformTo3DState(
        this.cachedState!,
        this.cachedPredictions,
        this.cachedEdges,
        [this.customScenario, ...this.cachedScenarios],
        0, // active is custom scenario at index 0
      )
    }

    // Match scenario by id (e.g. 'scenario-0', 'scenario-1') or 'recommended'
    let targetIndex = 0
    if (scenarioId === 'recommended') {
      targetIndex = 0
    } else {
      const parsed = parseInt(scenarioId.replace('scenario-', ''), 10)
      if (!isNaN(parsed) && parsed >= 0 && parsed < this.cachedScenarios.length) {
        targetIndex = parsed
      }
    }

    return transformTo3DState(
      this.cachedState!,
      this.cachedPredictions,
      this.cachedEdges,
      this.cachedScenarios,
      targetIndex,
    )
  }

  async getAvailableScenarios(): Promise<Scenario3D[]> {
    const state3D = await this.getHospitalState()
    return state3D.availableScenarios
  }
}
