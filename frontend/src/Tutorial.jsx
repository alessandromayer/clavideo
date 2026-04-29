import { useState } from 'react';
import Logo from './Logo.jsx';

const STEPS = [
  {
    n: '01',
    title: 'Crie sua conta no fal.ai',
    body: 'Acesse fal.ai e faça o cadastro com seu email ou GitHub. Se já tiver conta, só fazer login.',
    link: { label: 'Abrir fal.ai', href: 'https://fal.ai' },
  },
  {
    n: '02',
    title: 'Acesse o painel de desenvolvedor',
    body: 'Dentro da conta, procure por "API" ou "Developers" no menu de configurações/perfil. É onde ficam as chaves de acesso.',
  },
  {
    n: '03',
    title: 'Gere uma nova API Key',
    body: 'Clique em "Create API Key" (ou equivalente), dê um nome tipo "VIRADA-VIDEO" e gere. Copie a chave imediatamente — geralmente ela só aparece uma vez.',
  },
  {
    n: '04',
    title: 'Ative créditos ou plano',
    body: 'A geração de vídeo consome créditos. Confira o plano e certifique-se de que sua conta está com saldo ou assinatura ativa.',
  },
  {
    n: '05',
    title: 'Volta aqui e cola a chave',
    body: 'Com a chave em mãos, volta pro VIRADA-VIDEO e cola no campo de API Key. Pronto, tu tá dentro.',
  },
];

export default function Tutorial({ name, onDone }) {
  const [checks, setChecks] = useState(new Set());
  const toggle = (i) => {
    const next = new Set(checks);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setChecks(next);
  };

  return (
    <div className="tutorial-shell">
      <div className="setup-bg" aria-hidden="true" />
      <div className="tutorial-wrap">
        <header className="tutorial-header">
          <Logo size={40} />
          <button className="btn-ghost" onClick={onDone}>
            Já tenho a chave agora →
          </button>
        </header>

        <div className="tutorial-hero">
          <h1 className="setup-title">
            {name ? `${name}, ` : ''}bora pegar sua{' '}
            <span className="gradient-text">chave do fal.ai</span>
          </h1>
          <p className="setup-sub">
            São 5 passos rápidos. Vai marcando conforme fizer.
          </p>
        </div>

        <ol className="steps">
          {STEPS.map((s, i) => (
            <li
              key={s.n}
              className={`step glass ${checks.has(i) ? 'done' : ''}`}
              onClick={() => toggle(i)}
            >
              <div className="step-num">{s.n}</div>
              <div className="step-body">
                <h3>{s.title}</h3>
                <p>{s.body}</p>
                {s.link && (
                  <a
                    className="step-link"
                    href={s.link.href}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {s.link.label} ↗
                  </a>
                )}
              </div>
              <div className="step-check">{checks.has(i) ? '✓' : ''}</div>
            </li>
          ))}
        </ol>

        <div className="tutorial-cta">
          <button className="btn-primary" onClick={onDone}>
            Peguei minha chave, voltar pro setup
            <span className="btn-arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
