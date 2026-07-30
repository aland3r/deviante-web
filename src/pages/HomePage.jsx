'use client'

import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Activity, GitBranch, Wrench } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'

const features = [
  {
    icon: Activity,
    title: 'Mineração de processos',
    description:
      'Envie logs de eventos e mapeie operações brutas em atividades limpas prontas para análise.',
  },
  {
    icon: GitBranch,
    title: 'Detecção de deriva',
    description:
      'Identifique desvios comportamentais em traços de execução antes da falha do equipamento.',
  },
  {
    icon: Wrench,
    title: 'Decisões de manutenção',
    description:
      'Transforme alertas em ações preventivas agendadas e acompanhe os resultados da manutenção.',
  },
]

const steps = [
  'Crie um processo de manufatura',
  'Envie e mapeie logs de eventos',
  'Execute análise de deriva nos traços',
  'Agende manutenção preventiva',
]

function Eyebrow({ children }) {
  return (
    <p
      className="text-primary text-xs font-semibold uppercase tracking-widest"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {children}
    </p>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const { isAuthenticated, hasAccess, authReady } = useAuth()

  useEffect(() => {
    if (authReady && isAuthenticated && hasAccess) {
      navigate('/dashboard', { replace: true })
    }
  }, [authReady, isAuthenticated, hasAccess, navigate])

  return (
    <div className="min-h-screen flex flex-col">
      <header className="w-[min(1120px,calc(100%-2rem))] mx-auto flex items-center justify-between gap-4 py-5">
        <Link to="/" className="inline-flex items-center gap-3 text-inherit no-underline">
          <span
            className="w-10 h-10 rounded-xl grid place-items-center text-white font-bold shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent-strong, #991b1b))' }}
          >
            DV
          </span>
          <span className="flex flex-col leading-tight">
            <small className="text-muted-foreground text-xs">Inteligência em manutenção</small>
          </span>
        </Link>

        <nav>
          {authReady && isAuthenticated && hasAccess ? (
            <Button asChild>
              <Link to="/dashboard">Ir ao painel</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to="/login">Entrar</Link>
            </Button>
          )}
        </nav>
      </header>

      <main className="flex-1 w-[min(1120px,calc(100%-2rem))] mx-auto pb-16">
        <section className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8 items-center py-12 lg:py-20">
          <div>
            <Eyebrow>Manutenção industrial · PIBITI</Eyebrow>
            <h1 className="mt-3 text-4xl lg:text-5xl font-semibold text-foreground tracking-tight text-balance">
              Detecte falhas antes da quebra.
            </h1>
            <p className="mt-4 max-w-xl text-muted-foreground leading-relaxed">
              Apoio a gestores de manutenção com mineração de processos e aprendizado de
              máquina para antecipar problemas nos equipamentos e reduzir paradas não planejadas.
            </p>
            <div className="mt-7">
              <Button asChild size="lg">
                <Link to="/login">Experimentar o app</Link>
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Eyebrow>Como funciona</Eyebrow>
              <ol className="mt-4 flex flex-col gap-4">
                {steps.map((step, i) => (
                  <li key={step} className="flex items-start gap-3">
                    <span
                      className="w-6 h-6 rounded-full grid place-items-center text-xs font-semibold text-primary bg-primary/10 shrink-0"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm text-foreground leading-snug pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </section>

        <section className="py-6">
          <div className="mb-6">
            <Eyebrow>Capacidades</Eyebrow>
            <h2 className="mt-2 text-2xl font-semibold text-foreground tracking-tight">
              Feito para decisões de manutenção
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {features.map(({ icon: Icon, title, description }) => (
              <Card key={title}>
                <CardContent className="pt-6">
                  <span className="w-10 h-10 rounded-lg grid place-items-center bg-primary/10 text-primary mb-4">
                    <Icon size={18} />
                  </span>
                  <h3 className="text-base font-semibold text-foreground">{title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section
          className="mt-10 rounded-xl border border-border p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
          style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.10), rgba(255,255,255,0.03))' }}
        >
          <div>
            <h2 className="text-xl font-semibold text-foreground">Comece com seu primeiro processo</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Entre com Google (contas liberadas pelo owner) e acesse o painel de gestão de processos.
            </p>
          </div>
          <Button asChild size="lg">
            <Link to="/login">Entrar</Link>
          </Button>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <p>Alander Brands and Products</p>
      </footer>
    </div>
  )
}
