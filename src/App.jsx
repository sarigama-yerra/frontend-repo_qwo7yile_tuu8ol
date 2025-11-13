import React, { useEffect, useMemo, useRef, useState } from 'react'
import Spline from '@splinetool/react-spline'
import { Upload, Loader2, Trash2, Database, Play, History, Moon, SunMedium, Download, Table as TableIcon, ChevronRight } from 'lucide-react'

const BASE_URL = (import.meta?.env?.VITE_BACKEND_URL) || 'http://localhost:8000'

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem('theme')
    if (stored) return stored === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDark])

  return { isDark, setIsDark }
}

function Toast({ toasts, remove }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((t) => (
        <div key={t.id} className={classNames(
          'rounded-md px-4 py-3 shadow-lg border backdrop-blur transition-all',
          t.type === 'error' ? 'bg-red-500/10 border-red-500 text-red-600 dark:text-red-300' : 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300'
        )}>
          <div className="flex items-start gap-3">
            <div className="text-sm font-medium">{t.title}</div>
            <button onClick={() => remove(t.id)} className="text-xs opacity-70 hover:opacity-100">Dismiss</button>
          </div>
          {t.message && <div className="text-xs opacity-80 mt-1">{t.message}</div>}
        </div>
      ))}
    </div>
  )
}

function useToasts() {
  const [toasts, setToasts] = useState([])
  const add = (toast) => {
    const id = Math.random().toString(36).slice(2)
    const t = { id, type: 'success', ...toast }
    setToasts((prev) => [...prev, t])
    setTimeout(() => remove(id), 6000)
  }
  const remove = (id) => setToasts((prev) => prev.filter((t) => t.id !== id))
  return { toasts, add, remove }
}

function Hero({ onGetStarted }) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="h-[520px] sm:h-[620px]">
          <Spline scene="https://prod.spline.design/VJLoxp84lCdVfdZu/scene.splinecode" style={{ width: '100%', height: '100%' }} />
        </div>
      </div>
      <div className="relative pt-16 pb-24 sm:pt-24 sm:pb-28">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-600 dark:text-blue-300 backdrop-blur">
              <Database size={14} /> AI-powered data exploration
            </div>
            <h1 className="mt-4 text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Natural Language Query Service
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl">
              Upload your data, ask questions in plain English. Get instant SQL and results you can export.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <button onClick={onGetStarted} className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-3 text-white font-semibold shadow hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <ChevronRight size={18} /> Get started
              </button>
              <a href="#query" className="text-indigo-600 dark:text-indigo-300 hover:underline">Try a query</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function FileUpload({ onUploaded, onTablesRefresh, toasts }) {
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const inputRef = useRef(null)

  const handleFiles = (files) => {
    const file = files?.[0]
    if (!file) return
    const allowed = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    if (!allowed.includes(file.type) && !file.name.toLowerCase().endsWith('.csv') && !file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
      toasts.add({ type: 'error', title: 'Unsupported file', message: 'Please upload CSV or Excel files.' })
      return
    }

    const form = new FormData()
    form.append('file', file)

    const xhr = new XMLHttpRequest()
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100))
      }
    })
    xhr.onload = () => {
      setUploading(false)
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText)
          toasts.add({ title: 'Upload complete', message: res?.table_name ? `${res.table_name} • ${res.row_count ?? '?' } rows` : 'File uploaded' })
          onUploaded?.(res)
          onTablesRefresh?.()
        } catch (e) {
          toasts.add({ type: 'error', title: 'Unexpected response', message: 'Upload succeeded but response could not be parsed.' })
        }
      } else {
        toasts.add({ type: 'error', title: 'Upload failed', message: `Status ${xhr.status}` })
      }
      setProgress(0)
    }
    xhr.onerror = () => {
      setUploading(false)
      setProgress(0)
      toasts.add({ type: 'error', title: 'Network error', message: 'Could not upload file.' })
    }
    setUploading(true)
    xhr.open('POST', `${BASE_URL}/api/upload`)
    xhr.send(form)
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 backdrop-blur p-6">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
        className={classNames(
          'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center transition',
          dragOver ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20' : 'border-slate-300 dark:border-slate-600'
        )}
      >
        <Upload className="text-indigo-600" />
        <p className="mt-3 text-slate-700 dark:text-slate-200">Drag & drop CSV or Excel here</p>
        <p className="text-xs text-slate-500">or</p>
        <button
          onClick={() => inputRef.current?.click()}
          className="mt-3 inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-white shadow hover:bg-indigo-700"
        >
          Browse files
        </button>
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        {uploading && (
          <div className="mt-4 w-full">
            <div className="h-2 w-full rounded bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-500">Uploading… {progress}%</p>
          </div>
        )}
      </div>
    </div>
  )
}

