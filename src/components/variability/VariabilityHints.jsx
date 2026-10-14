import { useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { FEATURES, hasFeature } from '../../lib/features'
import { HintStack } from './HintWindow'

// Colas para a defesa (Reuso 03, item 02): cada janela diz onde a variabilidade
// aparece na tela e em que arquivo ela está. O conteúdo muda com a página e
// com a variante (empresa e plano) do usuário logado.
const SEES_ALL = ['admin', 'owner', 'mentor']

export default function VariabilityHints() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  if (!user) return null
  const company = user.company ?? 'empresa padrão'
  const essencial = user.plan === 'essencial'
  const csv = hasFeature(user, FEATURES.scheduleExport)
  const seesAll = SEES_ALL.includes(user.role)

  return <HintStack hints={[
    {
      id: `variante-${company}-${user.plan}`,
      title: `Variante: ${company}`,
      body: <>
        O nome da empresa ao lado do seu nome e o menu vêm da variante do produto. Plano <b>{essencial ? 'Essencial' : 'Manutenção'}</b>:
        {essencial
          ? ' só as funções comuns (Processos, Atividades e análise de drift). Equipamentos e Agendamentos somem do menu; se digitar /schedules, volta para o painel.'
          : ' funções comuns mais o módulo de manutenção (Equipamentos e Agendamentos).'}
      </>,
      where: 'API: variability/ProductLine.kt + application.yaml (productLine) · GET /api/manager/me · Web: lib/features.js, AppLayout.jsx, FeatureRoute.jsx',
    },
    pathname.startsWith('/dashboard') && {
      id: `dados-${seesAll ? 'todos' : company}`,
      title: 'Dados por empresa',
      body: seesAll
        ? <>Como <b>administrador</b>, você vê os processos de todas as empresas; o selo em cada processo diz de qual empresa ele é. Os outros papéis veem só os da própria empresa.</>
        : <>Você vê só os processos e análises da <b>{company}</b>. Troque a empresa nas setas do login para ver outras instâncias; o administrador vê todas.</>,
      where: 'Banco: deviante.businesses + business_id em cada registro · API: CompanyScope em Routing.kt (GET /api/processes) · Web: cabeçalho X-Deviante-Company (lib/demoCompany.js)',
    },
    pathname.startsWith('/schedules') && {
      id: `csv-${csv ? 'sim' : 'nao'}`,
      title: csv ? 'Função exclusiva: Exportar CSV' : 'Sem a função exclusiva',
      body: csv
        ? <>O botão <b>Exportar CSV</b> foi feito só para um cliente, a Alfa. Na Gama, mesmo plano, ele não aparece.</>
        : <>Esta empresa tem o módulo de manutenção, mas não contratou o <b>Exportar CSV</b>, exclusivo da Alfa. Mesma tela, variante diferente.</>,
      where: 'API: /api/schedules/export.csv com requireFeature(SCHEDULE_EXPORT) → 403 · Web: SchedulesPage.jsx (hasFeature)',
    },
    pathname.startsWith('/equipment') && {
      id: 'equipamentos-opcional',
      title: 'Módulo opcional',
      body: <>Equipamentos faz parte do plano Manutenção. A Beta (Essencial) não tem esta tela, e a API responde 403 se alguém chamar a rota direto.</>,
      where: 'API: route("/equipment") { requireFeature(Feature.EQUIPMENT) } · Web: FeatureRoute em App.jsx',
    },
  ]} />
}
