import { useState } from 'react';
import { ArrowUpRight, ShieldCheck, Globe2, Clock3 } from 'lucide-react';
import { supabase } from '../lib/client';
import { translator } from '../lib/i18n';
import type { Language } from '../lib/types';
export function Auth({ language, recovery, onRecovered }: { language: Language; recovery: boolean; onRecovered: () => void }) {
  const t = translator(language); const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const strong = password.length >= 12 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^\w\s]/.test(password);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!supabase || busy) return; setBusy(true); setMessage('');
    try {
      if ((recovery || mode === 'signup') && !strong) { setMessage(t('authPassword')); return; }
      const redirect = `${location.origin}/`;
      const result = recovery ? await supabase.auth.updateUser({ password }) : mode === 'signin' ? await supabase.auth.signInWithPassword({ email, password }) : mode === 'signup' ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirect } }) : await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirect });
      if (result.error) { setMessage(language === 'zh' ? `登录服务：${result.error.message}` : result.error.message); return; }
      if (recovery) { onRecovered(); setMessage(t('saved')); }
      else if (mode === 'signup') setMessage(t('confirmEmail')); else if (mode === 'reset') setMessage(t('resetSent'));
    } catch { setMessage(t('error')); } finally { setBusy(false); }
  }
  return <div className="auth-layout"><section className="auth-story"><span className="eyebrow">US EQUITY MONITOR / ACCOUNT</span><h1>{language === 'zh' ? <>市场很大。<br/>你的视角，<em>独一无二。</em></> : <>The market is vast.<br/>Your perspective<br/>is <em>personal.</em></>}</h1><p>{t('authHint')}</p><div className="auth-benefits"><span><ShieldCheck size={18}/>{t('security')}</span><span><Globe2 size={18}/>{t('markets')}</span><span><Clock3 size={18}/>{t('timeAware')}</span></div></section><section className="auth-card"><span className="brand-icon">A</span><h2>{recovery ? t('resetSave') : t(mode)}</h2><form onSubmit={submit}>{!recovery && <label>{t('email')}<input autoComplete="email" type="email" required value={email} onChange={e => setEmail(e.target.value)}/></label>}{(mode !== 'reset' || recovery) && <label>{t('password')}<input type="password" required autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={mode === 'signin' ? 1 : 12} value={password} onChange={e => setPassword(e.target.value)}/></label>}{(mode === 'signup' || recovery) && <p className="help">{t('authPassword')}</p>}{message && <p className="auth-message" role="status">{message}</p>}<button className="primary" disabled={busy}>{busy ? t('loading') : recovery ? t('resetSave') : t(mode)}<ArrowUpRight size={18}/></button></form>{!recovery && <div className="auth-options">{(['signin', 'signup', 'reset'] as const).filter(m => m !== mode).map(m => <button className="text-button" key={m} disabled={busy} onClick={() => { setMode(m); setMessage(''); }}>{t(m)}</button>)}</div>}</section></div>;
}
