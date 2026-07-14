export default function FormField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  error,
  hint,
  required = false,
  ...props
}) {
  return (
    <label className="form-field" htmlFor={id}>
      <span className="form-field__label">
        {label}
        {required ? <span className="form-field__required">*</span> : null}
      </span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        className={error ? 'form-field__input invalid' : 'form-field__input'}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...props}
      />
      {hint && !error ? <span id={`${id}-hint`} className="form-field__hint">{hint}</span> : null}
      {error ? <span id={`${id}-error`} className="form-field__error">{error}</span> : null}
    </label>
  )
}
