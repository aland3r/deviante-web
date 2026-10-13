import { Subject } from './subject'

/**
 * Sujeito 2 do Observer, independente do drift: avisa quando a agenda de
 * manutenção muda. Quem publica (formulário da Agenda) não sabe que a lista e
 * o contador do menu reagem.
 *
 * event = { type: 'schedule-saved' | 'schedule-deleted', scheduleId }.
 */
class MaintenanceSubject extends Subject {}

export const maintenanceSubject = new MaintenanceSubject()
