export function validateEmail(email) {
  if (!email?.trim()) return 'E-mail é obrigatório.'
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!pattern.test(email.trim())) return 'Informe um e-mail válido.'
  return null
}

export function validatePassword(password) {
  if (!password) return 'Senha é obrigatória.'
  if (password.length < 8) return 'A senha deve ter pelo menos 8 caracteres.'
  if (!/[0-9]/.test(password)) return 'A senha deve conter pelo menos um número.'
  if (!/[A-Z]/.test(password)) return 'A senha deve conter pelo menos uma letra maiúscula.'
  return null
}

export function validateRequired(value, label) {
  if (!value?.trim()) return `${label} é obrigatório.`
  return null
}

export function validateProcessName(name) {
  if (!name?.trim()) return 'O nome do processo não pode ficar em branco.'
  if (name.trim().length > 100) return 'O nome do processo deve ter no máximo 100 caracteres.'
  return null
}

export function validateCompanyName(name) {
  if (!name?.trim()) return 'O nome da empresa é obrigatório.'
  if (name.trim().length > 255) return 'O nome da empresa deve ter no máximo 255 caracteres.'
  return null
}

const LANGUAGE_PATTERN = /^[a-z]{2}(-[A-Z]{2})?$/

export function validateLanguageCode(value, label) {
  if (!value?.trim()) return `${label} é obrigatório.`
  if (!LANGUAGE_PATTERN.test(value.trim())) return `${label} deve ser um código de idioma válido (ex.: pt, en).`
  return null
}

export function validateBasedIn(value, locationEnabled) {
  if (!locationEnabled) return null
  if (!value?.trim()) return 'Informe onde você está baseado.'
  if (value.trim().length > 255) return 'Localização deve ter no máximo 255 caracteres.'
  return null
}
