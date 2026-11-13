import { useEffect, useState } from 'react';
import { ArrowUpRight, ShieldCheck, Globe2, Clock3 } from 'lucide-react';
import { supabase } from '../lib/client';
import { translator } from '../lib/i18n';
import type { Language } from '../lib/types';
type Mode = 'signin' | 'signup' | 'reset';
type PendingCode = { email: string; purpose: 'signup' | 'recovery'; nextSendAt: number };
const pendingKey = 'stock-atlas-pending-email-code';
function readPending(): PendingCode | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(pendingKey) ?? 'null');
    return value && typeof value.email === 'string' && (value.purpose === 'signup' || value.purpose === 'recovery') && Number.isFinite(value.nextSendAt) ? value : null;
  } catch { return null; }
}

export function Auth({ language, recovery, onRecovered }: { language: Language; recovery: boolean; onRecovered: () => void }) {
  const t = translator(language);
  const [pending, setPending] = useState<PendingCode | null>(readPending);
  const [mode, setMode] = useState<Mode>(() => readPending()?.purpose === 'recovery' ? 'reset' : readPending() ? 'signup' : 'signin');
  const [email, setEmail] = useState(() => readPending()?.email ?? '');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [now, setNow] = useState(Date.now);
  const verifying = !!pending && !recovery;
  const remaining = pending ? Math.max(0, Math.ceil((pending.nextSendAt - now) / 1000)) : 0;

  useEffect(() => {
    try { if (pending) sessionStorage.setItem(pendingKey, JSON.stringify(pending)); else sessionStorage.removeItem(pendingKey); } catch { /* Verification also works without browser storage. */ }
  }, [pending]);
  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [pending]);

  function awaitCode(purpose: PendingCode['purpose'], sent: boolean) {
    const timestamp = Date.now();
    setNow(timestamp);
    setPending({ email: email.trim(), purpose, nextSendAt: sent ? timestamp + 60000 : 0 });
    setPassword(''); setCode('');
    setMessage(sent ? t(purpose === 'signup' ? 'confirmEmail' : 'resetSent') : t('codeHint'));
  }
  function clearPending() {
    setPending(null);
    try { sessionStorage.removeItem(pendingKey); } catch { /* Browser storage is optional. */ }
  }
  function showError(error: { code?: string; message: string }) {
    if (error.code === 'otp_expired') setMessage(t('codeExpired'));
    else if (error.code === 'over_email_send_rate_limit' || error.code === 'over_request_rate_limit') setMessage(t('emailRateLimit'));
    else setMessage(language === 'zh' ? `账户服务：${error.message}` : error.message);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase || busy) return;
    setBusy(true); setMessage('');
    try {
      if (verifying) {
        if (!/^[0-9]{6}$/.test(code)) { setMessage(t('codeInvalid')); return; }
        const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: pending.purpose === 'recovery' ? 'recovery' : 'email' });
        if (error) { showError(error); return; }
        if (!data.session) { setMessage(t('error')); return; }
        clearPending(); setCode(''); setPassword('');
        return;
      }
      if ((recovery || mode === 'signup') && password.length < 6) { setMessage(t('authPassword')); return; }
      if (recovery) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) { showError(error); return; }
        clearPending(); setPassword(''); onRecovered();
      } else if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error?.code === 'email_not_confirmed') { setMode('signup'); awaitCode('signup', false); }
        else if (error) showError(error);
        else clearPending();
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) { showError(error); return; }
        if (!data.session) awaitCode('signup', true);
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
        if (error) { showError(error); return; }
        awaitCode('recovery', true);
      }
    } catch { setMessage(t('error')); } finally { setBusy(false); }
  }
  async function resend() {
    if (!supabase || !pending || busy || remaining > 0) return;
    setBusy(true); setMessage('');
    try {
      const result = pending.purpose === 'recovery'
        ? await supabase.auth.resetPasswordForEmail(email.trim())
        : await supabase.auth.resend({ type: 'signup', email: email.trim() });
      if (result.error) { showError(result.error); return; }
      awaitCode(pending.purpose, true);
    } catch { setMessage(t('error')); } finally { setBusy(false); }
  }
  function changeMode(next: Mode) { setMode(next); clearPending(); setCode(''); setPassword(''); setMessage(''); }

  return <div className="auth-layout">
    <section className="auth-story">
      <span className="eyebrow">市场观测 / ACCOUNT</span>
      <h1>{language === 'zh' ? <>市场很大。<br/>你的视角，<em>独一无二。</em></> : <>The market is vast.<br/>Your perspective<br/>is <em>personal.</em></>}</h1>
      <p>{t('authHint')}</p>
      <div className="auth-benefits"><span><ShieldCheck size={18}/>{t('security')}</span><span><Globe2 size={18}/>{t('markets')}</span><span><Clock3 size={18}/>{t('timeAware')}</span></div>
    </section>
    <section className="auth-card">
      <span className="brand-icon">A</span>
      <h2>{recovery ? t('resetSave') : verifying ? t(pending.purpose === 'recovery' ? 'verifyRecovery' : 'verifyEmail') : t(mode)}</h2>
      <form onSubmit={submit}>
        <fieldset disabled={busy} className="auth-fields">
          {!recovery && <label>{t('email')}<input autoComplete="email" type="email" required value={email} onChange={e => { setEmail(e.target.value); if (verifying) setCode(''); }}/></label>}
          {verifying ? <>
            <label>{t('emailCode')}<input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={code} onChange={e => setCode(e.target.value)} aria-describedby="email-code-hint"/></label>
            <p className="help" id="email-code-hint">{t('codeHint')}</p>
          </> : (mode !== 'reset' || recovery) && <label>{recovery ? t('newPassword') : t('password')}<input type="password" required autoComplete={mode === 'signin' && !recovery ? 'current-password' : 'new-password'} minLength={mode === 'signin' && !recovery ? 1 : 6} value={password} onChange={e => setPassword(e.target.value)}/></label>}
          {!verifying && (mode === 'signup' || recovery) && <p className="help">{t('authPassword')}</p>}
          {message && <p className="auth-message" role="status">{message}</p>}
          <button className="primary" disabled={busy}>{busy ? t('loading') : recovery ? t('resetSave') : verifying ? t('verifyCode') : t(mode)}<ArrowUpRight size={18}/></button>
        </fieldset>
      </form>
      {!recovery && <div className="auth-options">
        {verifying ? <>
          <button className="text-button" disabled={busy || remaining > 0 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())} onClick={() => void resend()}>{remaining > 0 ? `${t('resendCode')} (${remaining}s)` : t('resendCode')}</button>
          <button className="text-button" disabled={busy} onClick={() => changeMode(mode)}>{t('back')}</button>
        </> : mode !== 'signin' && <button className="text-button" disabled={busy} onClick={() => awaitCode(mode === 'reset' ? 'recovery' : 'signup', false)}>{t('haveCode')}</button>}
        {(['signin', 'signup', 'reset'] as const).filter(m => m !== mode).map(m => <button className="text-button" key={m} disabled={busy} onClick={() => changeMode(m)}>{t(m)}</button>)}
      </div>}
    </section>
  </div>;
}
