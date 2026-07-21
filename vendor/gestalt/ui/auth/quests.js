import { getSupabase, isSupabaseConfigured } from './supabase.js'

const QUEST_COLUMNS = `
  product_code, phase_id, phase_codename, phase_label, phase_sort_order,
  quest_id, uc_number, label, status, sort_order
`.replace(/\s+/g, ' ').trim()

/** All quests, every product — public read (RLS: quests_public_read USING (true)). */
export async function fetchAllQuests() {
  if (!isSupabaseConfigured()) return null

  const { data, error } = await getSupabase()
    .schema('portfolio')
    .from('quests')
    .select(QUEST_COLUMNS)
    .order('product_code', { ascending: true })
    .order('phase_sort_order', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

/** Product name + lifecycle (`status`), used to label roadmap phases. */
export async function fetchProductsMeta() {
  if (!isSupabaseConfigured()) return null

  const { data, error } = await getSupabase()
    .schema('portfolio')
    .from('products')
    .select('code, name, status')

  if (error) throw new Error(error.message)
  return data ?? []
}
