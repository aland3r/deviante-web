'use client'

import { Link } from 'react-router-dom'
import { getPortfolioOrigin, getProductArticlesUrl } from '@gestalt/auth'
import { useAuth } from '../context/AuthContext'

const features = [
  {
    title: 'Mineração de processos',
    description:
      'Envie logs de eventos e mapeie operações brutas em atividades limpas prontas para análise.',
  },
  {
    title: 'Detecção de deriva',
    description:
      'Identifique desvios comportamentais em traços de execução antes da falha do equipamento.',
  },
  {
    title: 'Decisões de manutenção',
    description:
      'Transforme alertas em ações preventivas agendadas e acompanhe os resultados da manutenção.',
  },
]

export default function HomePage() {
  const portfolioOrigin = getPortfolioOrigin()
  const { isAuthenticated, hasAccess, loading } = useAuth()

  return (
    <div className="home">
      <header className="home-header">
        <Link to="/" className="brand-mark">
          <span className="brand-mark__icon">DV</span>
          <span>
            <strong>Deviante</strong>
            <small>Inteligência em manutenção</small>
          </span>
        </Link>

        <nav className="home-header__nav">
          <a href={getProductArticlesUrl('deviante')} className="button button--ghost">
            Artigos
          </a>
          <a href={`${portfolioOrigin}/apps`} className="button button--ghost">
            Gestalt apps
          </a>
          {!loading && isAuthenticated && hasAccess ? (
            <Link to="/dashboard" className="button button--primary">
              Ir ao painel
            </Link>
          ) : (
            <Link to="/login" className="button button--primary">
              Entrar
            </Link>
          )}
        </nav>
      </header>

      <main>
        <section className="home-hero">
          <div className="home-hero__content">
            <p className="eyebrow">Manutenção industrial · PIBITI</p>
            <h1>Detecte falhas antes da quebra.</h1>
            <p className="home-hero__lead">
              O Deviante apoia gestores de manutenção com mineração de processos e aprendizado de máquina
              para antecipar problemas nos equipamentos e reduzir paradas não planejadas.
            </p>
            <div className="home-hero__actions">
              <Link to="/login" className="button button--primary">
                Experimentar o app
              </Link>
              <a href={getProductArticlesUrl('deviante')} className="button button--secondary">
                Ler artigos
              </a>
            </div>
          </div>

          <div className="home-hero__card card">
            <p className="eyebrow">Como funciona</p>
            <ol className="home-steps">
              <li>Crie um processo de manufatura</li>
              <li>Envie e mapeie logs de eventos</li>
              <li>Execute análise de deriva nos traços</li>
              <li>Agende manutenção preventiva</li>
            </ol>
          </div>
        </section>

        <section className="home-features">
          <div className="home-features__intro">
            <p className="eyebrow">Capacidades</p>
            <h2>Feito para decisões de manutenção</h2>
          </div>

          <div className="home-features__grid">
            {features.map((feature) => (
              <article key={feature.title} className="home-feature card">
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="home-cta card">
          <div>
            <h2>Comece com seu primeiro processo</h2>
            <p className="muted">
              Entre com Google (contas liberadas pelo owner) e acesse o painel de gestão de processos.
            </p>
          </div>
          <Link to="/login" className="button button--primary">
            Entrar no Deviante
          </Link>
        </section>
      </main>

      <footer className="home-footer">
        <p>Deviante — Gestalt · Alander Brands and Products</p>
        <p>
          <a href={portfolioOrigin}>alander.io</a>
        </p>
      </footer>
    </div>
  )
}
