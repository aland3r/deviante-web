import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Cleanup malformed cookies before Supabase initializes
if (typeof window !== 'undefined') {
  try {
    const cookies = document.cookie.split(';')
    for (const cookie of cookies) {
      const [name, value] = cookie.split('=').map(c => c.trim())
      if (name && value) {
        try {
          decodeURIComponent(value)
        } catch {
          // Malformed cookie - clear it
          document.cookie = `${name}=; Max-Age=0; path=/;`
        }
      }
    }
  } catch (e) {
    // Ignore errors during cleanup
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
