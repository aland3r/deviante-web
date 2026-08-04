/**
 * Deviante quest log — IDs: UC{n}-{group}{letter} or 0.x infra
 * Doc: deviante/docs/roadmap.md
 */

export const ROADMAP_PHASES = [
  {
    id: 'P0',
    codename: 'INSERT COIN',
    title: 'Fase 0 — Auth + fundação',
    quests: [
      { id: '0.1', uc: null, label: 'DDL deviante no Supabase (schemas + tables)', status: 'done' },
      { id: '0.2', uc: null, label: 'Testers no Supabase Auth + managers seed', status: 'done' },
      { id: '0.3', uc: null, label: '.env.example Supabase (web + API)', status: 'done' },
      { id: 'UC1-0', uc: 'UC1', label: 'UI login + settings shell (mock)', status: 'done' },
      { id: 'UC1-1a', uc: 'UC1', label: 'Web .env Supabase + supabase-js client', status: 'done' },
      { id: 'UC1-1b', uc: 'UC1', label: 'Login e-mail/senha (Supabase Auth)', status: 'done' },
      { id: 'UC1-1c', uc: 'UC1', label: 'Sessão persiste + getSession no reload', status: 'done' },
      { id: 'UC1-1d', uc: 'UC1', label: 'Logout (signOut)', status: 'done' },
      { id: 'UC1-1e', uc: 'UC1', label: 'ProtectedRoute com sessão real', status: 'done' },
      { id: 'UC1-1f', uc: 'UC1', label: 'Google OAuth', status: 'done' },
      { id: 'UC1-2a', uc: 'UC1', label: 'API JDBC → Supabase Postgres', status: 'locked' },
      { id: 'UC1-2b', uc: 'UC1', label: 'Carregar deviante.managers após login', status: 'locked' },
      { id: 'UC1-2c', uc: 'UC1', label: 'Salvar perfil (account settings)', status: 'locked' },
      { id: 'UC2-0', uc: 'UC2', label: 'UI dashboard + process CRUD (mock)', status: 'done' },
      { id: 'UC2-1a', uc: 'UC2', label: 'API process CRUD (Supabase)', status: 'locked' },
      { id: 'UC2-1b', uc: 'UC2', label: 'Web processos via API (sem mock)', status: 'locked' },
    ],
  },
  {
    id: 'P1',
    codename: 'LOAD DATA',
    title: 'Fase 1 — Ingestão',
    quests: [
      { id: '1.0', uc: null, label: 'Inventário codigos_LuizPicolo (PM4Py + ADWIN)', status: 'done' },
      { id: 'UC4-1a', uc: 'UC4', label: 'Schema event_logs, operations, traces', status: 'locked' },
      { id: 'UC4-1b', uc: 'UC4', label: 'Upload CSV/XES + storage', status: 'locked' },
      { id: 'UC4-1c', uc: 'UC4', label: 'Parse PM4Py + persist traces', status: 'locked' },
      { id: 'UC3-1a', uc: 'UC3', label: 'Auto-criar activities no parse', status: 'locked' },
      { id: 'UC5-1a', uc: 'UC5', label: 'Tela mapping em bulk', status: 'locked' },
      { id: 'UC6-1a', uc: 'UC6', label: 'Match operação ↔ activity', status: 'locked' },
      { id: 'UC4-1d', uc: 'UC4', label: 'Flag mapping_complete no processo', status: 'locked' },
    ],
  },
  {
    id: 'P2',
    codename: 'BOSS FIGHT',
    title: 'Fase 2 — Drift (PIBITI)',
    quests: [
      { id: '2.1', uc: null, label: 'Job drift ADWIN + persist report', status: 'locked' },
      { id: '2.2', uc: null, label: 'Painel parâmetros de análise', status: 'locked' },
      { id: 'UC7-1a', uc: 'UC7', label: 'Investigar trace flagado', status: 'locked' },
      { id: 'UC8-1a', uc: 'UC8', label: 'Referência / dismiss / excluir baseline', status: 'locked' },
      { id: '2.3', uc: null, label: 'Recomendar manutenção', status: 'locked' },
    ],
  },
  {
    id: 'P3',
    codename: 'GAME CLEAR',
    title: 'Fase 3 — Manutenção',
    quests: [
      { id: '3.2', uc: null, label: 'Agendar manutenção', status: 'locked' },
      { id: '3.3', uc: null, label: 'Registrar ocorrência', status: 'locked' },
      { id: '3.1', uc: null, label: 'Schema equipment', status: 'locked' },
    ],
  },
]

export const LOADING_LINES = [
  'INSERT COIN TO CONTINUE...',
  'CONNECTING SUPABASE AUTH...',
  'BUFFERING SOJOURN TIMES...',
  'SPAWNING MANAGERS...',
  'READING XES FROM SHOP FLOOR...',
  'ADWIN WINDOW RESIZING...',
  'MAPPING RAW OPERATIONS...',
  'DRIFT DETECTOR WARMING UP...',
  'PLEASE WAIT — PIBITI SAVE POINT',
]
