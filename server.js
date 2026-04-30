import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

import Anthropic from '@anthropic-ai/sdk';
import { fal } from '@fal-ai/client';
import OpenAI from 'openai';

dotenv.config();

const PORT = process.env.PORT || 3001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_CONTENT = fs.readFileSync(path.join(__dirname, 'skill-seedance.md'), 'utf8');

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
const OPENAI_MODEL = 'gpt-4o-mini';

// ----- cinematic direction vocabulary (used both for pill-based enhancement and LLM rewrites)

const CAMERA_PHRASES = {
  'push-in': 'slow push-in camera moving toward the subject',
  'pull-back': 'slow pull-back revealing the wider scene',
  orbit: 'smooth orbit shot circling the subject',
  track: 'tracking follow shot staying with the subject',
  crane: 'crane shot rising from low to high angle',
  overhead: "bird's-eye overhead shot",
  hitchcock: 'Hitchcock dolly zoom (push in + zoom out) for a vertigo feel',
  pov: 'first-person POV shot',
  'whip-pan': 'fast whip pan with motion blur',
  static: 'static camera, no movement',
};

const SHOT_PHRASES = {
  'extreme-close': 'extreme close-up framing',
  'close-up': 'close-up shot, face fills the frame',
  'medium-close': 'medium close-up, head and shoulders',
  medium: 'medium shot, waist up',
  full: 'full shot showing the entire body',
  wide: 'wide establishing shot showing the full environment',
};

const MOOD_PHRASES = {
  tense: 'tense and suspenseful atmosphere',
  warm: 'warm, healing and cozy atmosphere',
  epic: 'epic and grand atmosphere',
  comedy: 'comedic tone with exaggerated expressions',
  documentary: 'restrained documentary tone',
  dreamlike: 'dreamlike and surreal atmosphere',
};

const STYLE_PHRASES = {
  cinematic: 'cinematic quality, shallow depth of field, 24fps, film grain',
  photoreal: 'photorealistic, natural lighting, high detail',
  anime: 'anime style, bold linework, vivid colors',
  'ink-wash': 'ink wash painting style, soft edges',
  neon: 'high-saturation neon colors, cool-warm contrast',
  '3d-cgi': '4K CGI render, clean surfaces, studio lighting',
};

// ----- fal.ai model registry — maps UI model ids to endpoint slugs and input shapers

const MODELS = {
  sundance: {
    slug: 'fal-ai/veo3.1',
    buildInput: ({ prompt, format, duration, resolution }) => ({
      prompt,
      aspect_ratio: format === '1:1' ? '16:9' : format,
      duration: `${Math.min(Number(duration) || 8, 8)}s`,
      resolution: resolution === '4K' ? '4k' : resolution,
      generate_audio: true,
    }),
  },
  soul: {
    slug: 'bytedance/seedance-2.0/text-to-video',
    buildInput: ({ prompt, format, duration, resolution }) => {
      const n = Number(duration);
      const clamped = Number.isFinite(n) ? Math.min(Math.max(n, 4), 15) : 5;
      return {
        prompt,
        aspect_ratio: format,
        duration: String(clamped),
        resolution: resolution === '480p' ? '480p' : '720p',
        generate_audio: true,
      };
    },
  },
  turbo: {
    slug: 'fal-ai/veo3.1/fast',
    buildInput: ({ prompt, format, duration, resolution }) => ({
      prompt,
      aspect_ratio: format === '1:1' ? '16:9' : format,
      duration: `${Math.min(Number(duration) || 8, 8)}s`,
      resolution: resolution === '4K' ? '4k' : resolution,
      generate_audio: true,
    }),
  },
};

// ----- prompt helpers

function buildPrompt(base, { camera, shot, mood, style } = {}) {
  const parts = [base.trim()];
  const shotPhrase = SHOT_PHRASES[shot];
  const cameraPhrase = CAMERA_PHRASES[camera];
  const moodPhrase = MOOD_PHRASES[mood];
  const stylePhrase = STYLE_PHRASES[style];

  if (shotPhrase || cameraPhrase) {
    parts.push([shotPhrase, cameraPhrase].filter(Boolean).join(', ') + '.');
  }
  if (moodPhrase) parts.push(`${moodPhrase[0].toUpperCase()}${moodPhrase.slice(1)}.`);
  if (stylePhrase) parts.push(`${stylePhrase[0].toUpperCase()}${stylePhrase.slice(1)}.`);

  return parts.join(' ');
}

