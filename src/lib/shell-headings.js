// Ported from the Figma Make shell (src/lib/headings.ts). DocViewer assigns
// heading ids with the same slugify so the Toc anchors line up.
export function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
}

/** Pull h1–h3 headings from a markdown source, skipping fenced code blocks. */
export function extractHeadings(markdown) {
  const lines = (markdown ?? '').split('\n')
  const out = []
  const seen = new Map()
  let inFence = false

  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const m = /^(#{1,3})\s+(.*)$/.exec(line)
    if (!m) continue
    const level = m[1].length
    const text = m[2].replace(/[#*`]/g, '').trim()
    let id = slugify(text)
    const n = seen.get(id) ?? 0
    seen.set(id, n + 1)
    if (n > 0) id = `${id}-${n}`
    out.push({ id, text, level })
  }
  return out
}
