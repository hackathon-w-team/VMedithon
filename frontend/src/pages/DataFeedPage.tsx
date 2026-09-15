import { useRef, useState } from 'react'
import { api, ApiError } from '../api/client'
import { formatTime } from '../lib/format'
import LiveDeptGrid from '../components/LiveDeptGrid'
import type { HospitalState, ImportReport } from '../types'

export default function DataFeedPage() {
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const [gridKey, setGridKey] = useState(0)
  const [importBusy, setImportBusy] = useState(false)
  const [importReport, setImportReport] = useState<ImportReport | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [exportBusy, setExportBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  function handleSynced(_s: HospitalState) {
    setLastSynced(new Date())
  }

  async function handleExport() {
    setExportBusy(true)
    setImportError(null)
    try {
      const blob = await api.exportSpreadsheet()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `hospital_data_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '')}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setImportError(e instanceof ApiError ? e.message : 'Could not download the spreadsheet')
    } finally {
      setExportBusy(false)
    }
  }

  async function handleFileChosen(file: File) {
    setImportBusy(true)
    setImportError(null)
    setImportReport(null)
    try {
      const report = await api.importSpreadsheet(file)
      setImportReport(report)
      setLastSynced(new Date())
      // Force the live grid to remount and pick up the freshly-imported
      // state on its next poll immediately rather than waiting out the
      // regular interval.
      setGridKey((k) => k + 1)
    } catch (e) {
      setImportError(e instanceof ApiError ? e.message : 'Could not import that file')
    } finally {
      setImportBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 p-6 rounded-xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold">Synchronized Data Grid</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight mb-2">
              Live Data Feed & Bulk Ingestion
            </h1>
            <p className="text-xs md:text-sm text-slate-400 leading-relaxed max-w-2xl">
              Real-time reactive matrix syncing with live ward terminals. Modify values inline for instant hot-reloads, or utilize standardized Excel/CSV schemas for batch ingestion and offline audit exports.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-cyan-400 font-mono bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-lg shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {lastSynced ? `SYNCED ${formatTime(lastSynced.toISOString())}` : 'CONNECTING...'}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-6 pt-5 border-t border-slate-800">
          <button
            onClick={handleExport}
            disabled={exportBusy}
            className="bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono font-semibold px-4 py-2.5 rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <span className="text-cyan-400">↓</span>
            {exportBusy ? 'PREPARING SPREADSHEET...' : 'EXPORT TELEMETRY (.XLSX)'}
          </button>

          <label
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-bold px-4 py-2.5 rounded-lg transition-all cursor-pointer shadow-md shadow-cyan-950/40 disabled:opacity-50 flex items-center gap-2"
          >
            <span>↑</span>
            {importBusy ? 'INGESTING...' : 'UPLOAD BATCH (.XLSX / .CSV)'}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xlsm,.csv"
              className="hidden"
              disabled={importBusy}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileChosen(file)
              }}
            />
          </label>

          {importError && <span className="text-xs font-mono text-rose-400 bg-rose-950/30 border border-rose-800/50 px-3 py-1.5 rounded">{importError}</span>}
        </div>

        {importReport && (
          <div className="mt-4 text-xs font-mono bg-slate-950/80 border border-slate-800 p-4 rounded-lg space-y-1.5">
            <div className="font-semibold text-emerald-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Ingested {importReport.rows_read} row{importReport.rows_read === 1 ? '' : 's'} — Updated{' '}
              {importReport.departments_updated.length} department{importReport.departments_updated.length === 1 ? '' : 's'}.
            </div>
            {importReport.warnings.length > 0 && (
              <ul className="list-disc list-inside text-amber-400 space-y-0.5">
                {importReport.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <LiveDeptGrid key={gridKey} onSynced={handleSynced} />
    </div>
  )
}