function buildUserMessage({ prompt, camera, shot, mood, style }) {
  const directions = [];
  if (camera && CAMERA_PHRASES[camera]) directions.push(`Camera: ${CAMERA_PHRASES[camera]}`);
  if (shot && SHOT_PHRASES[shot]) directions.push(`Shot size: ${SHOT_PHRASES[shot]}`);
  if (mood && MOOD_PHRASES[mood]) directions.push(`Mood: ${MOOD_PHRASES[mood]}`);
  if (style && STYLE_PHRASES[style]) directions.push(`Style: ${STYLE_PHRASES[style]}`);

  const dirBlock = directions.length
    ? `\n\nDirections to incorporate naturally:\n- ${directions.join('\n- ')}`
    : '';

  return `Rewrite this rough video prompt into an enhanced prompt following the guide. Return ONLY the final prompt text.${dirBlock}\n\nRough prompt: "${prompt.trim()}"`;
}

// ----- LLM adapters

async function enhanceWithClaude(llmKey, userMessage) {
  const client = new Anthropic({ apiKey: llmKey });
  const resp = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: SKILL_CONTENT,
    messages: [{ role: 'user', content: userMessage }],
  });
  const textBlock = resp.content.find((b) => b.type === 'text');
  return textBlock?.text?.trim() || '';
}

async function enhanceWithOpenAI(llmKey, userMessage) {
  const client = new OpenAI({ apiKey: llmKey });
  const resp = await client.chat.completions.create({
    model: OPENAI_MODEL,
    max_tokens: 1024,
    messages: [
      { role: 'system', content: SKILL_CONTENT },
      { role: 'user', content: userMessage },
    ],
  });
  return resp.choices?.[0]?.message?.content?.trim() || '';
}

// Uses the locally-installed `claude` CLI (Claude Code). Avoids the bundled Agent SDK
// binary, which crashes on Windows with access violations.
function enhanceWithClaudeLocal(userMessage) {
  return new Promise((resolve, reject) => {
    const fullPrompt = `${SKILL_CONTENT}\n\n---\n\n${userMessage}`;
    const child = spawn(
      'claude',
      ['-p', '--output-format', 'text', '--model', CLAUDE_MODEL],
      { stdio: ['pipe', 'pipe', 'pipe'], shell: process.platform === 'win32' }
    );

    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('claude CLI timeout (60s)'));
    }, 60_000);

    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(new Error(`claude CLI não encontrado: ${e.message}`));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`claude CLI saiu com ${code}: ${stderr.trim() || '(sem stderr)'}`));
    });

    child.stdin.write(fullPrompt);
    child.stdin.end();
  });
}

// ----- app

// Stateless job tracking: slug encoded in jobId (works in serverless/Vercel)
const encodeJobId = (requestId, slug) =>
  Buffer.from(`${requestId}||${slug}`).toString('base64url');
const decodeJobId = (encoded) => {
  try {
    const str = Buffer.from(encoded, 'base64url').toString();
    const sep = str.lastIndexOf('||');
    if (sep === -1) return { requestId: encoded, slug: null };
    return { requestId: str.slice(0, sep), slug: str.slice(sep + 2) };
  } catch {
    return { requestId: encoded, slug: null };
  }
};

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'virada-video-backend' });
});

app.post('/api/generate', async (req, res) => {
  const { prompt, model, format, duration, resolution, camera, shot, mood, style, apiKey } =
    req.body || {};

  if (!apiKey) return res.status(400).json({ error: 'apiKey é obrigatória' });
  if (!prompt) return res.status(400).json({ error: 'prompt é obrigatório' });

  const config = MODELS[model];
  if (!config) return res.status(400).json({ error: `modelo inválido: ${model}` });

  const enhancedPrompt = buildPrompt(prompt, { camera, shot, mood, style });

  try {
    fal.config({ credentials: apiKey });
    const input = config.buildInput({
      prompt: enhancedPrompt,
      format,
      duration,
      resolution,
    });
    const { request_id } = await fal.queue.submit(config.slug, { input });
    res.json({ jobId: encodeJobId(request_id, config.slug), enhancedPrompt });
  } catch (err) {
    console.error('[generate] erro:', err);
    res.status(500).json({
      error: err?.body?.detail || err?.message || 'Erro ao contatar fal.ai',
    });
  }
});

app.get('/api/status/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const apiKey = req.query.apiKey;

  if (!apiKey) return res.status(400).json({ error: 'apiKey é obrigatória' });

  const { requestId, slug } = decodeJobId(jobId);
  if (!slug) return res.status(404).json({ error: 'job inválido (reinicie a geração)' });

  try {
    fal.config({ credentials: apiKey });
    const status = await fal.queue.status(slug, { requestId });

    if (status.status === 'COMPLETED') {
      const result = await fal.queue.result(slug, { requestId });
      return res.json({
        status: 'completed',
        videoUrl: result?.data?.video?.url || '',
        progress: 100,
      });
    }

    res.json({
      status: String(status.status || 'unknown').toLowerCase(),
      videoUrl: '',
      progress: status.status === 'IN_PROGRESS' ? 50 : 10,
    });
  } catch (err) {
    console.error('[status] erro:', err);
    res.status(500).json({
      error: err?.body?.detail || err?.message || 'Erro ao contatar fal.ai',
    });
  }
});

