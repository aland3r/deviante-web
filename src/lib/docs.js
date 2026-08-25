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

// Canonical public-site tabs (the shared skeleton — gestalt-kit lp-skeleton).
// Same tabs across products; only content differs. `Casos de Uso` is DB-driven
// (portfolio.use_cases) and handled by UseCasesView, not by docsViews below.
export const siteTabs = [
  { slug: 'documentacao', label: 'Documentação' },
  { slug: 'casos-de-uso', label: 'Casos de Uso' },
  { slug: 'objetos', label: 'Objetos' },
]

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
