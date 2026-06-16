# Extrato Multi-Banco OFX — Angular 22

## Pré-requisitos

- Node.js 20+
- npm 10+

## Setup

```bash
# 1. Instale as dependências
npm install

# 2. Instale a SheetJS (usada para exportar XLSX)
npm install xlsx

# 3. Rode em desenvolvimento
npm start
# Acesse: http://localhost:4200

# 4. Build para produção
npm run build
# Saída em: dist/ofx-app/
```

## Estrutura do projeto

```
src/app/
├── models/
│   └── ofx.models.ts          — interfaces TypeScript
├── services/
│   ├── bank-db.service.ts     — base de bancos (código → nome, cor, sigla)
│   ├── ofx-parser.service.ts  — parsing OFX + detecção de encoding
│   ├── store.service.ts       — estado global com Signals
│   └── export.service.ts      — exportação CSV e XLSX
├── components/
│   ├── upload/                — upload de arquivos, saldo inicial, modais
│   ├── period-filter/         — painel de período com atalhos
│   ├── history-log/           — accordion de ações/undo (5 ações)
│   ├── kpi-grid/              — KPIs e indicadores
│   ├── account-cards/         — cards por banco
│   └── tabs/
│       ├── transactions/      — tabela completa com filtros e paginação
│       ├── balance/           — saldo por conta com evolução diária
│       └── other-tabs.ts      — resumo diário, semanal, por descrição, por conta
├── pipes/
│   └── brl.pipe.ts            — formatação de moeda pt-BR
└── app.component.*            — componente raiz + roteamento de abas
```

## Padrões utilizados (Angular 22)

- **Standalone components** — sem NgModule
- **Signals** — estado reativo com `signal()`, `computed()`, `effect()`
- **Control flow** — `@if`, `@for`, `@switch` no template (sem *ngIf/*ngFor)
- **inject()** — injeção funcional de dependências
- **Lazy computed** — todos os dados derivados calculados automaticamente via `computed()`

## Hospedagem gratuita

Após `npm run build`, o conteúdo de `dist/ofx-app/browser/` é um site estático.
Suba em: **Netlify Drop**, **Vercel**, **GitHub Pages** ou **Cloudflare Pages**.

## Adicionando suporte a Excel formatado

O `ExportService` usa SheetJS para exportação básica.
Para layout avançado (cores, bordas, mesclagem), instale **ExcelJS**:

```bash
npm install exceljs
```

E use `ExcelJS.Workbook` no `ExportService` — a estrutura já está pronta para isso.
