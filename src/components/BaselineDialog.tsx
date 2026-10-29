import {useEffect,useRef,useState} from 'react';
import type {Bar,WatchItem,Language} from '../lib/types';
import type {BaselineUpdate} from '../lib/api';
import {baselineFromBars,validDate} from '../lib/baseline';
import {resolveLocal} from '../lib/time';
import {demoBars} from '../lib/demo';
import {demoMode} from '../lib/client';
import {fetchHistory} from '../lib/api';
import {errorText} from '../lib/i18n';
export function BaselineDialog({items,defaultDate,language,onClose,onApply}:{items:WatchItem[];defaultDate:string;language:Language;onClose:()=>void;onApply:(updates:BaselineUpdate[],bars:Record<string,Bar[]>,date:string|null)=>Promise<void>}){
 const ref=useRef<HTMLDialogElement>(null);const lock=useRef(false);const zh=language==='zh';
 const [date,setDate]=useState(items.length===1?(items[0].baseline_date??defaultDate):defaultDate);
 const [preview,setPreview]=useState<{updates:BaselineUpdate[];bars:Record<string,Bar[]>}|null>(null);
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [progress,setProgress]=useState('');
 useEffect(()=>{ref.current?.showModal();return()=>ref.current?.close();},[]);
 async function calculate(){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');setPreview(null);
  try{
   if(!validDate(date))throw new Error('DATE_INVALID');const updates:BaselineUpdate[]=[];const histories:Record<string,Bar[]>={};
   for(let i=0;i<items.length;i++){
    const item=items[i];setProgress(`${i+1}/${items.length} ${item.symbol}`);
    const response=demoMode?{bars:demoBars(item,date),currency:item.currency,exchange:item.exchange}:await fetchHistory(item,date);
    if(response.currency!==item.currency||response.exchange!==item.exchange)throw new Error('IDENTITY_MISMATCH');const b=baselineFromBars(date,response.bars);
    updates.push({id:item.id,revision:item.revision,baseline_date:date,baseline_session:b.session,baseline_at:resolveLocal(`${date}T00:00:00`,item.timezone),baseline_timezone:item.timezone,baseline_price:b.price});histories[item.id]=b.bars;
   }setPreview({updates,bars:histories});
  }catch(e){setError(e instanceof Error&&['DATE_INVALID','OPEN_MISSING','HISTORY_EMPTY'].includes(e.message)?(zh?'请选择有效的过去日期。该日期可能没有可用历史开盘价；原记录保持不变。':'Choose a valid past date with available historical open prices. Existing records are unchanged.'):errorText(e,language));}
  finally{setBusy(false);lock.current=false;setProgress('');}
 }
 async function apply(){if(!preview||lock.current)return;lock.current=true;setBusy(true);try{await onApply(preview.updates,preview.bars,items.length===1?null:date);onClose();}catch(e){setError(errorText(e,language));}finally{lock.current=false;setBusy(false);}}
 return <dialog className="record-dialog baseline-dialog" ref={ref} onCancel={e=>{e.preventDefault();if(!busy)onClose();}} aria-labelledby="baseline-title"><div className="dialog-head"><h2 id="baseline-title">{zh?'修改起始记录日期':'CHANGE START DATE'}{items.length===1?` / ${items[0].symbol}`:' / ALL'}</h2><button aria-label={zh?'关闭':'Close'} disabled={busy} onClick={onClose}>×</button></div><div className="baseline-body"><label>{zh?'起始记录日期':'Start date'}<input aria-label={zh?'起始记录日期':'Start date'} type="date" min="1900-01-01" max={new Date().toISOString().slice(0,10)} value={date} disabled={busy} onChange={e=>{setDate(e.target.value);setPreview(null);setError('');}}/></label><p className="help">{zh?'沿用原网站算法：采用所选日期当天或之后首个交易日的开盘价，重新计算累计收益和曲线。每只股票按所属交易所日期处理。':'Uses the first available trading-day OPEN on or after this date, matching the original monitor. Returns and chart are recalculated by each exchange date.'}</p>{demoMode&&<p className="help">{zh?'演示使用历史快照和示例日开盘价，仅供查看交互。':'Preview uses a historical snapshot and sample daily opens.'}</p>}<button className="secondary" disabled={busy} onClick={()=>void calculate()}>{busy?progress||'…':zh?'查询并预览新起点':'CALCULATE & PREVIEW'}</button>{preview&&<div className="baseline-preview"><table><thead><tr><th>SYMBOL</th><th>{zh?'实际交易日':'SESSION'}</th><th>{zh?'新起始价':'NEW OPEN'}</th></tr></thead><tbody>{preview.updates.map(row=><tr key={row.id}><td>{items.find(i=>i.id===row.id)?.symbol}</td><td>{row.baseline_session}{row.baseline_session!==row.baseline_date?' *':''}</td><td>{row.baseline_price}</td></tr>)}</tbody></table><p className="help">{zh?'* 表示所选日期休市或无数据，采用后续首个交易日。确认后统一保存；任何记录发生冲突都会全部取消。':'* Requested date has no session; next available trading day used. All changes save together; conflicts cancel the entire update.'}</p></div>}{error&&<p role="alert" className="form-error">{error}</p>}<div className="dialog-footer"><button className="secondary" disabled={busy} onClick={onClose}>{zh?'取消':'CANCEL'}</button><button className="primary" disabled={busy||!preview} onClick={()=>void apply()}>{zh?'确认修改日期':'APPLY START DATE'}</button></div></div></dialog>;
}
