import { useCallback, useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { api } from './api/client'
import type { DependencyEdge, DepartmentPrediction, HospitalState, ScenarioResult } from './types'

import Header, { type View } from './components/Header'
import StepBar from './components/StepBar'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import PendingPage from './pages/PendingPage'
import SituationPage from './pages/SituationPage'
import ExplorePage from './pages/ExplorePage'
import PreviewPage from './pages/PreviewPage'
import AdminPage from './pages/AdminPage'
import DecisionsLogPage from './pages/DecisionsLogPage'
import ManageDataPage from './pages/ManageDataPage'
import DataFeedPage from './pages/DataFeedPage'
import DataEntryPage from './pages/DataEntryPage'
import NursePortalPage from './pages/NursePortalPage'
import { DigitalTwin3DView } from './digital-twin-3d/DigitalTwin3DView'

const POLL_INTERVAL_MS = 20_000

function Dashboard() {
  const { user, logout } = useAuth()
  const [view, setView] = useState<View>(
    user?.role === 'nurse'
      ? 'nurse'
      : user?.role === 'data_entry'
      ? 'data-entry'
      : 'situation'
  )

  const [hospitalState, setHospitalState] = useState<HospitalState | null>(null)
  const [predictions, setPredictions] = useState<DepartmentPrediction[]>([])
  const [edges, setEdges] = useState<DependencyEdge[]>([])
  const [scenarios, setScenarios] = useState<ScenarioResult[]>([])
  const [scenariosLoading, setScenariosLoading] = useState(true)
  const [selectedScenario, setSelectedScenario] = useState<ScenarioResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)

  const loadCore = useCallback(async () => {
    try {
      const [state, preds, deps] = await Promise.all([
        api.getState(),
        api.getPredictions(),
        api.getDependencies(),
      ])
      setHospitalState(state)
      setPredictions(preds)
      setEdges(deps)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load hospital data')
    }
  }, [])

  const loadRecommendations = useCallback(async () => {
    setScenariosLoading(true)
    try {
      const results = await api.optimize(2)
      setScenarios(results)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not calculate recommendations')
    } finally {
      setScenariosLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCore()
    loadRecommendations()
  }, [loadCore, loadRecommendations])

  // Keep the live dashboard fresh without the person having to refresh.
  useEffect(() => {
    const id = setInterval(loadCore, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [loadCore])

  function handleNavigate(next: View) {
    setView(next)
    window.scrollTo({ top: 0 })
    if (next === 'situation') {
      // Coming back to the dashboard (e.g. after editing hospital data)
      // should reflect the latest numbers immediately, not wait for the
      // next poll cycle.
      loadCore()
      loadRecommendations()
    }
  }

  function handleBack() {
    if (view === 'preview') setView('explore')
    else setView('situation')
    window.scrollTo({ top: 0 })
  }

  function handleSelectScenario(scenario: ScenarioResult) {
    setSelectedScenario(scenario)
    setView('preview')
    window.scrollTo({ top: 0 })
  }

  function handlePreviewRecommendation() {
    if (scenarios[0]) {
      setSelectedScenario(scenarios[0])
      setView('preview')
      window.scrollTo({ top: 0 })
    }
  }

  async function handleReset() {
    setResetting(true)
    try {
      await api.resetState()
      await loadCore()
      await loadRecommendations()
      setSelectedScenario(null)
      setView('situation')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reset demo data')
    } finally {
      setResetting(false)
    }
  }

  if (!user) return null

  if (!hospitalState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        {error ? (
          <div className="text-sm text-red-400 max-w-sm text-center px-4 bg-slate-900/80 p-6 rounded-2xl border border-red-500/40">
            Could not reach the simulation API: {error}
            <div className="text-slate-400 mt-2 font-mono text-xs">Is the backend running at the configured VITE_API_URL?</div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
            <div className="text-sm font-mono text-slate-400">Initializing Digital Twin Telemetry…</div>
          </div>
        )}
      </div>
    )
  }

  const showBack = view === 'explore' || view === 'preview'

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans select-none">
      <Header view={view} showBack={showBack} onBack={handleBack} user={user} onLogout={logout} onNavigate={handleNavigate} />
      {user.role === 'admin' && (view === 'situation' || view === 'explore' || view === 'preview') && (
        <StepBar view={view} />
      )}

      {error && (
        <div className="bg-red-950/80 border-b border-red-500/40 text-red-300 text-xs px-6 py-2.5 font-mono flex items-center gap-2">
          <span>⚠</span> {error}
        </div>
      )}

      {user.role === 'admin' && view === 'situation' && (
        <div className="px-6 pt-3 flex justify-end max-w-5xl mx-auto w-full">
          <button
            onClick={handleReset}
            disabled={resetting}
            className="text-xs font-mono text-slate-500 hover:text-cyan-400 underline decoration-dotted disabled:opacity-50 transition-colors"
          >
            {resetting ? 'Resetting…' : '↻ Reset demo data'}
          </button>
        </div>
      )}

      <div className={`flex-1 overflow-auto ${view === 'digital-twin-3d' ? 'p-0 overflow-hidden' : 'py-4'}`}>
        {/* Admin-only Views */}
        {user.role === 'admin' && view === 'digital-twin-3d' && (
          <DigitalTwin3DView
            initialHospitalState={hospitalState}
            initialPredictions={predictions}
            initialEdges={edges}
            initialScenarios={scenarios}
          />
        )}
        {user.role === 'admin' && view === 'situation' && (
          <SituationPage
            departments={hospitalState.departments}
            predictions={predictions}
            edges={edges}
            recommendation={scenarios[0] || null}
            recommendationLoading={scenariosLoading}
            onExplore={() => handleNavigate('explore')}
            onPreviewRecommendation={handlePreviewRecommendation}
          />
        )}
        {user.role === 'admin' && view === 'explore' && (
          <ExplorePage
            scenarios={scenarios}
            departments={hospitalState.departments}
            loading={scenariosLoading}
            onSelect={handleSelectScenario}
          />
        )}
        {user.role === 'admin' && view === 'preview' && selectedScenario && (
          <PreviewPage scenario={selectedScenario} baseline={predictions} departments={hospitalState.departments} />
        )}
        {user.role === 'admin' && view === 'admin' && <AdminPage />}
        {user.role === 'admin' && view === 'decisions' && <DecisionsLogPage />}
        {user.role === 'admin' && view === 'manage-data' && <ManageDataPage />}
        {user.role === 'admin' && view === 'data-feed' && <DataFeedPage />}

        {/* Nurse-only View */}
        {user.role === 'nurse' && <NursePortalPage />}

        {/* Data Entry only View */}
        {user.role === 'data_entry' && <DataEntryPage />}
      </div>
    </div>
  )
}

function AuthGate() {
  const { user, loading } = useAuth()
  const [authView, setAuthView] = useState<'login' | 'signup'>('login')

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-400 font-mono text-sm gap-3">
        <div className="w-8 h-8 border-3 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
        <span>Authenticating…</span>
      </div>
    )
  }

  if (!user) {
    return authView === 'login' ? (
      <LoginPage onGoToSignup={() => setAuthView('signup')} />
    ) : (
      <SignupPage onGoToLogin={() => setAuthView('login')} />
    )
  }

  if (user.status === 'pending') {
    return <PendingPage />
  }

  return <Dashboard />
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}
