import Button from '../ui/LegacyButton'

export default function Modal({ title, description, confirmLabel, onConfirm, onCancel, children }) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h2>{title}</h2>
        {description ? <p className="modal__description">{description}</p> : null}
        {children}
        <div className="modal__actions">
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}
