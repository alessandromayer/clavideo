import { useState } from 'react';
import Logo from './Logo.jsx';

export default function Setup({ onComplete, onNeedTutorial }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [hasKey, setHasKey] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [llmProvider, setLlmProvider] = useState('claude-local');
  const [llmKey, setLlmKey] = useState('');
  const [error, setError] = useState('');

  const submitName = (e) => {
    e.preventDefault();
    if (!name.trim()) return setError('Digita seu nome pra continuar');
    setError('');
    setStep(2);
  };

  const submitKey = (e) => {
    e.preventDefault();
    if (!apiKey.trim()) return setError('Cola a chave de fal.ai aqui');
    const isLocal = llmProvider === 'claude-local';
    const hasUsableLlm = isLocal || llmKey.trim();
    if (llmProvider !== 'claude-local' && !llmKey.trim()) {
      // user picked claude/openai but left key empty → skip LLM
    }
    setError('');
    onComplete({
      name: name.trim(),
      apiKey: apiKey.trim(),
      llmProvider: hasUsableLlm ? llmProvider : '',
      llmKey: isLocal ? '' : llmKey.trim(),
    });
  };

  return (
    <div className="setup-shell">
      <div className="setup-bg" aria-hidden="true" />
      <div className="setup-card glass">
        <header className="setup-header">
          <Logo size={48} />
          <div className="setup-progress">
            <div className={`dot ${step >= 1 ? 'on' : ''}`} />
            <div className={`dot ${step >= 2 ? 'on' : ''}`} />
            <div className={`dot ${step >= 3 ? 'on' : ''}`} />
          </div>
        </header>

        {step === 1 && (
          <form onSubmit={submitName} className="setup-step">
            <h1 className="setup-title">
              Bem-vindo ao <span className="gradient-text">VIRADA-VIDEO</span>
            </h1>
            <p className="setup-sub">Vamos começar. Como a gente pode te chamar?</p>
            <input
              type="text"
              className="field"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            {error && <div className="error">{error}</div>}
            <button type="submit" className="btn-primary">
              Continuar
              <span className="btn-arrow">→</span>
            </button>
          </form>
        )}

        {step === 2 && (
          <div className="setup-step">
            <h1 className="setup-title">
              Prazer, <span className="gradient-text">{name}</span> 👋
            </h1>
            <p className="setup-sub">
              Você já tem uma chave de API do fal.ai?
            </p>
            <div className="choice-grid">
              <button
                className={`choice ${hasKey === true ? 'active' : ''}`}
                onClick={() => {
                  setHasKey(true);
                  setStep(3);
                }}
              >
                <span className="choice-icon">✓</span>
                <span className="choice-title">Já tenho</span>
                <span className="choice-sub">Vou colar aqui</span>
              </button>
              <button
                className={`choice ${hasKey === false ? 'active' : ''}`}
                onClick={() => {
                  setHasKey(false);
                  onNeedTutorial(name.trim());
                }}
              >
                <span className="choice-icon">?</span>
                <span className="choice-title">Ainda não</span>
                <span className="choice-sub">Me mostra o passo a passo</span>
              </button>
            </div>
            <button className="btn-ghost" onClick={() => setStep(1)}>
              ← Voltar
            </button>
          </div>
        )}

        {step === 3 && (
          <form onSubmit={submitKey} className="setup-step">
            <h1 className="setup-title">Sua chave do <span className="gradient-text">fal.ai</span></h1>
            <p className="setup-sub">
              A chave fica salva só no seu navegador. Ela é usada pra chamar a API
              direto do teu lado.
            </p>
            <input
              type="password"
              className="field"
              placeholder="fal_..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoFocus
            />

            <div className="setup-llm">
              <h2 className="setup-llm-title">
                Opcional — melhorar prompts com IA
              </h2>
              <p className="setup-llm-sub">
                Posso reescrever teus prompts seguindo as melhores práticas de
                cinematografia. Se tiver Claude Code instalado aqui na máquina,
                nem precisa de chave. Pular é OK.
              </p>
              <div className="llm-provider">
                <button
                  type="button"
                  className={`pill ${llmProvider === 'claude-local' ? 'active' : ''}`}
                  onClick={() => setLlmProvider('claude-local')}
                >
                  <span className="pill-main">Claude Local</span>
                  <span className="pill-sub">Sem chave</span>
                </button>
                <button
                  type="button"
                  className={`pill ${llmProvider === 'claude' ? 'active' : ''}`}
                  onClick={() => setLlmProvider('claude')}
                >
                  <span className="pill-main">Claude API</span>
                  <span className="pill-sub">Anthropic</span>
                </button>
                <button
                  type="button"
                  className={`pill ${llmProvider === 'openai' ? 'active' : ''}`}
                  onClick={() => setLlmProvider('openai')}
                >
                  <span className="pill-main">GPT</span>
                  <span className="pill-sub">OpenAI</span>
                </button>
              </div>
              {llmProvider !== 'claude-local' && (
                <input
                  type="password"
                  className="field"
                  placeholder={llmProvider === 'claude' ? 'sk-ant-...' : 'sk-...'}
                  value={llmKey}
                  onChange={(e) => setLlmKey(e.target.value)}
                />
              )}
              {llmProvider === 'claude-local' && (
                <p className="setup-llm-hint">
                  Usa a sessão autenticada do Claude Code local. Faz login com{' '}
                  <code>claude login</code> no terminal antes.
                </p>
              )}
            </div>

            {error && <div className="error">{error}</div>}
            <div className="row-actions">
              <button type="button" className="btn-ghost" onClick={() => setStep(2)}>
                ← Voltar
              </button>
              <button type="submit" className="btn-primary">
                Finalizar
                <span className="btn-arrow">→</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
