# @deviante/ui

Componentes de formulário reutilizáveis do Deviante, empacotados como pacote npm versionado.

- `FormModal`: fundo, cartão, cabeçalho com fechar, grade de campos, mensagem de erro e rodapé com Cancelar e Salvar.
- `Field`, `TextInput`, `Select`, `TextArea`: o rótulo e os campos com o mesmo estilo.

## Instalar

```bash
npm pack                                   # gera deviante-ui-1.0.0.tgz
npm install ./deviante-ui-1.0.0.tgz        # em outro projeto
```

No deviante-web o pacote entra como dependência local: `"@deviante/ui": "file:packages/deviante-ui"`.

As dependências `react` e `lucide-react` vêm do projeto que usa o pacote (`peerDependencies`). As classes são do Tailwind, então o projeto inclui o pacote na varredura do Tailwind (`@source` no CSS).

## Usar

```jsx
import { FormModal, Field, TextInput } from '@deviante/ui'

<FormModal title="Nova atividade" onClose={fechar} onSubmit={salvar} canSubmit={nome.trim() !== ''}>
  <Field label="Nome"><TextInput value={nome} onChange={(e) => setNome(e.target.value)} /></Field>
</FormModal>
```

## Versões

- 1.0.0: primeira versão, extraída das telas de Equipamento, Agenda e Atividade.
