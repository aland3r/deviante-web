// Live docs viewer (landing page): fetches rendered content straight from the
// public deviante-docs repo on GitHub. Editing the Obsidian vault + git push
// is the whole publish step — no rebuild of this app needed.
export const DOCS_REPO = 'aland3r/deviante-docs'
export const DOCS_BRANCH = 'main'

export const docsManifest = [
  {
    section: 'Visão geral',
    items: [{ label: 'README', path: 'README.md' }],
  },
  {
    section: 'UX — Objetos (OOUX)',
    items: [
      { label: 'Objetos', path: 'UX/OBJECTS.md' },
      { label: 'Relacionamentos', path: 'UX/RELATIONSHIPS.md' },
      { label: 'CTAs', path: 'UX/CTAs.md' },
      { label: 'Atributos', path: 'UX/ATTRIBUTES.md' },
    ],
  },
  {
    section: 'Processo ORCA (discovery)',
    items: [
      { label: 'UC1 — componentes', path: 'UX/orca/UC1-componentes.md' },
      { label: 'Caso', path: 'UX/orca/5. Object Requirements/CASO.md' },
      { label: 'Evento', path: 'UX/orca/5. Object Requirements/EVENTO.md' },
      { label: 'Falha', path: 'UX/orca/5. Object Requirements/FALHA.md' },
      { label: 'Inspeção', path: 'UX/orca/5. Object Requirements/INSPEÇÃO.md' },
      { label: 'Manutenção', path: 'UX/orca/5. Object Requirements/MANUTENÇÃO.md' },
      { label: 'Máquina', path: 'UX/orca/5. Object Requirements/MÁQUINA.md' },
      { label: 'Sojourn time (Atividade)', path: 'UX/orca/Attributes Requirements/Atividade/sojourn time.md' },
      {
        label: 'Tempo de finalização (Atividade)',
        path: 'UX/orca/Attributes Requirements/Atividade/tempo de finalização.md',
      },
      { label: 'Tempo de início (Atividade)', path: 'UX/orca/Attributes Requirements/Atividade/tempo de início.md' },
      { label: 'Event Log (Process)', path: 'UX/orca/Attributes Requirements/Process/Event Log.md' },
    ],
  },
  {
    section: 'Arquitetura',
    items: [
      { label: 'Modelo C4', placeholder: 'Em construção — modelo C4 (contexto, containers) ainda não publicado.' },
      { label: 'UML', placeholder: 'Em construção — diagramas UML ainda não publicados.' },
    ],
  },
]

const cache = new Map()

function rawUrl(path) {
  const encoded = path.split('/').map(encodeURIComponent).join('/')
  return `https://raw.githubusercontent.com/${DOCS_REPO}/${DOCS_BRANCH}/${encoded}`
}

export async function fetchDoc(path) {
  if (cache.has(path)) return cache.get(path)

  const response = await fetch(rawUrl(path), { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Não foi possível carregar ${path} (${response.status}).`)
  }
  const text = await response.text()
  cache.set(path, text)
  return text
}
