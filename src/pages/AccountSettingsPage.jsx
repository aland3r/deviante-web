import { useEffect, useState } from 'react'
import Alert from '../components/ui/LegacyAlert'
import Button from '../components/ui/LegacyButton'
import FormField from '../components/ui/FormField'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../lib/api'
import { LANGUAGE_OPTIONS } from '../lib/languages'

function LanguageField({ id, label, value, onChange, error }) {
  return (
    <label className="form-field" htmlFor={id}>
      <span className="form-field__label">{label} *</span>
      <select
        id={id}
        className="form-field__input"
        value={value}
        onChange={onChange}
        required
      >
        {LANGUAGE_OPTIONS.map((option) => (
          <option key={option.code} value={option.code}>{option.label}</option>
        ))}
      </select>
      {error ? <span className="form-field__error">{error}</span> : null}
    </label>
  )
}

export default function AccountSettingsPage() {
  const { user, updateAccount } = useAuth()
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    firstLanguage: 'pt',
    targetLanguage: 'en',
    locationEnabled: false,
    basedIn: '',
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user) return
    setForm({
      fullName: user.fullName,
      email: user.email,
      password: '',
      firstLanguage: user.firstLanguage ?? 'pt',
      targetLanguage: user.targetLanguage ?? 'en',
      locationEnabled: Boolean(user.locationEnabled),
      basedIn: user.basedIn ?? '',
    })
  }, [user])

  function updateField(field) {
    return (event) => {
      const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
      setForm((current) => ({ ...current, [field]: value }))
      setFieldErrors((current) => ({ ...current, [field]: undefined }))
      setFormError('')
      setSuccess('')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setFormError('')
    setSuccess('')
    setFieldErrors({})

    try {
      await updateAccount(form)
      setForm((current) => ({ ...current, password: '' }))
      setSuccess('Seus dados foram atualizados com sucesso.')
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message)
        setFieldErrors(error.fieldErrors ?? {})
      } else {
        setFormError('Não foi possível salvar suas alterações agora.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="page">
      <div className="page__header">
        <div>
          <p className="eyebrow">UC1 · Manter conta de usuário</p>
          <h1>Configurações da conta</h1>
          <p className="page__subtitle">Idiomas, preferências de interface e localização opcional no perfil.</p>
        </div>
      </div>

      <form className="card stack" onSubmit={handleSubmit}>
        {formError ? <Alert>{formError}</Alert> : null}
        {success ? <Alert variant="success">{success}</Alert> : null}

        <FormField id="fullName" label="Nome completo" value={form.fullName} onChange={updateField('fullName')} error={fieldErrors.fullName} required />
        <FormField id="email" label="E-mail" type="email" value={form.email} onChange={updateField('email')} error={fieldErrors.email} required />
        <FormField
          id="password"
          label="Nova senha"
          type="password"
          value={form.password}
          onChange={updateField('password')}
          error={fieldErrors.password}
          hint="Deixe em branco para manter a senha atual."
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

        <div className="form-actions">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Salvando alterações...' : 'Salvar alterações'}
          </Button>
        </div>
      </form>
    </section>
  )
}
