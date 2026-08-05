import { Link } from 'react-router-dom'

/*
  The Deviante mark exactly as the Figma Make export draws it in the canvas
  header. It lives in its own file because the dashboard header and the
  canvas header must be the same object, not two drawings that drift — the
  old shell had a "DV" square with a tagline and the canvas had this glyph.
*/
export default function BrandMark({ to = '/dashboard' }) {
  const content = (
    <>
      <div className="w-7 h-7 rounded flex items-center justify-center shrink-0" style={{ background: 'var(--accent-strong)' }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="3" cy="7" r="2" fill="white" />
          <circle cx="11" cy="3" r="2" fill="white" opacity="0.7" />
          <circle cx="11" cy="11" r="2" fill="white" opacity="0.7" />
          <line x1="5" y1="6.2" x2="9" y2="3.8" stroke="white" strokeWidth="1.2" opacity="0.8" />
          <line x1="5" y1="7.8" x2="9" y2="10.2" stroke="white" strokeWidth="1.2" opacity="0.5" />
        </svg>
      </div>
    </>
  )

  if (!to) {
    return <div className="flex items-center gap-2.5 mr-2">{content}</div>
  }
  return (
    <Link to={to} className="flex items-center gap-2.5 mr-2 no-underline" style={{ textDecoration: 'none' }}>
      {content}
    </Link>
  )
}
