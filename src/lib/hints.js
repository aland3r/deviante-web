// Janelas de "cola" da variabilidade: quais o usuário já fechou. Fica só no
// navegador; "Mostrar colas de variabilidade" no menu do usuário reabre todas.
import { useSyncExternalStore } from 'react'

const KEY = 'deviante.closedHints'
const listeners = new Set()

function read() {
  try { return window.localStorage.getItem(KEY) ?? '' } catch { return '' }
}

let snapshot = read()

function write(ids) {
  snapshot = [...ids].join(',')
  try { window.localStorage.setItem(KEY, snapshot) } catch { /* fecha só nesta sessão */ }
  listeners.forEach((listener) => listener())
}

const subscribe = (listener) => { listeners.add(listener); return () => listeners.delete(listener) }

export function useClosedHints() {
  const value = useSyncExternalStore(subscribe, () => snapshot)
  return new Set(value ? value.split(',') : [])
}

export function closeHint(id) {
  const ids = new Set(snapshot ? snapshot.split(',') : [])
  ids.add(id)
  write(ids)
}

export function reopenHints() {
  write([])
}
