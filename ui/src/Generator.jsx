import { useEffect, useRef, useState } from 'react';
import Logo from './Logo.jsx';

const MODELS = [
  {
    id: 'sundance',
    name: 'Sundance',
    tagline: 'Cinematic',
    desc: 'Tom cinematográfico, profundidade e direção de fotografia refinada.',
  },
  {
    id: 'soul',
    name: 'Soul',
    tagline: 'Longo e realista',
    desc: 'Seedance 2.0 — até 15s com áudio nativo. Ideal pra cenas que precisam respirar. Máx 720p.',
  },
  {
    id: 'turbo',
    name: 'Turbo',
    tagline: 'Rápido',
    desc: 'Geração veloz, ótima pra iterar ideias antes da versão final.',
  },
];

const FORMATS = [
  { id: '16:9', label: '16:9', sub: 'Widescreen' },
  { id: '9:16', label: '9:16', sub: 'Vertical' },
  { id: '1:1', label: '1:1', sub: 'Quadrado' },
];

const DURATIONS = [4, 6, 8, 12, 15];
const RESOLUTIONS = ['720p', '1080p', '4K'];

const CAPS = {
  sundance: { formats: ['16:9', '9:16'], durations: [4, 6, 8], resolutions: ['720p', '1080p', '4K'] },
  soul: { formats: ['16:9', '9:16', '1:1'], durations: [4, 6, 8, 12, 15], resolutions: ['720p'] },
  turbo: { formats: ['16:9', '9:16'], durations: [4, 6, 8], resolutions: ['720p', '1080p', '4K'] },
};

const pickFallback = (allowed, current) =>
  allowed.includes(current) ? current : allowed[allowed.length - 1];

const CAMERAS = [
  { id: '', label: 'Livre' }, { id: 'push-in', label: 'Push in' }, { id: 'pull-back', label: 'Pull back' },
  { id: 'orbit', label: 'Orbit' }, { id: 'track', label: 'Track' }, { id: 'crane', label: 'Crane' },
  { id: 'overhead', label: 'Overhead' }, { id: 'hitchcock', label: 'Hitchcock' },
  { id: 'pov', label: 'POV' }, { id: 'whip-pan', label: 'Whip pan' }, { id: 'static', label: 'Estática' },
];

const SHOTS = [
  { id: '', label: 'Livre' }, { id: 'extreme-close', label: 'Extreme close' },
  { id: 'close-up', label: 'Close-up' }, { id: 'medium-close', label: 'Médio close' },
  { id: 'medium', label: 'Médio' }, { id: 'full', label: 'Inteiro' }, { id: 'wide', label: 'Wide' },
];

const MOODS = [
  { id: '', label: 'Livre' }, { id: 'tense', label: 'Tenso' }, { id: 'warm', label: 'Caloroso' },
  { id: 'epic', label: 'Épico' }, { id: 'comedy', label: 'Comédia' },
  { id: 'documentary', label: 'Documentário' }, { id: 'dreamlike', label: 'Onírico' },
];

const STYLES = [
  { id: '', label: 'Livre' }, { id: 'cinematic', label: 'Cinematográfico' },
  { id: 'photoreal', label: 'Fotorrealista' }, { id: 'anime', label: 'Anime' },
  { id: 'ink-wash', label: 'Aquarela' }, { id: 'neon', label: 'Neon' }, { id: '3d-cgi', label: '3D CGI' },
];

