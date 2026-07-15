'use client'

import { Link } from 'react-router-dom'
import { getPortfolioOrigin } from '@gestalt/auth'
import { useAuth } from '../context/AuthContext'

export default function HomePage() {
  const portfolioOrigin = getPortfolioOrigin()
  const { isAuthenticated, hasAccess, loading } = useAuth()

  return (
    <section className="landing panel">
      <p className="eyebrow">Deviante</p>
      <h1>Industrial maintenance intelligence</h1>
      <p className="lead">
        Process mining and drift detection for preventive maintenance decisions.
      </p>

      <div className="actions">
        {!loading && isAuthenticated && hasAccess ? (
          <Link to="/dashboard" className="button">
            Open app
          </Link>
        ) : (
          <Link to="/login" className="button">
            Try this app
          </Link>
        )}
        <a href={`${portfolioOrigin}/apps`} className="button">
          Gestalt apps
        </a>
        <a href={`${portfolioOrigin}/projects`} className="button">
          Projects
        </a>
      </div>
    </section>
  )
}
