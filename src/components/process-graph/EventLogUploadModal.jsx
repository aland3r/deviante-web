import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, ArrowRight, Check, Loader2, Pencil, Plus, Upload, X } from 'lucide-react'
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
  const [activityCatalog, setActivityCatalog] = useState([])
  const [rows, setRows] = useState([])

  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState('')

  const validatedCount = useMemo(
    () => rows.filter((row) => row.rowState === 'validated').length,
    [rows],
  )
  const allValidated = rows.length > 0 && validatedCount === rows.length

  useEffect(() => {
    let active = true
    Promise.all([
      api.listProcessActivities(processId),
      api.listActivities(),
    ])
      .then(([processActivities, activities]) => {
        if (!active) return
        const processIds = new Set(processActivities.map((activity) => activity.id))
        setActivityCatalog([
          ...processActivities.map((activity) => ({ ...activity, inProcess: true })),
          ...activities
            .filter((activity) => !processIds.has(activity.id))
            .map((activity) => ({ ...activity, inProcess: false })),
        ])
      })
      .catch(() => {
        if (active) setActivityCatalog([])
      })
    return () => { active = false }
  }, [processId])

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
        rowState: operation.suggestedActivityName?.trim() ? 'suggested' : 'pending',
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

  function editRow(operationId) {
    setRows((current) => current.map((row) => {
      if (row.operationId === operationId) {
        return {
          ...row,
          rowState: row.rowState === 'editing'
            ? (row.activityName.trim() ? 'suggested' : 'pending')
            : 'editing',
        }
      }
      return row.rowState === 'editing'
        ? { ...row, rowState: row.activityName.trim() ? 'suggested' : 'pending' }
        : row
    }))
    setConfirmError('')
  }

  function validateRow(operationId) {
    setRows((current) => current.map((row) => {
      if (row.operationId !== operationId) return row
      if (row.rowState === 'validated') return { ...row, rowState: 'suggested' }
      return {
        ...row,
        rowState: row.activityName.trim() ? 'validated' : 'pending',
      }
    }))
    setConfirmError('')
  }

  async function handleConfirm() {
    if (confirming || !allValidated) return

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
          width: '100%', maxWidth: 896, background: 'var(--surface)', borderRadius: 6,
          border: '1px solid var(--hairline)', display: 'flex', flexDirection: 'column',
          maxHeight: 'calc(100vh - 64px)', boxShadow: '0 24px 80px rgba(0,0,0,0.70)',
        }}
      >
        <header style={{
          padding: '20px 24px 18px', borderBottom: '1px solid var(--hairline)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
        }}>
          <div>
            <h2
              id="event-log-modal-title"
              style={{ margin: '0 0 5px', fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, fontSize: 13, color: 'var(--text-strong)' }}
            >
              Carregar log de eventos
            </h2>
            <p style={{ margin: 0, fontFamily: "'Inter',sans-serif", fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
              Envie um arquivo .xes ou .csv. Depois do envio, associe cada evento a uma atividade.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{
              flexShrink: 0, width: 28, height: 28, borderRadius: 4, border: 'none',
              background: 'var(--overlay)', color: 'var(--muted-foreground)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--overlay-strong)'; e.currentTarget.style.color = 'white' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--overlay)'; e.currentTarget.style.color = 'var(--muted-foreground)' }}
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
              activityCatalog={activityCatalog}
              onChange={updateRow}
              onEdit={editRow}
              onValidate={validateRow}
            />
          )}
        </div>

        {eventLog && (
          <footer style={{
            padding: '14px 24px', borderTop: '1px solid var(--hairline)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
          }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: allValidated ? 'var(--success)' : validatedCount > 0 ? 'var(--warn)' : 'var(--muted-foreground)' }}>
              {allValidated
                ? 'Todas as atividades validadas. Concluir atualiza o grafo.'
                : `${validatedCount} de ${rows.length} atividade${rows.length === 1 ? '' : 's'} validada${rows.length === 1 ? '' : 's'}.`}
              {confirmError && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, color: 'var(--danger)' }}>
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
                  padding: '8px 16px', borderRadius: 4, border: '1px solid var(--overlay-strong)',
                  background: 'transparent', color: 'var(--text)', fontFamily: "'Inter',sans-serif",
                  fontSize: 12, cursor: confirming ? 'not-allowed' : 'pointer', opacity: confirming ? 0.5 : 1,
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={confirming || !allValidated}
                style={{
                  padding: '8px 18px', borderRadius: 4, border: 'none',
                  background: allValidated && !confirming ? 'var(--danger)' : 'rgba(220,38,38,0.20)',
                  color: allValidated && !confirming ? 'white' : 'var(--muted-foreground)',
                  fontFamily: "'Inter',sans-serif", fontWeight: 500, fontSize: 12,
                  cursor: allValidated && !confirming ? 'pointer' : 'not-allowed',
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
          <Check size={16} color="var(--success)" strokeWidth={2.5} />
        </div>
        <div>
          <p style={{ margin: '0 0 2px', fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 600, color: 'var(--success)' }}>
            {eventLog.fileName}
          </p>
          <p style={{ margin: 0, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'var(--muted-foreground)' }}>
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
          border: `1.5px dashed ${formatError ? 'rgba(220,38,38,0.50)' : dragging ? 'rgba(40,112,168,0.55)' : 'var(--overlay-strong)'}`,
          borderRadius: 6, padding: '32px 24px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 14, transition: 'border-color 0.15s',
          background: dragging ? 'rgba(40,112,168,0.06)' : 'transparent',
        }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: 8, background: 'var(--overlay)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Upload size={18} color="var(--muted-foreground)" />
        </div>

        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: '0 0 4px', fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 500, color: 'var(--text-strong)' }}>
            {uploading ? 'Analisando log…' : file ? file.name : 'Arraste um arquivo aqui'}
          </p>
          {!file && !uploading && (
            <p style={{ margin: 0, fontFamily: "'Inter',sans-serif", fontSize: 12, color: 'var(--muted-foreground)' }}>
              Formatos aceitos: <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>.xes</span> e{' '}
              <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>.csv</span>
            </p>
          )}
        </div>

        {formatError && (
          <p style={{ margin: 0, fontFamily: "'Inter',sans-serif", fontSize: 12, color: 'var(--danger)' }}>
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
              padding: '7px 14px', borderRadius: 4, border: '1px solid var(--overlay-strong)',
              background: 'var(--overlay)', color: uploading ? 'var(--text-dim)' : 'var(--text)',
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
              background: file && !uploading ? 'var(--danger)' : 'rgba(220,38,38,0.25)',
              color: file && !uploading ? 'white' : 'var(--muted-foreground)',
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
        <p style={{ margin: '12px 0 0', display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: 'var(--danger)' }}>
          <AlertCircle size={12} style={{ marginTop: 2, flexShrink: 0 }} /> {error}
        </p>
      )}
    </div>
  )
}

