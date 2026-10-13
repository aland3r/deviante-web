/**
 * Observer (Reuso 03): o sujeito guarda a lista de observadores e avisa todos
 * quando uma análise de drift termina. Quem publica (ProcessAnalysisView) não
 * sabe quantos nem quais painéis reagem; um painel novo só precisa se inscrever.
 *
 * Um observador é qualquer objeto com `update(event)`, onde
 * event = { type: 'drift-detected' | 'analysis-completed', processId, analysisId, drifts }.
 */
class DriftSubject {
  constructor() {
    this.observers = new Set()
  }

  /** Inscreve e devolve a função que cancela a inscrição (cabe no retorno de um useEffect). */
  subscribe(observer) {
    this.observers.add(observer)
    return () => this.unsubscribe(observer)
  }

  unsubscribe(observer) {
    this.observers.delete(observer)
  }

  notify(event) {
    this.observers.forEach((observer) => observer.update(event))
  }
}

// Uma instância para o app inteiro.
export const driftSubject = new DriftSubject()
