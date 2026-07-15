export class ApiError extends Error {
  constructor(message, fieldErrors = {}) {
    super(message)
    this.name = 'ApiError'
    this.fieldErrors = fieldErrors
  }
}
