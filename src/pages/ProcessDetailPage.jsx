import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import FormField from '../components/ui/FormField'
import Modal from '../components/ui/Modal'
import { api, ApiError } from '../lib/api'

export default function ProcessDetailPage() {
  const { processId } = useParams()
  const navigate = useNavigate()
  const [process, setProcess] = useState(null)
  const [form, setForm] = useState({ name: '', companyName: '', description: '', sector: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    api.getProcess(processId)
      .then((data) => {
        setProcess(data)
        setForm({
          name: data.name,
          companyName: data.companyName ?? '',
          description: data.description,
          sector: data.sector,
        })
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Não foi possível carregar este processo.')
      })
      .finally(() => setLoading(false))
  }, [processId])

  function updateField(field) {
    return (event) => {
      setForm((current) => ({ ...current, [field]: event.target.value }))
      setFieldErrors((current) => ({ ...current, [field]: undefined }))
      setError('')
      setSuccess('')
    }
  }

  async function handleSave(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    setFieldErrors({})

    try {
      const updated = await api.updateProcess(processId, form)
      setProcess(updated)
      setSuccess('Detalhes do processo salvos com sucesso.')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        setFieldErrors(err.fieldErrors ?? {})
      } else {
        setError('Não foi possível salvar os detalhes do processo.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    try {
      await api.deleteProcess(processId)
      navigate('/dashboard', { replace: true, state: { message: 'Processo excluído com sucesso.' } })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível excluir este processo.')
      setShowDeleteModal(false)
    }
  }

  if (loading) {
    return <div className="empty-state">Carregando processo...</div>
  }

  if (!process) {
    return (
      <section className="page">
        <Alert>{error || 'Processo não encontrado.'}</Alert>
        <Link to="/dashboard" className="button button--secondary">Voltar ao painel</Link>
      </section>
    )
  }

  return (
    <section className="page">
      <div className="page__header">
        <div>
          <p className="eyebrow">Detalhe do processo</p>
          <h1>{process.name}</h1>
          <p className="page__subtitle">Configure os metadados do fluxo antes de enviar logs de eventos.</p>
        </div>
        <Link to="/dashboard" className="button button--ghost">Voltar ao painel</Link>
      </div>

      <div className="detail-grid">
        <form className="card stack" onSubmit={handleSave}>
          {error ? <Alert>{error}</Alert> : null}
          {success ? <Alert variant="success">{success}</Alert> : null}

          <FormField id="name" label="Nome do processo" value={form.name} onChange={updateField('name')} error={fieldErrors.name} required />
          <FormField id="companyName" label="Nome da empresa" value={form.companyName} onChange={updateField('companyName')} error={fieldErrors.companyName} required />
          <label className="form-field" htmlFor="description">
            <span className="form-field__label">Descrição</span>
            <textarea
              id="description"
              className="form-field__input form-field__textarea"
              value={form.description}
              onChange={updateField('description')}
              rows={4}
            />
          </label>
          <FormField id="sector" label="Setor" value={form.sector} onChange={updateField('sector')} error={fieldErrors.sector} />

          <div className="form-actions">
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>

        <aside className="card stack">
          <div>
            <h2>Próximos passos</h2>
            <p className="muted">
              O envio de logs e a análise de deriva serão conectados aqui conforme os casos de uso forem implementados.
            </p>
          </div>

          <div className="info-list">
            <div>
              <span className="info-list__label">Atividades</span>
              <strong>0</strong>
            </div>
            <div>
              <span className="info-list__label">Logs de eventos</span>
              <strong>0</strong>
            </div>
            <div>
              <span className="info-list__label">Status do mapeamento</span>
              <strong>Não iniciado</strong>
            </div>
          </div>

          <Button variant="secondary" disabled>
            Enviar log de eventos
          </Button>

          <div className="danger-zone">
            <h3>Excluir processo</h3>
            <p className="muted">
              Isso remove permanentemente atividades, logs enviados e dados de análise vinculados a este processo.
            </p>
            <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
              Excluir processo
            </Button>
          </div>
        </aside>
      </div>

      {showDeleteModal ? (
        <Modal
          title="Excluir processo?"
          description="Esta ação não pode ser desfeita. Todas as atividades, logs enviados e dados de análise associados serão excluídos permanentemente."
          confirmLabel="Excluir processo"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      ) : null}
    </section>
  )
}
