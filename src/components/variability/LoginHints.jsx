import { HintStack } from './HintWindow'

/** Cola da tela de login: o que as setas da empresa demonstram. */
export default function LoginHints() {
  return <HintStack hints={[{
    id: 'login-setas',
    title: 'Onde está a variabilidade',
    body: <>
      As setas no "Modo Protótipo" trocam a <b>empresa cliente</b>. Cada empresa é uma variante do mesmo produto:
      <ul style={{ margin: '6px 0 0', paddingLeft: 16 }}>
        <li><b>Alfa</b>: plano Manutenção + Exportar CSV (exclusiva)</li>
        <li><b>Beta</b> e <b>Delta</b>: plano Essencial (só as funções comuns)</li>
        <li><b>Gama</b>: plano Manutenção, sem a exclusiva</li>
      </ul>
      <p style={{ margin: '6px 0 0' }}>Os 4 papéis entram em qualquer empresa e veem os dados dela; o administrador vê todas. Cada processo, análise, máquina e monitoramento guarda no banco a empresa dona (business_id).</p>
    </>,
    where: 'application.yaml (productLine) → ProductLine.kt · Web: lib/demoCompany.js, LoginCard.jsx',
  }]} />
}
