import { useMemo, useRef, useState } from 'react'
import { Upload, Check, AlertCircle, Loader2, X } from 'lucide-react'
import { api, ApiError } from '../../lib/api'

/*
  UC4 (upload) + UC5 (resolve mapping) in one modal, opened over the process.

  Visual language ported from the Figma Make export v31 (`figma 34.zip` /
  `figma-make/`): dashed drop zone, green confirmation block, event→activity
  grid, and the graph-node card as the editable activity side. The upload does
  NOT close the modal — mapping grows below on success.

  Vocabulary (owner, OOUX):
  - **event**  — a record in the uploaded file. Read-only.
  - **activity** — the archetype the Manager names. Editable, styled as the
                 same card the graph draws.
  - **operation** — the log-derived component produced by binding an event's
                 label to an activity.
*/

const ACCEPTED = '.xes,.csv'
const ACCEPTED_EXT = new Set(['xes', 'csv'])

export default function EventLogUploadModal({ processId, onClose, onMappingComplete }) {
  const inputRef = useRef(null)

  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [formatError, setFormatError] = useState(false)

  const [eventLog, setEventLog] = useState(null)
  const [rows, setRows] = useState([])

  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState('')

  const blankNames = useMemo(
    () => rows.filter((row) => !row.activityName.trim()).length,
    [rows],
  )

  const convergedCount = useMemo(() => {
    const names = rows.map((r) => r.activityName.trim().toLowerCase()).filter(Boolean)
    return names.length - new Set(names).size
  }, [rows])

  function acceptFile(next) {
    if (!next) return
    const ext = next.name.split('.').pop()?.toLowerCase()
    if (!ACCEPTED_EXT.has(ext)) {
      setFormatError(true)
      setFile(null)
      setUploadError('')
      return
    }
    setFormatError(false)
    setFile(next)
    setUploadError('')
  }

  async function handleUpload() {
    if (!file || uploading || eventLog) return

    setUploading(true)
    setUploadError('')
    setFormatError(false)

    try {
      const result = await api.uploadEventLog(processId, file)
      setEventLog(result.eventLog)
      setRows(result.operations.map((operation) => ({
        operationId: operation.id,
        rawLabel: operation.rawLabel,
        occurrenceCount: operation.occurrenceCount,
        caseCount: operation.caseCount,
        meanDurationSeconds: operation.meanDurationSeconds,
        activityName: operation.suggestedActivityName,
        activityDescription: '',
      })))
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : 'Não foi possível enviar o arquivo.')
    } finally {
      setUploading(false)
    }
  }

  function updateRow(operationId, patch) {
    setRows((current) => current.map((row) => (
      row.operationId === operationId ? { ...row, ...patch } : row
    )))
    setConfirmError('')
  }

  async function handleConfirm() {
    if (confirming || blankNames > 0) return

    setConfirming(true)
    setConfirmError('')

    try {
      const result = await api.resolveMapping(processId, rows.map((row) => ({
        operationId: row.operationId,
        activityName: row.activityName.trim(),
        activityDescription: row.activityDescription.trim(),
      })))
      onMappingComplete?.(result)
    } catch (err) {
      setConfirmError(err instanceof ApiError ? err.message : 'Não foi possível salvar o mapeamento.')
      setConfirming(false)
    }
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget && !uploading && !confirming) onClose()
  }

  return (
    <div
      onClick={handleOverlayClick}
      style={{
        position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.70)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '32px 16px', overflowY: 'auto',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-log-modal-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 896, background: '#161c28', borderRadius: 6,
          border: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.70)',
        }}
      >
        <header style={{
          padding: '20px 24px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
        }}>
          <div>
            <h2
              id="event-log-modal-title"
              style={{ margin: '0 0 5px', fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, fontSize: 13, color: '#e2e8f0' }}
            >
              Carregar log de eventos
            </h2>
            <p style={{ margin: 0, fontFamily: "'Inter',sans-serif", fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
              Envie um arquivo .xes ou .csv. Depois do envio, nomeie a atividade que cada evento do log representa.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{
              flexShrink: 0, width: 28, height: 28, borderRadius: 4, border: 'none',
              background: 'rgba(255,255,255,0.05)', color: '#64748b', display: 'flex',
              alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = 'white' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#64748b' }}
          >
            <X size={14} />
          </button>
        </header>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24, overflowY: 'auto' }}>
          <UploadArea
            inputRef={inputRef}
            file={file}
            uploading={uploading}
            eventLog={eventLog}
            formatError={formatError}
            error={uploadError}
            onPick={acceptFile}
            onBrowse={() => inputRef.current?.click()}
            onSubmit={handleUpload}
          />

          {eventLog && (
            <MappingSection
              rows={rows}
              convergedCount={convergedCount}
              onChange={updateRow}
            />
          )}
        </div>

        {eventLog && (
          <footer style={{
            padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
          }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: blankNames > 0 ? '#f59e0b' : '#10b981' }}>
              {blankNames > 0
                ? `${blankNames} atividade${blankNames > 1 ? 's' : ''} ainda sem nome.`
                : 'Todas as atividades nomeadas. Confirmar abre o processo.'}
              {confirmError && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, color: '#dc2626' }}>
                  <AlertCircle size={12} /> {confirmError}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button
                type="button"
                onClick={onClose}
                disabled={confirming}
                style={{
                  padding: '8px 16px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.10)',
                  background: 'transparent', color: '#94a3b8', fontFamily: "'Inter',sans-serif",
                  fontSize: 12, cursor: confirming ? 'not-allowed' : 'pointer', opacity: confirming ? 0.5 : 1,
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={confirming || blankNames > 0}
                style={{
                  padding: '8px 18px', borderRadius: 4, border: 'none',
                  background: blankNames === 0 && !confirming ? '#dc2626' : 'rgba(220,38,38,0.20)',
                  color: blankNames === 0 && !confirming ? 'white' : '#64748b',
                  fontFamily: "'Inter',sans-serif", fontWeight: 500, fontSize: 12,
                  cursor: blankNames === 0 && !confirming ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: 7,
                }}
              >
                {confirming
                  ? <><Loader2 size={12} className="animate-spin" /> Salvando…</>
                  : <><Check size={12} /> Concluir mapeamento</>}
              </button>
            </div>
          </footer>
        )}
      </div>
    </div>
  )
}