function TablesSidebar({ tables, selectedId, onSelect, onDelete, onRefresh }) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="inline-flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold"><TableIcon size={18}/> Tables</div>
        <button onClick={onRefresh} className="text-xs text-indigo-600 hover:underline">Refresh</button>
      </div>
      <div className="overflow-auto space-y-1">
        {tables?.length ? tables.map((t) => (
          <div key={t.id} className={classNames('group flex items-center justify-between rounded-md px-2 py-2 text-sm cursor-pointer border', selectedId === t.id ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800')}>
            <button onClick={() => onSelect(t)} className="text-left flex-1 truncate">
              <div className="font-medium truncate">{t.name || t.table_name || t.id}</div>
              {t.rows != null && <div className="text-xs text-slate-500">{t.rows} rows</div>}
            </button>
            <button onClick={() => onDelete(t)} className="opacity-60 hover:opacity-100 text-red-600">
              <Trash2 size={16} />
            </button>
          </div>
        )) : (
          <div className="text-sm text-slate-500">No tables yet. Upload a file to get started.</div>
        )}
      </div>
    </div>
  )
}

function SchemaView({ schema }) {
  if (!schema) return (
    <div className="text-sm text-slate-500">Select a table to view its schema.</div>
  )
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="grid grid-cols-2 gap-0 text-sm">
        <div className="bg-slate-50 dark:bg-slate-800 px-3 py-2 font-semibold">Column</div>
        <div className="bg-slate-50 dark:bg-slate-800 px-3 py-2 font-semibold">Type</div>
        {schema.columns?.map((c, idx) => (
          <React.Fragment key={idx}>
            <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800">{c.name || c[0] || ''}</div>
            <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">{c.type || c[1] || ''}</div>
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

function QueryInterface({ onRun, loading, query, setQuery, examples, onKeySubmit }) {
  return (
    <div id="query" className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 backdrop-blur p-6">
      <div className="flex items-center justify-between">
        <div className="text-slate-700 dark:text-slate-200 font-semibold">Ask in plain English</div>
        <div className="text-xs text-slate-500">Press Enter to run • Shift+Enter for new line</div>
      </div>
      <div className="mt-3">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeySubmit}
          rows={4}
          placeholder="e.g., Show me the top 10 rows"
          className="w-full resize-y rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {examples.map((ex, i) => (
          <button key={i} onClick={() => setQuery(ex)} className="text-xs rounded-full px-3 py-1 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
            {ex}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <button onClick={onRun} disabled={loading || !query.trim()} className={classNames('inline-flex items-center gap-2 rounded-md px-4 py-2 text-white font-medium shadow', loading || !query.trim() ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700')}>
          {loading ? <Loader2 className="animate-spin" size={16}/> : <Play size={16} />}
          {loading ? 'Running…' : 'Run query'}
        </button>
      </div>
    </div>
  )
}

function Results({ result }) {
  if (!result) return (
    <div className="text-sm text-slate-500">Your results will appear here after you run a query.</div>
  )
  const rows = result.rows || result.data || []
  const cols = result.columns || (rows[0] ? Object.keys(rows[0]) : [])
  const meta = {
    sql: result.sql || result.generated_sql,
    totalRows: result.total_rows ?? rows.length,
    timeMs: result.execution_time_ms ?? result.time_ms ?? null,
    truncated: result.truncated ?? false,
    summary: result.summary || result.ai_summary || null,
  }

  const exportCsv = () => {
    const arr = [cols, ...rows.map((r) => cols.map((c) => r[c]))]
    const csv = arr.map((r) => r.map((v) => {
      const s = v == null ? '' : String(v)
      if (s.includes(',') || s.includes('\n') || s.includes('"')) return `"${s.replace(/"/g, '""')}"`
      return s
    }).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'results.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {meta.sql && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-semibold">Generated SQL</div>
          <pre className="p-3 text-xs overflow-auto"><code>{meta.sql}</code></pre>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600 dark:text-slate-300">
          <span className="mr-4">Rows: <span className="font-semibold">{meta.totalRows}</span></span>
          {meta.timeMs != null && (<span>Time: <span className="font-semibold">{meta.timeMs} ms</span></span>)}
          {meta.truncated && (<span className="ml-4 text-amber-600 dark:text-amber-400">Truncated</span>)}
        </div>
        <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
          <Download size={16}/> Export CSV
        </button>
      </div>

      {meta.truncated && meta.summary && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-3 text-sm">
          <div className="font-semibold mb-1">AI Summary</div>
          <div className="text-amber-800 dark:text-amber-200">{meta.summary}</div>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              {cols.map((c) => (
                <th key={c} className="px-3 py-2 text-left font-semibold border-b border-slate-200 dark:border-slate-700">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="even:bg-slate-50/50 dark:even:bg-slate-800/30">
                {cols.map((c) => (
                  <td key={c} className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 whitespace-pre-wrap">{String(row[c] ?? '')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function QueryHistory({ items, onPick, onClear }) {
  if (!items.length) return null
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="inline-flex items-center gap-2 text-sm font-semibold"><History size={16}/> Recent</div>
        <button onClick={onClear} className="text-xs text-slate-500 hover:underline">Clear</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((q, i) => (
          <button key={i} onClick={() => onPick(q)} className="text-xs rounded-full px-3 py-1 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const { isDark, setIsDark } = useDarkMode()
  const { toasts, add: addToast, remove: removeToast } = useToasts()

  const [tables, setTables] = useState([])
  const [selectedTable, setSelectedTable] = useState(null)
  const [schema, setSchema] = useState(null)
  const [loadingTables, setLoadingTables] = useState(false)
  const [loadingSchema, setLoadingSchema] = useState(false)

  const [query, setQuery] = useState('')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)

  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('query_history') || '[]') } catch { return [] }
  })

  const examples = useMemo(() => [
    'Show me the top 10 rows',
    "What's the average cost?",
    'Total sales by month',
    'Find rows where status is active',
  ], [])

  const refreshTables = async () => {
    setLoadingTables(true)
    try {
      const res = await fetch(`${BASE_URL}/api/tables`)
      if (!res.ok) throw new Error(`Status ${res.status}`)
      const data = await res.json()
      setTables(Array.isArray(data) ? data : (data.tables || []))
    } catch (e) {
      addToast({ type: 'error', title: 'Failed to load tables', message: e.message })
    } finally {
      setLoadingTables(false)
    }
  }

  const fetchSchema = async (id) => {
    setLoadingSchema(true)
    try {
      const res = await fetch(`${BASE_URL}/api/tables/${encodeURIComponent(id)}`)
      if (!res.ok) throw new Error(`Status ${res.status}`)
      const data = await res.json()
      setSchema(data)
    } catch (e) {
      addToast({ type: 'error', title: 'Failed to load schema', message: e.message })
    } finally {
      setLoadingSchema(false)
    }
  }

  const deleteTable = async (tbl) => {
    if (!confirm(`Delete table ${tbl.name || tbl.table_name || tbl.id}?`)) return
    try {
      const res = await fetch(`${BASE_URL}/api/tables/${encodeURIComponent(tbl.id || tbl._id || tbl.name)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Status ${res.status}`)
      addToast({ title: 'Table deleted' })
      await refreshTables()
      if (selectedTable && (selectedTable.id === tbl.id)) {
        setSelectedTable(null)
        setSchema(null)
      }
    } catch (e) {
      addToast({ type: 'error', title: 'Failed to delete', message: e.message })
    }
  }

  const runQuery = async () => {
    if (!query.trim()) return
    setRunning(true)
    setResult(null)
    try {
      const res = await fetch(`${BASE_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      })
      if (!res.ok) throw new Error(`Status ${res.status}`)
      const data = await res.json()
      setResult(data)
      addToast({ title: 'Query completed' })
      const newHist = [query.trim(), ...history.filter((q) => q !== query.trim())].slice(0, 10)
      setHistory(newHist)
      localStorage.setItem('query_history', JSON.stringify(newHist))
    } catch (e) {
      addToast({ type: 'error', title: 'Query failed', message: e.message })
    } finally {
      setRunning(false)
    }
  }

  const handleKeySubmit = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      runQuery()
    }
  }

  useEffect(() => {
    refreshTables()
  }, [])

  useEffect(() => {
    if (selectedTable?.id || selectedTable?._id || selectedTable?.name) {
      fetchSchema(selectedTable.id || selectedTable._id || selectedTable.name)
    }
  }, [selectedTable])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-950 dark:to-indigo-950 text-slate-900 dark:text-slate-100">
      <div className="fixed top-4 left-4 z-40">
        <button onClick={() => setIsDark(!isDark)} className="inline-flex items-center gap-2 rounded-full border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 backdrop-blur px-3 py-1 text-sm">
          {isDark ? <SunMedium size={16}/> : <Moon size={16}/>}
          {isDark ? 'Light' : 'Dark'} mode
        </button>
      </div>

      <Hero onGetStarted={() => {
        const el = document.getElementById('workspace')
        el?.scrollIntoView({ behavior: 'smooth' })
      }} />

      <main id="workspace" className="relative z-10 container mx-auto px-6 pb-24 -mt-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <FileUpload onUploaded={() => {}} onTablesRefresh={refreshTables} toasts={{ add: addToast }} />

            <QueryInterface
              onRun={runQuery}
              loading={running}
              query={query}
              setQuery={setQuery}
              examples={examples}
              onKeySubmit={handleKeySubmit}
            />

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 backdrop-blur p-6">
              <div className="text-slate-700 dark:text-slate-200 font-semibold mb-3">Results</div>
              <Results result={result} />
            </div>

            <QueryHistory items={history} onPick={(q) => setQuery(q)} onClear={() => { setHistory([]); localStorage.setItem('query_history', '[]') }} />
          </div>

          <div className="lg:col-span-1">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 backdrop-blur p-4 h-full flex flex-col">
              <div className="flex-1 overflow-hidden">
                <TablesSidebar
                  tables={tables}
                  selectedId={selectedTable?.id}
                  onSelect={setSelectedTable}
                  onDelete={deleteTable}
                  onRefresh={refreshTables}
                />
              </div>

              <div className="mt-4">
                <div className="text-sm font-semibold mb-2">Schema</div>
                {loadingSchema ? (
                  <div className="text-slate-500 text-sm inline-flex items-center gap-2"><Loader2 className="animate-spin" size={16}/> Loading…</div>
                ) : (
                  <SchemaView schema={schema} />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Toast toasts={toasts} remove={removeToast} />
    </div>
  )
}
