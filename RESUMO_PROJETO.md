# Resumo do Projeto

## Visao geral
- App web em React 19 + Vite 6 + TypeScript, com Tailwind CSS 4.
- Backend local via Express (server.ts) para servir build e healthcheck.
- Persistencia e realtime via Supabase.
- Funcoes principais: estoque de medicamentos e historico de precos por farmacia.

## Stack
- Frontend: React 19, Vite 6, TypeScript.
- UI: Tailwind CSS 4, tailwind-merge, clsx, lucide-react, motion.
- Backend local: Express (middleware Vite no dev; estatico no prod).
- Dados: Supabase (db + realtime).
- Datas: date-fns com pt-BR.
- Arquivos: package.json, src/index.css, server.ts, src/supabase.ts.

## Estrutura do projeto
- App principal: src/App.tsx
- Bootstrap: src/main.tsx
- Supabase client + device id: src/supabase.ts
- Tipos de dominio: src/types.ts
- Estilos base: src/index.css
- Server: server.ts
- Build config: vite.config.ts
- Deploy: netlify.toml, GUIA_DEPLOY.md

## Funcionalidades principais
- Estoque de medicamentos:
  - CRUD completo, consumo/estoque e alertas de baixo estoque.
- Historico de precos:
  - Cadastro de farmacias, registros de preco e calculo de melhor preco.
- Realtime:
  - Subscricao em medications, pharmacies, price_records.
- Device ID local:
  - Identificador anonimo salvo em localStorage.

## Pontos de extensao (onde mexer)
- UI/Fluxo:
  - Adicionar novas telas/abas no src/App.tsx.
- Novas entidades/tabelas:
  - Criar tabela no Supabase.
  - Adicionar tipo em src/types.ts.
  - Implementar CRUD e fetch em src/App.tsx.
  - (Opcional) incluir realtime.
- API local:
  - Adicionar rotas no server.ts (ex.: /api/reports).

## Como adicionar uma funcao nova (ex.: Lembretes)
1. Criar tabela reminders no Supabase.
2. Definir tipo em src/types.ts.
3. Implementar:
   - fetchData para listar
   - handlers handleAdd/Update/Delete
   - (Opcional) realtime.
4. Criar UI em src/App.tsx.

## Como remover uma funcao (ex.: Precos)
1. Remover estados/handlers de priceRecords em src/App.tsx.
2. Remover componentes/abas associadas.
3. (Opcional) remover tabela no Supabase.

## Configuracao/Env
- Supabase: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY em runtime.
- .env.example tem GEMINI_API_KEY e APP_URL.
- README.md menciona GEMINI_API_KEY para uso local.

## Scripts
- dev: tsx server.ts
- build: vite build
- start: node server.ts
- preview: vite preview
- clean: rm -rf dist
- lint: tsc --noEmit

## Deploy (rapido)
- Netlify:
  - Config em netlify.toml
  - Build: npm run build
  - Publish: dist
  - SPA redirect para /index.html
  - Passo a passo em GUIA_DEPLOY.md
