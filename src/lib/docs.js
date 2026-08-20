// Live docs viewer: fetches rendered content straight from the public
// deviante-docs repo on GitHub. Editing the Obsidian vault + git push is the
// whole publish step — no rebuild of this app needed.
//
// The public site is split into three destinations reachable from the landing
// nav (owner 19/08): the landing "/" is a real landing page (statements + CTA);
// the documentation itself lives one level down, under three views —
// Documentação, Casos de Uso and Objetos. `docsViews` is the source of truth
// for that split; each view keeps its own grouped sidebar.
export const DOCS_REPO = 'aland3r/deviante-docs'
export const DOCS_BRANCH = 'main'

export const docsViews = [
  {
    slug: 'documentacao',
    label: 'Documentação',
    eyebrow: 'Arquitetura',
    blurb: 'Arquitetura em arc42, com diagramas C4 e UML.',
    sections: [
      {
        section: 'Arquitetura (arc42)',
        items: [{ label: 'Documento arc42', path: 'architecture/arc42.md' }],
      },
    ],
  },
  {
    slug: 'casos-de-uso',
    label: 'Casos de Uso',
    eyebrow: 'Processo ORCA',
    blurb: 'A descoberta ORCA e os requisitos de cada objeto do domínio.',
    sections: [
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
    ],
  },
  {
    slug: 'objetos',
    label: 'Objetos',
    eyebrow: 'UX — OOUX',
    blurb: 'Os objetos do produto, seus relacionamentos, CTAs e atributos.',
    sections: [
      {
        section: 'UX — Objetos (OOUX)',
        items: [
          { label: 'Objetos', path: 'UX/OBJECTS.md' },
          { label: 'Relacionamentos', path: 'UX/RELATIONSHIPS.md' },
          { label: 'CTAs', path: 'UX/CTAs.md' },
          { label: 'Atributos', path: 'UX/ATTRIBUTES.md' },
        ],
      },
    ],
  },
]

export function getView(slug) {
  return docsViews.find((view) => view.slug === slug) ?? null
}

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
