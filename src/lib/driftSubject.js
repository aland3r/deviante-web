import { Subject } from './subject'

/**
 * Sujeito 1 do Observer: avisa quando uma análise de drift termina. Quem
 * publica (ProcessAnalysisView) não sabe quantos nem quais painéis reagem.
 *
 * event = { type: 'drift-detected' | 'analysis-completed', processId, analysisId, drifts }.
 */
class DriftSubject extends Subject {}

// Uma instância para o app inteiro.
export const driftSubject = new DriftSubject()