export default function Generator({ user, onLogout }) {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('sundance');
  const [format, setFormat] = useState('16:9');
  const [duration, setDuration] = useState(6);
  const [resolution, setResolution] = useState('1080p');
  const [camera, setCamera] = useState('');
  const [shot, setShot] = useState('');
  const [mood, setMood] = useState('');
  const [style, setStyle] = useState('');

  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState('');
  const [error, setError] = useState('');
  const [jobId, setJobId] = useState('');
  const [enhancing, setEnhancing] = useState(false);

  // Ideas panel state
  const [ideasOpen, setIdeasOpen] = useState(false);
  const [ideasTheme, setIdeasTheme] = useState('');
  const [ideas, setIdeas] = useState([]);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [ideasError, setIdeasError] = useState('');

  const pollRef = useRef(null);

  const hasLlm = user.llmProvider === 'claude-local' || Boolean(user.llmProvider && user.llmKey);
  const hasClaudeLlm = hasLlm && user.llmProvider !== 'openai';
  const llmLabel = user.llmProvider === 'openai' ? 'GPT' : 'Claude';

  useEffect(() => () => clearInterval(pollRef.current), []);

  useEffect(() => {
    const caps = CAPS[model];
    if (!caps) return;
    setFormat((f) => pickFallback(caps.formats, f));
    setDuration((d) => pickFallback(caps.durations, d));
    setResolution((r) => pickFallback(caps.resolutions, r));
  }, [model]);

  const caps = CAPS[model] || { formats: FORMATS.map((f) => f.id), durations: DURATIONS, resolutions: RESOLUTIONS };

  const enhance = async () => {
    if (!prompt.trim()) return setError('Escreve o prompt primeiro');
    setError('');
    setEnhancing(true);
    try {
      const r = await fetch('/api/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), camera, shot, mood, style, llmProvider: user.llmProvider, llmKey: user.llmKey }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Falha ao melhorar');
      if (!data.enhanced) throw new Error('LLM não retornou texto');
      setPrompt(data.enhanced);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnhancing(false);
    }
  };

  const generateIdeas = async () => {
    if (!ideasTheme.trim()) return setIdeasError('Escreve um tema primeiro');
    setIdeasError('');
    setIdeas([]);
    setIdeasLoading(true);
    try {
      const r = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: ideasTheme.trim(), videoModel: model, llmProvider: user.llmProvider, llmKey: user.llmKey }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Falha ao gerar ideias');
      setIdeas(data.ideas || []);
    } catch (err) {
      setIdeasError(err.message);
    } finally {
      setIdeasLoading(false);
    }
  };

  const useIdea = (idea) => {
    setPrompt(idea);
    setIdeasOpen(false);
  };

  const start = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return setError('Escreve o prompt primeiro');
    setError('');
    setVideoUrl('');
    setProgress(0);
    setStatus('starting');

    try {
      const r = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), model, format, duration, resolution, camera, shot, mood, style, apiKey: user.apiKey }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Falha ao iniciar');
      if (!data.jobId) throw new Error('Resposta sem jobId');
      setJobId(data.jobId);
      setStatus('polling');
      pollRef.current = setInterval(() => poll(data.jobId), 3500);
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  };

  const poll = async (id) => {
    try {
      const r = await fetch(`/api/status/${encodeURIComponent(id)}?apiKey=${encodeURIComponent(user.apiKey)}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Falha no status');
      if (typeof data.progress === 'number') setProgress(data.progress);
      const s = String(data.status || '').toLowerCase();
      if (s.includes('complete') || s.includes('success') || s === 'done' || data.videoUrl) {
        clearInterval(pollRef.current);
        setVideoUrl(data.videoUrl || '');
        setProgress(100);
        setStatus('done');
      } else if (s.includes('fail') || s.includes('error')) {
        clearInterval(pollRef.current);
        setStatus('error');
        setError('A geração falhou no servidor do fal.ai');
      }
    } catch (err) {
      clearInterval(pollRef.current);
      setStatus('error');
      setError(err.message);
    }
  };

  const reset = () => {
    clearInterval(pollRef.current);
    setStatus('idle');
    setProgress(0);
    setVideoUrl('');
    setError('');
    setJobId('');
  };

  const busy = status === 'starting' || status === 'polling';

  return (
    <div className="gen-shell">
      <div className="setup-bg" aria-hidden="true" />

      <header className="gen-header">
        <Logo size={36} />
        <div className="gen-user">
          <span className="gen-user-hi">Olá, {user.name}</span>
          <button className="btn-ghost sm" onClick={onLogout}>Sair</button>
        </div>
      </header>

      <main className="gen-main">
        <section className="gen-left glass">
          <h2 className="gen-section-title">
            <span className="gradient-text">1.</span> Descreva seu vídeo
          </h2>
          <textarea
            className="field textarea"
            placeholder="Ex: um dragão de cristal sobrevoando uma cidade cyberpunk ao amanhecer..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={6}
          />

          <div className="btn-row">
            {hasLlm && (
              <button type="button" className="btn-ghost enhance-btn" onClick={enhance} disabled={enhancing || busy}>
                {enhancing ? <><span className="spinner" /> Melhorando com {llmLabel}...</> : <>✨ Melhorar com {llmLabel}</>}
              </button>
            )}
            {hasClaudeLlm && (
              <button type="button" className="btn-ghost enhance-btn" onClick={() => setIdeasOpen((v) => !v)} disabled={busy}>
                💡 {ideasOpen ? 'Fechar ideias' : 'Gerar ideias com Claude'}
              </button>
            )}
          </div>

          {/* Claude Ideas Panel */}
          {ideasOpen && hasClaudeLlm && (
            <div className="ideas-panel glass">
              <h3 className="ideas-title">💡 Gerador de Ideias com Claude</h3>
              <p className="ideas-sub">Descreve um tema e o Claude sugere 5 prompts prontos para o modelo <strong>{MODELS.find(m => m.id === model)?.name}</strong>.</p>
              <div className="ideas-input-row">
                <input
                  type="text"
                  className="field"
                  placeholder="Ex: natureza futurista, amor proibido, batalha épica..."
                  value={ideasTheme}
                  onChange={(e) => setIdeasTheme(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && generateIdeas()}
                />
                <button type="button" className="btn-primary sm" onClick={generateIdeas} disabled={ideasLoading}>
                  {ideasLoading ? <span className="spinner" /> : 'Gerar'}
                </button>
              </div>
              {ideasError && <div className="error">{ideasError}</div>}
              {ideas.length > 0 && (
                <ul className="ideas-list">
                  {ideas.map((idea, i) => (
                    <li key={i} className="idea-item">
                      <span className="idea-text">{idea}</span>
                      <button type="button" className="btn-ghost sm" onClick={() => useIdea(idea)}>
                        Usar →
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <h2 className="gen-section-title">
            <span className="gradient-text">2.</span> Escolha o modelo
          </h2>
          <div className="model-grid">
            {MODELS.map((m) => (
              <button key={m.id} className={`model-card ${model === m.id ? 'active' : ''}`} onClick={() => setModel(m.id)} type="button">
                <div className="model-tag">{m.tagline}</div>
                <div className="model-name">{m.name}</div>
                <div className="model-desc">{m.desc}</div>
              </button>
            ))}
          </div>

          <div className="gen-row">
            <div className="gen-col">
              <h3 className="gen-label">Formato</h3>
              <div className="pill-group">
                {FORMATS.map((f) => {
                  const disabled = !caps.formats.includes(f.id);
                  return (
                    <button key={f.id} type="button" disabled={disabled}
                      className={`pill ${format === f.id ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                      onClick={() => setFormat(f.id)}>
                      <span className="pill-main">{f.label}</span>
                      <span className="pill-sub">{f.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="gen-col">
              <h3 className="gen-label">Duração</h3>
              <div className="pill-group">
                {DURATIONS.map((d) => {
                  const disabled = !caps.durations.includes(d);
                  return (
                    <button key={d} type="button" disabled={disabled}
                      className={`pill ${duration === d ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                      onClick={() => setDuration(d)}>
                      <span className="pill-main">{d}s</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="gen-col">
              <h3 className="gen-label">Resolução</h3>
              <div className="pill-group">
                {RESOLUTIONS.map((r) => {
                  const disabled = !caps.resolutions.includes(r);
                  return (
                    <button key={r} type="button" disabled={disabled}
                      className={`pill ${resolution === r ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                      onClick={() => setResolution(r)}>
                      <span className="pill-main">{r}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <h2 className="gen-section-title">
            <span className="gradient-text">3.</span> Direção <span className="gen-optional">(opcional)</span>
          </h2>
          {[
            { label: 'Câmera', items: CAMERAS, val: camera, set: setCamera },
            { label: 'Enquadramento', items: SHOTS, val: shot, set: setShot },
            { label: 'Clima', items: MOODS, val: mood, set: setMood },
            { label: 'Estilo', items: STYLES, val: style, set: setStyle },
          ].map(({ label, items, val, set }) => (
            <div key={label} className="gen-col">
              <h3 className="gen-label">{label}</h3>
              <div className="pill-group">
                {items.map((item) => (
                  <button key={item.id || 'free'} type="button"
                    className={`pill ${val === item.id ? 'active' : ''}`}
                    onClick={() => set(item.id)}>
                    <span className="pill-main">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {error && <div className="error">{error}</div>}

          <button className="btn-primary generate" onClick={start} disabled={busy} type="button">
            {busy ? (
              <><span className="spinner" />{status === 'starting' ? 'Enviando...' : `Gerando... ${progress || ''}${progress ? '%' : ''}`}</>
            ) : (
              <>Gerar vídeo<span className="btn-arrow">→</span></>
            )}
          </button>
        </section>

        <aside className="gen-right glass">
          <h2 className="gen-section-title">Resultado</h2>
          {status === 'idle' && (
            <div className="preview placeholder">
              <div className="preview-icon">🎬</div>
              <p>Seu vídeo vai aparecer aqui depois de gerado.</p>
            </div>
          )}
          {(status === 'starting' || status === 'polling') && (
            <div className="preview loading">
              <div className="loader" />
              <p className="loader-text">
                {status === 'starting' ? 'Enviando pro fal.ai...' : 'Renderizando teu vídeo — isso pode levar alguns minutos.'}
              </p>
              {progress > 0 && (
                <div className="progressbar">
                  <div className="progressbar-fill" style={{ width: `${progress}%` }} />
                </div>
              )}
              {jobId && <div className="jobid">job: {jobId}</div>}
            </div>
          )}
          {status === 'done' && (
            <div className="preview done">
              {videoUrl ? (
                <>
                  <video src={videoUrl} controls autoPlay loop className="video" />
                  <a href={videoUrl} download className="btn-primary small" target="_blank" rel="noreferrer">Baixar vídeo ↓</a>
                </>
              ) : (
                <p>Vídeo pronto, mas sem URL retornada.</p>
              )}
              <button className="btn-ghost" onClick={reset}>Gerar outro</button>
            </div>
          )}
          {status === 'error' && (
            <div className="preview error-box">
              <div className="preview-icon">⚠️</div>
              <p>{error}</p>
              <button className="btn-ghost" onClick={reset}>Tentar de novo</button>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