function MappingSection({ rows, activityCatalog, onChange, onEdit, onValidate }) {
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 4px', fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 13, color: 'var(--text-strong)' }}>
          Mapear eventos para atividades
        </h3>
        <p style={{ margin: 0, fontFamily: "'Inter',sans-serif", fontSize: 12, color: 'var(--muted-foreground)' }}>
          Associe cada evento encontrado no log a uma atividade do catálogo.
        </p>
      </div>

      <div
        className="mb-2 hidden grid-cols-[1fr_28px_minmax(0,1.5fr)_64px] gap-x-3 border-b border-white/[0.06] px-0.5 pb-1.5 sm:grid"
        aria-hidden="true"
      >
        <MappingColumnLabel>Evento do log</MappingColumnLabel>
        <span />
        <MappingColumnLabel>Atividade</MappingColumnLabel>
        <span />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map((row) => (
          <div
            key={row.operationId}
            className="grid grid-cols-1 items-center gap-2 border-b border-white/[0.04] py-1.5 sm:grid-cols-[1fr_28px_minmax(0,1.5fr)_64px] sm:gap-x-3"
          >
            <EventCell row={row} />
            <div className="hidden items-center justify-center text-[var(--graph-node-strong)] sm:flex" aria-hidden="true">
              <ArrowRight size={14} />
            </div>
            <ActivityCard
              row={row}
              activityCatalog={activityCatalog}
              onChange={onChange}
              onEdit={onEdit}
              onValidate={onValidate}
            />
            <MappingStatus state={row.rowState} />
          </div>
        ))}
      </div>
    </div>
  )
}

function MappingColumnLabel({ children }) {
  return (
    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      {children}
    </span>
  )
}