app.post('/api/enhance', async (req, res) => {
  const { prompt, camera, shot, mood, style, llmProvider, llmKey } = req.body || {};

  if (!prompt) return res.status(400).json({ error: 'prompt é obrigatório' });
  if (!['claude', 'openai', 'claude-local'].includes(llmProvider)) {
    return res
      .status(400)
      .json({ error: 'llmProvider deve ser "claude", "openai" ou "claude-local"' });
  }
  if ((llmProvider === 'claude' || llmProvider === 'openai') && !llmKey) {
    return res.status(400).json({ error: 'chave do LLM é obrigatória' });
  }

  const userMessage = buildUserMessage({ prompt, camera, shot, mood, style });

  try {
    let enhanced;
    if (llmProvider === 'claude') enhanced = await enhanceWithClaude(llmKey, userMessage);
    else if (llmProvider === 'openai') enhanced = await enhanceWithOpenAI(llmKey, userMessage);
    else enhanced = await enhanceWithClaudeLocal(userMessage);

    if (!enhanced) return res.status(502).json({ error: 'LLM retornou resposta vazia' });
    res.json({ enhanced });
  } catch (err) {
    console.error('[enhance] erro:', err);
    const status = err?.status || err?.response?.status || 500;
    const msg =
      err?.error?.message ||
      err?.response?.data?.error?.message ||
      err?.message ||
      'Erro ao contatar o LLM';
    res.status(status >= 400 && status < 600 ? status : 500).json({ error: msg });
  }
});

// ----- /api/ideas — gera ideias de prompts com Claude
app.post('/api/ideas', async (req, res) => {
  const { theme, videoModel, llmProvider, llmKey } = req.body || {};

  if (!theme) return res.status(400).json({ error: 'theme é obrigatório' });
  if (!llmProvider || llmProvider === 'openai') {
    return res.status(400).json({ error: 'Gerador de ideias requer Claude (API ou Local)' });
  }
  if (llmProvider === 'claude' && !llmKey) {
    return res.status(400).json({ error: 'Anthropic API key obrigatória' });
  }

  const modelName = videoModel === 'soul' ? 'Seedance 2.0 (até 15s, realista)' :
                    videoModel === 'turbo' ? 'Veo 3.1 Fast (4-8s, iteração rápida)' :
                    'Veo 3.1 (4-8s, cinematográfico)';

  const systemPrompt = `You are a creative director specializing in AI video generation. Generate exactly 5 distinct, creative video prompt ideas. Each idea must be a complete, ready-to-use prompt in English optimized for ${modelName}. Return ONLY a JSON array of 5 strings, no other text, no markdown, no explanation. Example format: ["prompt 1","prompt 2","prompt 3","prompt 4","prompt 5"]`;

  const userMessage = `Generate 5 creative video prompt ideas based on this theme: "${theme}". Each prompt should be vivid, cinematic, and different from each other. Vary the mood, setting, and visual style.`;

  try {
    let raw;
    if (llmProvider === 'claude') {
      const client = new Anthropic({ apiKey: llmKey });
      const resp = await client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });
      raw = resp.content.find((b) => b.type === 'text')?.text?.trim() || '';
    } else {
      // claude-local
      raw = await new Promise((resolve, reject) => {
        const fullPrompt = `${systemPrompt}\n\n${userMessage}`;
        const child = spawn('claude', ['-p', '--output-format', 'text', '--model', CLAUDE_MODEL], {
          stdio: ['pipe', 'pipe', 'pipe'], shell: process.platform === 'win32'
        });
        let out = '';
        const timer = setTimeout(() => { child.kill(); reject(new Error('timeout')); }, 60_000);
        child.stdout.on('data', (d) => (out += d));
        child.on('error', (e) => { clearTimeout(timer); reject(e); });
        child.on('close', (code) => {
          clearTimeout(timer);
          code === 0 ? resolve(out.trim()) : reject(new Error(`CLI exit ${code}`));
        });
        child.stdin.write(fullPrompt);
        child.stdin.end();
      });
    }

    // Parse JSON array from response
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return res.status(502).json({ error: 'Claude não retornou JSON válido', raw });
    const ideas = JSON.parse(match[0]);
    if (!Array.isArray(ideas) || ideas.length === 0) {
      return res.status(502).json({ error: 'Resposta inválida do Claude' });
    }
    res.json({ ideas });
  } catch (err) {
    console.error('[ideas] erro:', err);
    res.status(500).json({ error: err?.message || 'Erro ao gerar ideias' });
  }
});

// Serve built frontend from ../frontend/dist
const FRONTEND_DIST = path.join(__dirname, 'ui', 'dist');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  // SPA fallback — all non-API routes return index.html
  app.get('*', (_req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`\n🎬  VIRADA-VIDEO pronto!`);
  console.log(`👉  Acessa: http://localhost:${PORT}\n`);
});
