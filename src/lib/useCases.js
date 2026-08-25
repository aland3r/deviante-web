// Casos de Uso — pulled live from the DB (owner 25/08). The public UCs live in
// portfolio.use_cases (product_code='deviante', visibility='public'); RLS
// (`use_cases_public_read`) lets the anon key read the public/shipped rows, and
// `use_case_steps_public_read` lets it read their steps. Bilingual: one row per
// locale ('pt' | 'en'); the public site reads 'pt'.
//
// This replaces the old GitHub-markdown source for the "Casos de Uso" tab — the
// UCs are DB-owned (see gestalt-kit uc-esteira), not vault files.
import { getSupabase, isSupabaseConfigured } from './supabase'

const UC_FIELDS =
  'id,uc_number,short_id,slug,title,summary,description,description_why,description_what,description_bounds,actor,object_name,pre_condition,post_condition'

// steps carry their own locale, so fetch them nested and filter client-side.
const SELECT = `${UC_FIELDS},steps:use_case_steps(step_key,actor_action,system_response,sort_order,locale)`

export async function fetchDevianteUseCases(locale = 'pt') {
  if (!isSupabaseConfigured()) {
    return { status: 'unconfigured', useCases: [] }
  }

  const { data, error } = await getSupabase()
    .schema('portfolio')
    .from('use_cases')
    .select(SELECT)
    .eq('product_code', 'deviante')
    .eq('visibility', 'public')
    .eq('locale', locale)
    .order('uc_number', { ascending: true })

  if (error) throw error

  const useCases = (data ?? []).map((uc) => ({
    ...uc,
    steps: (uc.steps ?? [])
      .filter((s) => s.locale === locale)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
  }))

  return { status: 'ready', useCases }
}

// The single free-text `description` supersedes the legacy why/what/bounds
// trio, but the vault sync still writes the trio and `description` can be empty.
// Prefer the single field; fall back to the trio joined into paragraphs.
export function useCaseDescription(uc) {
  if (uc?.description?.trim()) return uc.description.trim()
  return [uc?.description_why, uc?.description_what, uc?.description_bounds]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join('\n\n')
}

// Map a DB use-case row to the shape the Make UseCaseCard renders. Steps are
// grouped into flows: a numeric step_key ("1","2") is the main path; a lettered
// one ("1A","2A") is an alternative. With alternatives, both flows get a label.
export function toUseCaseView(uc) {
  const main = []
  const alt = []
  for (const s of uc.steps ?? []) {
    const view = { step: s.step_key, action: s.actor_action, response: s.system_response }
    if (/[a-z]/i.test(s.step_key ?? '')) alt.push(view)
    else main.push(view)
  }

  const flows = []
  if (alt.length > 0) {
    flows.push({ label: 'CAMINHO PRINCIPAL', steps: main })
    flows.push({ label: 'ALTERNATIVAS', steps: alt })
  } else {
    flows.push({ steps: main })
  }

  return {
    id: uc.short_id,
    // These UCs keep the concept text in `summary`; description/trio are empty.
    description: useCaseDescription(uc) || uc.summary || '',
    title: uc.title,
    actor: uc.actor,
    object: uc.object_name,
    preCondition: uc.pre_condition,
    postCondition: uc.post_condition,
    flows,
  }
}
