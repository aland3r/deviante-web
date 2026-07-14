'use client'

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPortfolioOrigin } from '@gestalt/auth'
import { useAuth } from '../context/AuthContext'

export default function HomePage() {
  const navigate = useNavigate()
  const { isAuthenticated, hasAccess, loading } = useAuth()

  useEffect(() => {
    if (loading) return
    if (isAuthenticated && hasAccess) {
      navigate('/dashboard', { replace: true })
      return
    }
    window.location.href = `${getPortfolioOrigin()}/products`
  }, [loading, isAuthenticated, hasAccess, navigate])

  return (
    <div className="loading-screen">
      <p className="muted">Redirecting to alander.io…</p>
    </div>
  )
}
