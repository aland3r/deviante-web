import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Alert from '../components/ui/LegacyAlert'
import Button from '../components/ui/LegacyButton'
import { api, ApiError } from '../lib/api'

function ProcessCard({ process }) {
  return (
    <article className="process-card">
      <div>
        <p className="eyebrow">{process.sector || 'Sem setor'}</p>
        <h2>{process.name}</h2>
        <p className="process-card__description">
          {process.description || 'Sem descrição. Abra as configurações para definir este fluxo de manufatura.'}
        </p>
      </div>
      <div className="process-card__meta">
        <span>Atualizado em {new Date(process.updatedAt).toLocaleDateString('pt-BR')}</span>
        <Link to={`/processes/${process.id}`} className="button button--secondary">
          Abrir processo
        </Link>
      </div>
    </article>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [processes, setProcesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    api.listProcesses()
      .then(setProcesses)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os processos.')
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleCreateProcess() {
    setCreating(true)
    setError('')

    try {
      const process = await api.createProcess()
      navigate(`/processes/${process.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível criar o processo.')
      setCreating(false)
    }
  }

  return (
    <section className="page">
      <div className="page__header">
        <div>
          <p className="eyebrow">UC2 · Manter processo</p>
          <h1>Painel principal</h1>
          <p className="page__subtitle">
            Crie e gerencie fluxos de manufatura antes de enviar logs de eventos e executar análise de deriva.
          </p>
        </div>
        <Button onClick={handleCreateProcess} disabled={creating}>
          {creating ? 'Criando processo...' : 'Criar processo'}
        </Button>
      </div>

      {error ? <Alert>{error}</Alert> : null}

      {loading ? (
        <div className="empty-state">Carregando processos...</div>
      ) : processes.length === 0 ? (
        <div className="empty-state card">
          <h2>Nenhum processo ainda</h2>
          <p>Comece com um processo vazio. Você pode renomeá-lo, adicionar um setor e prepará-lo para envio de logs.</p>
          <Button onClick={handleCreateProcess} disabled={creating}>
            {creating ? 'Criando processo...' : 'Criar processo'}
          </Button>
        </div>
      ) : (
        <div className="process-grid">
          {processes.map((process) => (
            <ProcessCard key={process.id} process={process} />
          ))}
        </div>
      )}
    </section>
  )
}
