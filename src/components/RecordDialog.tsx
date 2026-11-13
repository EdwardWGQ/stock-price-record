import { useRef, useState, useEffect } from 'react';
import { X, Search, ArrowRight, Clock3 } from 'lucide-react';
import type { Instrument, WatchItem, Trade, Language, WatchInput, TradeInput } from '../lib/types';
import { translator, errorText } from '../lib/i18n';
import { resolveLocal, toLocal, marketDate, timezones } from '../lib/time';
import { tradeValue, money } from '../lib/finance';
import { watchSchema, tradeSchema } from '../lib/validation';
import { searchInstruments, fetchHistory } from '../lib/api';
import { demoMode } from '../lib/client';
import { demoInstruments } from '../lib/demo';
import {ChiefFeeBreakdown} from './ChiefFeeBreakdown';
import {chiefFeesForRecord,type ChiefChannel,type SecScope,type FeeRounding,type ChiefFeeResult} from '../lib/chief-fees';
import {instrumentKey} from '../lib/trade-instruments';
import {normalizeInstrument} from '../../shared/market-identity';

export function RecordDialog({ kind, existing, initialInstrument, instruments=[], repeatBuy=false, zone, language, onClose, onSave }: {
  kind: 'watch' | 'trade'; existing?: WatchItem | Trade; zone: string; language: Language;
  initialInstrument?:Instrument;instruments?:Instrument[];repeatBuy?:boolean;
  onClose: () => void; onSave: (value: WatchInput | TradeInput, revision?: number) => Promise<void>;
}) {
  const t = translator(language); const ref = useRef<HTMLDialogElement>(null);
  const timeLabel=kind==='watch'?t('baselineTime'):repeatBuy?t('purchaseTime'):t('recordTime');
  const familiarZones:Record<string,string>=language==='zh'?{'Asia/Shanghai':'北京时间','Asia/Hong_Kong':'香港时间','America/New_York':'美东时间','UTC':'协调世界时'}:{'Asia/Shanghai':'China time','Asia/Hong_Kong':'Hong Kong time','America/New_York':'New York time','UTC':'UTC'};
  const id = useRef(existing?.id ?? crypto.randomUUID());
  const originalZone = existing ? ('baseline_timezone' in existing ? existing.baseline_timezone : existing.record_timezone) : zone;
  const originalInstant = existing ? ('baseline_at' in existing ? existing.baseline_at : existing.occurred_at) : new Date().toISOString();
  const [recordZone, setRecordZone] = useState(originalZone);
  const [localTime, setLocalTime] = useState(toLocal(originalInstant, originalZone));
  const [occurrence, setOccurrence] = useState<'reject' | 'earlier' | 'later'>(() => {
    try { return resolveLocal(toLocal(originalInstant, originalZone), originalZone, 'earlier') === new Date(originalInstant).toISOString().replace('.000', '') ? 'earlier' : 'later'; } catch { return 'reject'; }
  });
  const [enteredInstrument, setInstrument] = useState<Instrument>(existing ?? initialInstrument ?? { symbol: '', name: '', exchange: '', currency: 'USD', timezone: 'America/New_York' });
  const instrument=normalizeInstrument(enteredInstrument);
  const [manual, setManual] = useState(!!existing);
  const [query, setQuery] = useState(''); const [results, setResults] = useState<Instrument[]>([]);
  const [searching, setSearching] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [baseline, setBaseline] = useState(existing && 'baseline_price' in existing ? existing.baseline_price ?? '' : '');
  const [alert, setAlert] = useState(existing && 'alert_percent' in existing ? existing.alert_percent : '-30');
  const [side, setSide] = useState<'buy' | 'sell'>(existing && 'side' in existing ? existing.side : 'buy');
  const [quantity, setQuantity] = useState(existing && 'quantity' in existing ? existing.quantity : '');
  const [price, setPrice] = useState(existing && 'price' in existing ? existing.price : '');
  const [fees, setFees] = useState(existing && 'fees' in existing ? existing.fees : '0');
  const [feeMode,setFeeMode]=useState<'chief'|'manual'>(kind==='trade'&&!existing?'chief':'manual');
  const [feeChannel,setFeeChannel]=useState<ChiefChannel>('online'),[secScope,setSecScope]=useState<SecScope>('sell'),[feeRounding,setFeeRounding]=useState<FeeRounding>('nearest');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [close, setClose] = useState<{ date: string; close: string } | null>(null);
  const searchSequence = useRef(0); const closeSequence = useRef(0); const submitLock = useRef(false);
  let chiefEstimate:ChiefFeeResult|null=null,feeError:string|undefined;
  if(kind==='trade'&&feeMode==='chief'){
    try{chiefEstimate=chiefFeesForRecord({quantity,price,side,occurredAt:resolveLocal(localTime,recordZone,occurrence),currency:instrument.currency,exchange:instrument.exchange,channel:feeChannel,secScope,rounding:feeRounding});}
    catch(cause){feeError=cause instanceof Error?cause.message:'手续费暂时无法计算。';}
  }
  const effectiveFees=feeMode==='chief'?chiefEstimate?.total??'':fees;
  useEffect(() => { ref.current?.showModal(); const d = ref.current; return () => d?.close(); }, []);
  useEffect(() => { setClose(null); closeSequence.current++; }, [localTime, recordZone, enteredInstrument]);
  async function search() {
    if (!query.trim() || searching) return;
    const sequence = ++searchSequence.current; setSearching(true); setError('');
    try { const rows = demoMode ? demoInstruments.filter(i => `${i.symbol} ${i.name}`.toLowerCase().includes(query.toLowerCase())) : await searchInstruments(query.trim()); if (sequence === searchSequence.current) setResults(rows); }
    catch (e) { setError(errorText(e, language)); } finally { setSearching(false); }
  }
  async function lookup() {
    setError(''); setBusy(true); const sequence = ++closeSequence.current;
    try {
      const start = marketDate(resolveLocal(localTime, recordZone, occurrence), instrument.timezone);
      const response = demoMode ? { bars: [{ date: start, close: '195.80' }], currency: instrument.currency, exchange: instrument.exchange } : await fetchHistory(instrument, start);
      if (sequence !== closeSequence.current) return;
      if (response.currency !== instrument.currency || response.exchange !== instrument.exchange) throw new Error('IDENTITY_MISMATCH');
      const first = response.bars.find(b => b.date >= start); if (!first) throw new Error('HISTORY_EMPTY'); setClose(first);
    } catch (e) { setError(errorText(e, language)); } finally { setBusy(false); }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (submitLock.current) return; submitLock.current = true; setBusy(true); setError('');
    try {
      const instant = resolveLocal(localTime, recordZone, occurrence);
      if(kind==='trade'&&feeMode==='chief'&&!chiefEstimate)throw new Error(feeError??'请先核对手续费计算条件。');
      if(repeatBuy&&!instruments.some(item=>instrumentKey(item)===instrumentKey(instrument)))throw new Error('VALIDATION');
      const common = { ...instrument, id: id.current, notes };
      const value = kind === 'watch' ? watchSchema.parse({ ...common, baseline_at: instant, baseline_timezone: recordZone, baseline_price: baseline || null, alert_percent: alert }) : tradeSchema.parse({ ...common, occurred_at: instant, record_timezone: recordZone, side:repeatBuy?'buy':side, quantity, price, fees:effectiveFees });
      await onSave(value, existing?.revision); onClose();
    } catch (e) { setError(errorText(e, language)); } finally { submitLock.current = false; setBusy(false); }
  }
  let total = '—'; try { if (quantity && price && effectiveFees!=='') total = money(tradeValue({ quantity, price, fees:effectiveFees, side }), instrument.currency, language); } catch { /* Incomplete form */ }
  function instrumentField(key: keyof Instrument, value: string) { setInstrument(prev => ({ ...prev, [key]: value })); }
  return <dialog ref={ref} className={repeatBuy?'record-dialog repeat-buy-dialog':'record-dialog'} onCancel={e => { e.preventDefault(); if (!busy) onClose(); }} aria-labelledby="dialog-title">
    <div className="dialog-head"><div><span className="eyebrow">市场观测 / {t('pending')}</span><h2 id="dialog-title">{existing ? t('edit') : repeatBuy ? t('additionalBuy') : kind === 'watch' ? t('addStock') : t('addTrade')}</h2></div><button className="icon-button" type="button" aria-label={t('close')} disabled={busy} onClick={onClose}><X size={20}/></button></div>
    <form onSubmit={submit}><fieldset disabled={busy}>
      {repeatBuy&&<div className="repeat-buy-stock"><label>{t('existingStock')}<select required aria-label={t('existingStock')} value={instrument.symbol?instrumentKey(instrument):''} onChange={event=>{const selected=instruments.find(item=>instrumentKey(item)===event.target.value);if(selected)setInstrument(selected);}}><option value="" disabled>{t('chooseExistingStock')}</option>{instruments.map(item=><option value={instrumentKey(item)} key={instrumentKey(item)}>{item.symbol} · {item.name} · {item.exchange}</option>)}</select></label><p className="help">{t('additionalBuyHint')}</p>{instrument.symbol&&<div className="repeat-buy-selected"><strong>{instrument.symbol}</strong><span>{instrument.name} · {instrument.exchange} · {instrument.currency}</span></div>}</div>}
      {!existing&&!repeatBuy && <div className="stock-search"><label htmlFor="stock-query">{t('findStock')}</label><p className="help">{t('queryHint')}</p><div className="input-action"><input id="stock-query" value={query} maxLength={80} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void search(); } }} placeholder="AAPL, NVIDIA, SAP…"/><button type="button" onClick={() => void search()} disabled={searching || !query.trim()}><Search size={17}/>{searching ? t('loading') : t('findStock')}</button></div>
        {results.map(row => <button type="button" className="search-result" key={`${row.symbol}-${row.exchange}`} onClick={() => { setInstrument(row); setManual(true); setResults([]); }}><span><b translate="no" className="notranslate">{row.symbol}</b> {row.name}<small>{row.exchange} · {row.currency}</small></span><ArrowRight size={18}/></button>)}
        <button type="button" className="text-button" onClick={() => setManual(!manual)}>{t('manual')}</button></div>}
      {manual&&!repeatBuy && <div className="form-grid instrument-grid">
        <label>{t('symbol')}<input translate="no" className="notranslate" required maxLength={24} value={instrument.symbol} onChange={e => instrumentField('symbol', e.target.value.toUpperCase().trim())}/></label>
        <label>{t('exchange')}<input required maxLength={64} value={instrument.exchange} onChange={e => instrumentField('exchange', e.target.value)}/></label>
        <label className="span-two">{t('name')}<input required maxLength={160} value={instrument.name} onChange={e => instrumentField('name', e.target.value)}/></label>
        <label>{t('currency')}<select value={instrument.currency} onChange={e => instrumentField('currency', e.target.value)}>{Intl.supportedValuesOf('currency').map(c => <option key={c}>{c}</option>)}</select></label>
        <label>{t('marketZone')}<select aria-label={t('marketZone')} value={instrument.timezone} onChange={e => instrumentField('timezone', e.target.value)}>{timezones(instrument.timezone).map(z => <option key={z}>{z}</option>)}</select></label>
      </div>}
      <div className="time-box"><div className="subheading"><Clock3 size={17}/>{kind === 'watch' ? t('starting') : timeLabel}</div><div className="form-grid">
        <label>{timeLabel}<input aria-label={timeLabel} required type="datetime-local" step="1" min="1900-01-01T00:00:00" max="2100-12-31T23:59:59" value={localTime} onChange={e => { setLocalTime(e.target.value); setOccurrence('reject'); }}/></label>
        <label>{t('recordZone')}<select aria-label={t('recordZone')} value={recordZone} onChange={e => { setRecordZone(e.target.value); setOccurrence('reject'); }}>{timezones(recordZone).map(z => <option key={z} value={z}>{repeatBuy&&familiarZones[z]?`${familiarZones[z]} · ${z}`:z}</option>)}</select></label>
        {!repeatBuy&&<label className="span-two">{t('occurrence')}<select aria-label={t('occurrence')} value={occurrence} onChange={e => setOccurrence(e.target.value as typeof occurrence)}><option value="reject">{t('reject')}</option><option value="earlier">{t('earlier')}</option><option value="later">{t('later')}</option></select></label>}
      </div></div>
      {repeatBuy&&<p className="help">{t('additionalBuyTimeHint')}</p>}
      {kind === 'watch' ? <><div className="form-grid"><label>{t('baselinePrice')}<input inputMode="decimal" value={baseline} onChange={e => setBaseline(e.target.value)} placeholder="195.80"/></label><label>{t('alert')}<input required inputMode="decimal" value={alert} onChange={e => setAlert(e.target.value)}/></label></div><p className="help">{t('baselineHint')}</p><div className="lookup-box"><button type="button" className="secondary" disabled={!instrument.symbol} onClick={() => void lookup()}>{t('closeLookup')}</button><p className="help">{t('closeHint')}</p>{close && <div className="close-confirm"><b>{close.date} · {close.close} {instrument.currency}</b><button type="button" onClick={() => setBaseline(close.close)}>{t('closeUse')}</button></div>}</div></> : <><label className="fee-mode-select">手续费计算方式<select aria-label="手续费计算方式" value={feeMode} onChange={event=>{const next=event.target.value as 'chief'|'manual';if(next==='manual'&&chiefEstimate)setFees(chiefEstimate.total);setFeeMode(next);}}><option value="chief">致富美股 · 按收费表自动估算</option><option value="manual">手动填写实际手续费</option></select></label><div className="form-grid"><label>{t('side')}<select aria-label={t('side')} value={side} disabled={repeatBuy} onChange={e => setSide(e.target.value as typeof side)}><option value="buy">{t('buy')}</option><option value="sell">{t('sell')}</option></select></label><label>{t('quantity')}<input required inputMode="decimal" value={quantity} onChange={e => setQuantity(e.target.value)}/></label><label>{t('price')}<input required inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)}/></label><label>{feeMode==='chief'?'手续费（自动估算）':t('fees')}<input aria-label="手续费" required inputMode="decimal" readOnly={feeMode==='chief'} value={effectiveFees} placeholder={feeMode==='chief'?'填写股数和成交价':'0'} onChange={e => setFees(e.target.value)}/></label></div>{feeMode==='chief'&&<ChiefFeeBreakdown result={chiefEstimate} error={quantity&&price?feeError:undefined} side={side} channel={feeChannel} secScope={secScope} rounding={feeRounding} onChannel={setFeeChannel} onSecScope={setSecScope} onRounding={setFeeRounding}/>}<div className="total-box"><span>{t('total')}</span><b>{total}</b></div></>}
      <label className="notes-field">{t('notes')}<textarea maxLength={2000} rows={3} value={notes} onChange={e => setNotes(e.target.value)}/></label>
    </fieldset>{error && <p className="form-error" role="alert">{error}</p>}<div className="dialog-footer"><button type="button" className="secondary" disabled={busy} onClick={onClose}>{t('cancel')}</button><button className="primary" disabled={busy || !instrument.symbol}>{busy ? t('saving') : repeatBuy?t('savePurchase'):t('save')}</button></div></form>
  </dialog>;
}
