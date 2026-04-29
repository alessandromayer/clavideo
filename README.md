# VIRADA-VIDEO

App web pra gerar vídeos a partir de texto usando os modelos do [fal.ai](https://fal.ai) (Veo 3.1 e Seedance 2.0), com reescrita opcional de prompt via LLM seguindo boas práticas de cinematografia.

## Features

- **3 modelos** curados via fal.ai: Veo 3.1 (cinematic), Seedance 2.0 (até 15s com áudio nativo) e Veo 3.1 Fast (iteração rápida)
- **Direção integrada**: seletores de câmera, enquadramento, clima e estilo que viram parte do prompt automaticamente
- **Prompt enhance via LLM** (opcional): reescreve tuas ideias curtas em prompts cinematográficos estruturados, usando o guia Seedance 2.0 como system prompt
- **3 modos de LLM**: Claude Local (via `claude` CLI, sem chave extra), Claude API (Anthropic) ou GPT (OpenAI)
- **Capacidades dinâmicas por modelo**: a UI desabilita formatos/durações/resoluções que o modelo selecionado não suporta e corrige auto-magicamente quando você troca

## Stack

- Backend: Node.js 20+ + Express
- Frontend: Vite + React 18 (JSX puro, sem TypeScript)
- Vídeo: `@fal-ai/client`
- LLM: `@anthropic-ai/sdk`, `openai`, ou spawn do CLI `claude`

## Requisitos

- Node.js 20+
- Chave do [fal.ai](https://fal.ai/dashboard/keys) (obrigatória — é o que gera os vídeos)
- Opcional pro enhance de prompt, escolha um:
  - [Claude Code](https://claude.com/claude-code) instalado e autenticado (modo "Claude Local", sem custo extra se você já tem)
  - [Anthropic API key](https://console.anthropic.com) (modo "Claude API")
  - [OpenAI API key](https://platform.openai.com/api-keys) (modo "GPT")

## Setup

### Backend

```bash
cd backend
npm install
npm run dev
```

Sobe em `http://localhost:3001`. Se precisar trocar a porta, copie `.env.example` pra `.env` e ajuste.

### Frontend

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

Sobe em `http://localhost:5173`. O Vite faz proxy de `/api/*` pro backend automaticamente.

## Como usar

1. Cria uma key em https://fal.ai/dashboard/keys
2. Abre http://localhost:5173 e completa o setup (nome + chave fal.ai + opcionalmente LLM)
3. Escreve um prompt rascunho e seleciona modelo + opções de direção
4. Clica "Melhorar com Claude/GPT" se quiser que o LLM reescreva o prompt seguindo o guia
5. Clica "Gerar vídeo" — vai aparecer polling e em ~1–3 min o vídeo renderizado

## Modelos

| UI | fal.ai slug | Duração | Resolução | Formatos |
|---|---|---|---|---|
| Sundance | `fal-ai/veo3.1` | 4–8s | 720p / 1080p / 4K | 16:9, 9:16 |
| Soul | `bytedance/seedance-2.0/text-to-video` | 4–15s | 720p | 16:9, 9:16, 1:1 |
| Turbo | `fal-ai/veo3.1/fast` | 4–8s | 720p / 1080p / 4K | 16:9, 9:16 |

## Endpoints do backend

- `POST /api/generate` — submete job ao fal.ai, retorna `jobId`
- `GET /api/status/:jobId` — consulta status e devolve `videoUrl` quando completa
- `POST /api/enhance` — reescreve o prompt via LLM configurado
- `GET /api/health` — health check

Todas as chaves viajam no body/query de cada request. O backend é um passthrough stateless — a única memória é um `Map<jobId, modelSlug>` em RAM pra saber qual endpoint consultar no status.

## Arquitetura do prompt

O prompt final enviado ao fal.ai é composto em duas camadas:

1. **Pill-based** (sempre): o backend concatena o prompt do usuário com as direções selecionadas nos seletores em uma frase estruturada em inglês.
2. **LLM enhance** (opcional): antes de gerar, você pode clicar "Melhorar com..." — o backend manda o prompt + direções pro LLM junto com o guia Seedance 2.0 como system prompt, e o resultado substitui o texto do textarea pra você revisar antes de gerar.

## Segurança

Projeto pensado pra uso pessoal local. As chaves de API ficam no `localStorage` do navegador e viajam em cada request pro backend. **Não recomendado pra multi-usuário em produção** sem refatorar pra armazenamento server-side e auth.

## Créditos

- Guia de prompt engineering do Seedance 2.0 adaptado de [dexhunter/seedance2-skill](https://github.com/dexhunter/seedance2-skill)
- Vídeo via [fal.ai](https://fal.ai)
- Modelos: Google DeepMind Veo 3.1, ByteDance Seedance 2.0
