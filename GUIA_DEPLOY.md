# Guia de Deploy: MedMae no Netlify

Este documento descreve como realizar o deploy do seu aplicativo no Netlify e configurar as variáveis de ambiente necessárias.

## 1. Preparação
Certifique-se de que seu código está em um repositório Git (GitHub, GitLab ou Bitbucket).

## 2. Conectar ao Netlify
1. Faça login no [Netlify](https://app.netlify.com/).
2. Clique em **"Add new site"** > **"Import an existing project"**.
3. Escolha seu provedor Git e selecione o repositório `MedMae`.

## 3. Configurações de Build
O Netlify deve detectar automaticamente as configurações baseadas no `netlify.toml`, mas confirme se:
- **Build command:** `npm run build`
- **Publish directory:** `dist`

## 4. Variáveis de Ambiente (CRÍTICO)
Antes de clicar em "Deploy site", ou logo após o primeiro build (que falhará sem elas), vá em:
**Site configuration** > **Environment variables** > **Add a variable**.

Adicione as seguintes variáveis:

| Key | Value |
| :--- | :--- |
| `VITE_SUPABASE_URL` | `https://kgvcusercgooadcmqwjk.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtndmN1c2VyY2dvb2FkY21xd2prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3ODI5NzIsImV4cCI6MjA5MDM1ODk3Mn0.8-5nUSFxx52NZmUdeYoQOwVERvm-9TaCnwALrNMpMvo` |

> [!TIP]
> Também adicionei a variável `VITE_SUPABASE_API_KEY` com o valor `sb_publishable_3rDOCsm9PmJCSgUD7FElYQ_NyOO1Hgm` se preferir usar esse formato, embora o app atualmente use o padrão `ANON_KEY`.

## 5. Finalizar
1. Clique em **"Deploy MedMae"**.
2. Aguarde a conclusão do build.
3. Acesse a URL gerada pelo Netlify!

---
*Configurado por Antigravity*