function UploadArea({ inputRef, file, uploading, eventLog, formatError, error, onPick, onBrowse, onSubmit }) {
  const [dragging, setDragging] = useState(false)

  if (eventLog) {
    return (
      <div style={{
        background: 'rgba(6,78,59,0.20)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 6,
        padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', background: 'rgba(16,185,129,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Check size={16} color="#10b981" strokeWidth={2.5} />
        </div>
        <div>
          <p style={{ margin: '0 0 2px', fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 600, color: '#10b981' }}>
            {eventLog.fileName}
          </p>
          <p style={{ margin: 0, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#64748b' }}>
            {eventLog.operationCount} evento{eventLog.operationCount === 1 ? '' : 's'} distinto{eventLog.operationCount === 1 ? '' : 's'},{' '}
            {Number(eventLog.traceCount).toLocaleString('pt-BR')} trace{eventLog.traceCount === 1 ? '' : 's'}{' '}
            ({String(eventLog.format || '').toUpperCase()})
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div
        onDrop={(e) => { e.preventDefault(); setDragging(false); onPick(e.dataTransfer.files?.[0] ?? null) }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        style={{
          border: `1.5px dashed ${formatError ? 'rgba(220,38,38,0.50)' : dragging ? 'rgba(40,112,168,0.55)' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: 6, padding: '32px 24px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 14, transition: 'border-color 0.15s',
          background: dragging ? 'rgba(40,112,168,0.06)' : 'transparent',
        }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: 8, background: 'rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Upload size={18} color="#64748b" />
        </div>

        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: '0 0 4px', fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>
            {uploading ? 'Analisando log…' : file ? file.name : 'Arraste um arquivo aqui'}
          </p>
          {!file && !uploading && (
            <p style={{ margin: 0, fontFamily: "'Inter',sans-serif", fontSize: 12, color: '#64748b' }}>
              Formatos aceitos: <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>.xes</span> e{' '}
              <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>.csv</span>
            </p>
          )}
        </div>

        {formatError && (
          <p style={{ margin: 0, fontFamily: "'Inter',sans-serif", fontSize: 12, color: '#dc2626' }}>
            Envie um arquivo .xes ou .csv.
          </p>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          disabled={uploading}
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          style={{ display: 'none' }}
        />

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            onClick={onBrowse}
            disabled={uploading}
            style={{
              padding: '7px 14px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.05)', color: uploading ? '#475569' : '#94a3b8',
              fontFamily: "'Inter',sans-serif", fontSize: 12,
              cursor: uploading ? 'not-allowed' : 'pointer',
            }}
          >
            Selecionar arquivo
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={!file || uploading}
            style={{
              padding: '7px 16px', borderRadius: 4, border: 'none',
              background: file && !uploading ? '#dc2626' : 'rgba(220,38,38,0.25)',
              color: file && !uploading ? 'white' : '#64748b',
              fontFamily: "'Inter',sans-serif", fontWeight: 500, fontSize: 12,
              cursor: file && !uploading ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {uploading
              ? <><Loader2 size={12} className="animate-spin" /> Analisando…</>
              : 'Enviar'}
          </button>
        </div>
      </div>

      {error && (
        <p style={{ margin: '12px 0 0', display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: '#dc2626' }}>
          <AlertCircle size={12} style={{ marginTop: 2, flexShrink: 0 }} /> {error}
        </p>
      )}
    </div>
  )
}

function MappingSection({ rows, convergedCount, onChange }) {
  return (
    <div>
      <div className="mb-2.5 hidden grid-cols-[1fr_auto_1.4fr] gap-x-4 px-0.5 sm:grid">
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Evento do log — não editável
        </span>
        <span />
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Atividade — como aparecerá no processo
        </span>
      </div>

      {convergedCount > 0 && (
        <p style={{ margin: '0 0 10px', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#64748b' }}>
          {convergedCount} rótulo{convergedCount > 1 ? 's' : ''} convergindo para a mesma atividade
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((row) => (
          <div
            key={row.operationId}
            className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_auto_1.4fr] sm:gap-x-4"
          >
            <EventCell row={row} />
            <div style={{ color: '#2870a8', display: 'flex', alignItems: 'center' }} className="hidden sm:flex" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </div>
            <ActivityCard row={row} onChange={onChange} />
          </div>
        ))}
      </div>
    </div>
  )
}

function EventCell({ row }) {
  return (
    <div style={{ padding: '8px 10px', minWidth: 0 }}>
      <p
        title={row.rawLabel}
        style={{
          margin: '0 0 3px', fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#e2e8f0',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}
      >
        {row.rawLabel}
      </p>
      <p style={{ margin: 0, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#64748b' }}>
        {Number(row.occurrenceCount).toLocaleString('pt-BR')} ocorrência{row.occurrenceCount === 1 ? '' : 's'}
        {row.caseCount > 0 && ` · ${Number(row.caseCount).toLocaleString('pt-BR')} caso${row.caseCount === 1 ? '' : 's'}`}
        {row.meanDurationSeconds > 0 && ` · ${formatDuration(row.meanDurationSeconds)} médio`}
      </p>
    </div>
  )
}

function ActivityCard({ row, onChange }) {
  const empty = !row.activityName.trim()
  const borderColor = empty ? 'rgba(245,158,11,0.60)' : 'rgba(255,255,255,0.10)'

  return (
    <div style={{ background: '#16202e', border: `1px solid ${borderColor}`, borderRadius: 5, overflow: 'hidden', transition: 'border-color 0.15s', minWidth: 0 }}>
      <div style={{ height: 3, background: 'rgba(153,27,27,0.75)' }} />
      <div style={{ padding: '7px 10px 8px' }}>
        <input
          value={row.activityName}
          onChange={(e) => onChange(row.operationId, { activityName: e.target.value })}
          placeholder="Nome da atividade…"
          aria-label={`Atividade para o evento ${row.rawLabel}`}
          style={{
            display: 'block', width: '100%', background: 'transparent', border: 'none', outline: 'none',
            fontFamily: "'Inter',sans-serif", fontWeight: 500, fontSize: 12,
            color: empty ? '#64748b' : '#e2e8f0', padding: 0, marginBottom: 3, boxSizing: 'border-box',
          }}
        />
        <input
          value={row.activityDescription}
          onChange={(e) => onChange(row.operationId, { activityDescription: e.target.value })}
          placeholder="Descrição opcional"
          aria-label={`Descrição da atividade para ${row.rawLabel}`}
          style={{
            display: 'block', width: '100%', background: 'transparent', border: 'none', outline: 'none',
            fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#64748b', padding: 0, boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  )
}

function formatDuration(seconds) {
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`
  return `${(seconds / 3600).toFixed(1)}h`
}
