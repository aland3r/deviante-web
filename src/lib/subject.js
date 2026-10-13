/**
 * Observer (Reuso 03): base comum dos sujeitos. Guarda os observadores e
 * avisa todos a cada evento; quem publica não sabe quem reage. Um observador
 * é qualquer objeto com `update(event)`.
 */
export class Subject {
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