function EventCell({ row }) {
  return (
    <div style={{ minWidth: 0 }}>
      <p
        title={row.rawLabel}
        style={{
          margin: '0 0 2px', fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: 'var(--text-strong)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}
      >
        {row.rawLabel}
      </p>
      <p style={{ margin: 0, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: 'var(--text-dim)' }}>
        {Number(row.occurrenceCount).toLocaleString('pt-BR')} ocorrência{row.occurrenceCount === 1 ? '' : 's'}
        {row.caseCount > 0 && ` · ${Number(row.caseCount).toLocaleString('pt-BR')} traço${row.caseCount === 1 ? '' : 's'}`}
        {row.meanDurationSeconds > 0 && ` · ${formatDuration(row.meanDurationSeconds)} em média`}
      </p>
    </div>
  )
}

function ActivityCard({ row, activityCatalog, onChange, onEdit, onValidate }) {
  const inputRef = useRef(null)
  const [query, setQuery] = useState(row.activityName)
  const [showDropdown, setShowDropdown] = useState(false)
  const isEditing = row.rowState === 'editing'
  const isValidated = row.rowState === 'validated'
  const isPending = row.rowState === 'pending'

  useEffect(() => {
    setQuery(row.activityName)
  }, [row.activityName])

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      setShowDropdown(true)
    } else {
      setShowDropdown(false)
    }
  }, [isEditing])

  const catalogNames = useMemo(
    () => activityCatalog.map((activity) => activity.name),
    [activityCatalog],
  )
  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR')
  const filtered = activityCatalog.filter((activity) => (
    activity.name.toLocaleLowerCase('pt-BR').includes(normalizedQuery)
    && activity.name.toLocaleLowerCase('pt-BR') !== normalizedQuery
  ))
  const canCreate = normalizedQuery.length > 0 && !catalogNames.some(
    (name) => name.toLocaleLowerCase('pt-BR') === normalizedQuery,
  )

  const borderColor = isValidated
    ? 'rgba(16,185,129,0.40)'
    : isPending
      ? 'rgba(245,158,11,0.55)'
      : isEditing
        ? 'rgba(40,112,168,0.60)'
        : 'var(--overlay-strong)'

  function updateName(value) {
    setQuery(value)
    setShowDropdown(true)
    onChange(row.operationId, { activityName: value })
  }

  function selectName(value) {
    setQuery(value)
    setShowDropdown(false)
    onChange(row.operationId, { activityName: value })
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div style={{
        flex: 1, minWidth: 0, position: 'relative', overflow: 'visible',
        background: 'var(--surface-muted-2)', border: `1px solid ${borderColor}`, borderRadius: 5,
        transition: 'border-color 0.15s',
      }}>
        <div style={{ height: 3, background: isValidated ? 'rgba(16,185,129,0.70)' : 'rgba(153,27,27,0.75)', transition: 'background 0.2s' }} />
        <div style={{ padding: '7px 10px 8px' }}>
          {isEditing ? (
            <div style={{ position: 'relative' }}>
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => updateName(event.target.value)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                placeholder="Nome da atividade…"
                aria-label={`Atividade para o evento ${row.rawLabel}`}
                style={{
                  display: 'block', width: '100%', background: 'transparent', border: 'none', outline: 'none',
                  fontFamily: "'Inter',sans-serif", fontWeight: 500, fontSize: 12,
                  color: 'var(--text-strong)', padding: 0, marginBottom: 3, boxSizing: 'border-box',
                }}
              />
              {showDropdown && (filtered.length > 0 || canCreate) && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', left: -10, right: -10, zIndex: 200,
                  background: '#1a2133', border: '1px solid var(--overlay-strong)',
                  borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.55)', overflow: 'hidden',
                }}>
                  {filtered.slice(0, 6).map((activity) => (
                    <button
                      key={activity.id}
                      type="button"
                      onMouseDown={(event) => { event.preventDefault(); selectName(activity.name) }}
                      style={{
                        display: 'flex', width: '100%', padding: '7px 12px', border: 0,
                        alignItems: 'center', justifyContent: 'space-between', gap: 8,
                        background: 'transparent', color: 'var(--text-strong)', textAlign: 'left',
                        fontFamily: "'Inter',sans-serif", fontSize: 12, cursor: 'pointer',
                      }}
                      onMouseEnter={(event) => { event.currentTarget.style.background = 'var(--overlay)' }}
                      onMouseLeave={(event) => { event.currentTarget.style.background = 'transparent' }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {activity.name}
                      </span>
                      <span style={{
                        flexShrink: 0, color: activity.inProcess ? 'var(--graph-node)' : 'var(--muted-foreground)',
                        fontFamily: "'JetBrains Mono',monospace", fontSize: 8, textTransform: 'uppercase',
                      }}>
                        {activity.inProcess ? 'neste processo' : 'catálogo'}
                      </span>
                    </button>
                  ))}
                  {canCreate && (
                    <button
                      type="button"
                      onMouseDown={(event) => { event.preventDefault(); selectName(query.trim()) }}
                      style={{
                        display: 'flex', width: '100%', alignItems: 'center', gap: 6,
                        padding: '7px 12px', border: 0,
                        borderTop: filtered.length > 0 ? '1px solid var(--hairline)' : 'none',
                        background: 'transparent', color: 'var(--graph-node)', textAlign: 'left',
                        fontFamily: "'Inter',sans-serif", fontSize: 12, cursor: 'pointer',
                      }}
                      onMouseEnter={(event) => { event.currentTarget.style.background = 'var(--overlay-soft)' }}
                      onMouseLeave={(event) => { event.currentTarget.style.background = 'transparent' }}
                    >
                      <Plus size={11} />Criar atividade “{query.trim()}”
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p style={{
              margin: '0 0 3px', fontFamily: "'Inter',sans-serif", fontWeight: 500,
              fontSize: 12, color: isValidated ? 'var(--success)' : 'var(--text-strong)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {row.activityName || <span style={{ color: 'var(--muted-foreground)' }}>Nome da atividade…</span>}
            </p>
          )}
          <input
            value={row.activityDescription}
            onChange={(event) => onChange(row.operationId, { activityDescription: event.target.value })}
            disabled={isValidated}
            placeholder="Descrição opcional"
            aria-label={`Descrição da atividade para ${row.rawLabel}`}
            style={{
              display: 'block', width: '100%', background: 'transparent', border: 'none', outline: 'none',
              fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'var(--muted-foreground)',
              padding: 0, boxSizing: 'border-box', cursor: isValidated ? 'default' : 'text',
            }}
          />
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-[5px]">
        <CircleButton label="Editar atividade" active={isEditing} onClick={() => onEdit(row.operationId)}>
          <Pencil size={11} />
        </CircleButton>
        <CircleButton label="Validar atividade" active={isValidated} onClick={() => onValidate(row.operationId)}>
          <Check size={11} color={isValidated ? 'var(--success)' : 'currentColor'} />
        </CircleButton>
      </div>
    </div>
  )
}

function CircleButton({ label, active, onClick, children }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      style={{
        width: 24, height: 24, borderRadius: '50%', padding: 0, flexShrink: 0,
        border: `1px solid ${active ? 'var(--hairline-strong)' : 'var(--hairline-strong)'}`,
        background: active ? 'var(--overlay-strong)' : 'var(--overlay-soft)',
        color: active ? 'white' : 'var(--muted-foreground)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', cursor: 'pointer', transition: 'all 0.14s',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.borderColor = 'rgba(255,255,255,0.28)'
        event.currentTarget.style.color = 'white'
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.borderColor = active ? 'var(--hairline-strong)' : 'var(--hairline-strong)'
        event.currentTarget.style.color = active ? 'white' : 'var(--muted-foreground)'
      }}
    >
      {children}
    </button>
  )
}

function MappingStatus({ state }) {
  const config = {
    validated: { label: 'OK', color: 'var(--success)', background: 'rgba(6,78,59,0.25)', border: 'rgba(16,185,129,0.25)' },
    pending: { label: 'Pendente', color: 'var(--warn)', background: 'rgba(120,53,15,0.20)', border: 'rgba(245,158,11,0.25)' },
    editing: { label: 'Editando', color: 'var(--muted-foreground)', background: 'var(--overlay-soft)', border: 'var(--hairline)' },
    suggested: { label: 'Sugerida', color: 'var(--muted-foreground)', background: 'var(--overlay-soft)', border: 'var(--hairline)' },
  }[state]

  return (
    <div className="flex items-center justify-start sm:justify-end">
      <span style={{
        fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: config.color,
        background: config.background, border: `1px solid ${config.border}`,
        borderRadius: 4, padding: '2px 6px', letterSpacing: '0.05em',
      }}>
        {state === 'validated' && '✓ '}{config.label}
      </span>
    </div>
  )
}

function formatDuration(seconds) {
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`
  return `${(seconds / 3600).toFixed(1)}h`
}
