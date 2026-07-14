import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/layout/AuthLayout'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import FormField from '../components/ui/FormField'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../lib/api'
import { LANGUAGE_OPTIONS } from '../lib/languages'

const emptyForm = {
  fullName: '',
  email: '',
  password: '',
  firstLanguage: 'pt',
  targetLanguage: 'en',
  locationEnabled: false,
  basedIn: '',
}

function LanguageField({ id, label, value, onChange, error, required = true }) {
  return (
    <label className="form-field" htmlFor={id}>
      <span className="form-field__label">{label}{required ? ' *' : ''}</span>
      <select
        id={id}
        className="form-field__input"
        value={value}
        onChange={onChange}
        required={required}
      >
        {LANGUAGE_OPTIONS.map((option) => (
          <option key={option.code} value={option.code}>{option.label}</option>
        ))}
      </select>
      {error ? <span className="form-field__error">{error}</span> : null}
    </label>
  )
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [form, setForm] = useState(emptyForm)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function updateField(field) {
    return (event) => {
      const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
      setForm((current) => ({ ...current, [field]: value }))
      setFieldErrors((current) => ({ ...current, [field]: undefined }))
      setFormError('')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setFormError('')
    setFieldErrors({})

    try {
      await register(form)
      navigate('/dashboard', { replace: true })
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message)
        setFieldErrors(error.fieldErrors ?? {})
      } else {
        setFormError('Não foi possível criar sua conta agora.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Crie sua conta de gestor"
      subtitle="Configure o acesso para armazenar processos, enviar logs de eventos e executar análise de deriva."
      footer={<p>Já tem conta? <Link to="/login">Entrar</Link></p>}
    >
      <form className="stack" onSubmit={handleSubmit}>
        {formError ? <Alert>{formError}</Alert> : null}

        <FormField id="fullName" label="Nome completo" value={form.fullName} onChange={updateField('fullName')} error={fieldErrors.fullName} required />
        <FormField id="email" label="E-mail" type="email" value={form.email} onChange={updateField('email')} error={fieldErrors.email} required />
        <FormField
          id="password"
          label="Senha"
          type="password"
          value={form.password}
          onChange={updateField('password')}
          error={fieldErrors.password}
          hint="Mínimo de 8 caracteres, um número e uma letra maiúscula."
          required
        />
        <div className="form-grid">
          <LanguageField
            id="firstLanguage"
            label="Idioma principal"
            value={form.firstLanguage}
            onChange={updateField('firstLanguage')}
            error={fieldErrors.firstLanguage}
          />
          <LanguageField
            id="targetLanguage"
            label="Idioma de interface"
            value={form.targetLanguage}
            onChange={updateField('targetLanguage')}
            error={fieldErrors.targetLanguage}
          />
        </div>

        <label className="form-field form-field--checkbox">
          <input
            type="checkbox"
            checked={form.locationEnabled}
            onChange={updateField('locationEnabled')}
          />
          <span>Exibir localização no perfil</span>
        </label>

        {form.locationEnabled ? (
          <FormField
            id="basedIn"
            label="Based in"
            value={form.basedIn}
            onChange={updateField('basedIn')}
            error={fieldErrors.basedIn}
            hint="Ex.: Curitiba, BR · São Paulo plant"
            required
          />
        ) : null}

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Criando conta...' : 'Cadastrar'}
        </Button>
      </form>
    </AuthLayout>
  )
}
