import {useEffect,useRef,useState} from 'react';
import {Download,FileUp,CheckCircle2,X} from 'lucide-react';
import {parseChiefTemplate,parseChiefManualEntries,sameImportedTrade,type ChiefImport} from '../lib/broker-import';
import {ChiefManualEntryFields,newChiefManualDraft} from './ChiefManualEntryFields';
import type {Trade,TradeInput} from '../lib/types';
import {formatTime} from '../lib/time';

export function BrokerImportDialog({userId,existing,onClose,onImport}:{userId:string;existing:Trade[];onClose:()=>void;onImport:(trades:TradeInput[])=>Promise<{saved:Trade[];skipped:number}>}) {
 const dialog=useRef<HTMLDialogElement>(null),previewElement=useRef<HTMLElement>(null),sequence=useRef(0),locked=useRef(false);
 const [alias,setAlias]=useState('致富美股'),[file,setFile]=useState<File|null>(null),[parsed,setParsed]=useState<ChiefImport|null>(null);
 const [mode,setMode]=useState<'file'|'manual'>('file'),[drafts,setDrafts]=useState(()=>[newChiefManualDraft()]);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[confirmed,setConfirmed]=useState(false),[result,setResult]=useState<{saved:number;skipped:number}|null>(null);
 useEffect(()=>{const element=dialog.current;element?.showModal();return()=>{sequence.current++;element?.close();};},[]);
 useEffect(()=>{if(parsed)previewElement.current?.scrollIntoView({block:'nearest'});},[parsed]);
 function reset(){sequence.current++;setParsed(null);setConfirmed(false);setResult(null);setError('');}
 async function preview(){
  if(locked.current||(mode==='file'&&!file))return;locked.current=true;setBusy(true);setError('');const current=++sequence.current;
  try{
   let data:ChiefImport;
   if(mode==='manual')data=await parseChiefManualEntries(drafts.map(draft=>draft.entry),userId,alias.trim());
   else{
    if(!file)return;
    if(file.size>1024*1024)throw new Error('文件超过 1 MB，请拆分导入。');
    if(!/\.(csv|tsv)$/i.test(file.name))throw new Error('目前支持按模板整理的 CSV／TSV 文件；原始 PDF／Excel 结单仍需样本适配。');
    const buffer=await file.arrayBuffer();let text:string;
    try{text=new TextDecoder('utf-8',{fatal:true}).decode(buffer);}catch{text=new TextDecoder('gb18030',{fatal:true}).decode(buffer);}
    data=await parseChiefTemplate(text,userId,alias.trim());
   }
   if(current===sequence.current){setParsed(data);setConfirmed(false);setResult(null);}
  }catch(cause){if(current===sequence.current){setParsed(null);setError(cause instanceof Error?cause.message:'无法预览成交。');}}
  finally{locked.current=false;if(current===sequence.current)setBusy(false);}
 }
 async function save(){
  if(!parsed||!confirmed||locked.current)return;locked.current=true;setBusy(true);setError('');
  try{const response=await onImport(parsed.trades);setResult({saved:response.saved.length,skipped:response.skipped});}
  catch(cause){setError(cause instanceof Error?cause.message:'导入未完成，请重试。');}
  finally{locked.current=false;setBusy(false);}
 }
 const duplicates=parsed?.trades.filter(row=>existing.some(prior=>prior.id===row.id&&sameImportedTrade(prior,row))).length??0;
 const conflict=parsed?.trades.some(row=>existing.some(prior=>prior.id===row.id&&!sameImportedTrade(prior,row)))??false;
 return <dialog className="record-dialog broker-import-dialog" ref={dialog} aria-labelledby="brokerImportTitle" onCancel={event=>{event.preventDefault();if(!locked.current)onClose();}}>
  <div className="dialog-head"><div><span className="eyebrow">CHIEF SECURITIES / TRADE IMPORT</span><h2 id="brokerImportTitle">致富成交记录导入</h2></div><button type="button" aria-label="关闭导入" disabled={busy} onClick={onClose}><X size={20}/></button></div>
  <div className="broker-import-body">
   <div className="broker-import-methods" role="group" aria-label="成交录入方式"><button type="button" aria-pressed={mode==='file'} disabled={busy||!!result} onClick={()=>{setMode('file');reset();}}><FileUp size={15} aria-hidden="true"/>文件导入</button><button type="button" aria-pressed={mode==='manual'} disabled={busy||!!result} onClick={()=>{setMode('manual');reset();}}>手动输入</button></div>
   <p className="broker-import-mode">{mode==='file'?'模板导入':'手动输入'} · 非实时同步</p>
   <p className="help">{mode==='file'?'将实际成交按模板整理为 CSV，先预览，再保存到交易日志。原始致富结单格式尚未核验；':'直接填写实际成交，先预览，再保存到交易日志。'}当前仅支持美元美股成交，不导入持仓、委托、期权或期货。</p>
   {mode==='file'&&<div className="broker-import-template"><a href="/chief-trade-template.csv" download><Download size={15} aria-hidden="true"/>下载空白模板</a><span>中文表头 · 每次最多 200 条</span></div>}
   <form onSubmit={event=>{event.preventDefault();void preview();}}>
   <fieldset disabled={busy||!!result}>
    <label>账户别名<input required value={alias} maxLength={40} onChange={event=>{setAlias(event.target.value);reset();}} placeholder="例如：致富美股"/></label>
    <p className="help">使用固定别名区分自己的账户。无需券商密码、验证码或真实账号。</p>
    {mode==='file'?<label className="broker-file-label"><FileUp size={19} aria-hidden="true"/><span>{file?file.name:'选择整理好的 CSV／TSV 文件'}</span><input type="file" accept=".csv,.tsv" aria-label="致富成交文件" onChange={event=>{setFile(event.target.files?.[0]??null);reset();}}/></label>:<ChiefManualEntryFields drafts={drafts} onChange={next=>{setDrafts(next);reset();}}/>}
    <p className="help">成交编号必须对应每笔独立成交；分笔成交不能重复使用订单号。时间须包含日期和时刻，并填写原始记录时区；缺失手续费请先核对结单。</p>
    <button type="submit" className="secondary" disabled={(mode==='file'&&!file)||busy||!!result}>{busy&&!parsed?(mode==='file'?'正在读取…':'正在校验…'):(mode==='file'?'读取并预览':'预览成交')}</button>
   </fieldset>
   </form>
   {parsed&&<section ref={previewElement} className="broker-import-preview" aria-label="成交导入预览"><div className="broker-import-count">已解析 {parsed.trades.length} 条{duplicates>0?` · 已加载记录中 ${duplicates} 条相同成交`:''}</div><div className="table-scroll"><table><thead><tr><th>成交编号</th><th>股票</th><th>方向</th><th>数量</th><th>成交价</th><th>手续费</th><th>时间／时区</th></tr></thead><tbody>{parsed.trades.map((row,index)=><tr key={row.id}><td>{parsed.references[index]}</td><td>{row.symbol}</td><td>{row.side==='buy'?'买入':'卖出'}</td><td>{row.quantity}</td><td>{row.price} USD</td><td>{row.fees}</td><td>{formatTime(row.occurred_at,row.record_timezone,'zh')}<small>{row.record_timezone}</small></td></tr>)}</tbody></table></div><p className="help">同一账户别名和成交编号用于检查重复；保存前还会核验服务器中的记录。编号相同而内容不同会停止导入。</p>{conflict&&<p className="form-error">已加载记录中存在相同编号但内容不同的成交，请先核对。</p>}{!result&&<label className="broker-import-confirm"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event=>setConfirmed(event.target.checked)}/><span>我已核对成交编号、方向、金额、手续费和时区，确认这是实际美股成交。</span></label>}</section>}
   {error&&<p className="form-error" role="alert">{error}</p>}
   {result&&<p className="broker-import-success" role="status"><CheckCircle2 size={18} aria-hidden="true"/>已导入 {result.saved} 条，跳过 {result.skipped} 条相同记录。</p>}
  </div>
  <div className="dialog-footer"><button type="button" className="secondary" disabled={busy} onClick={onClose}>{result?'完成':'取消'}</button>{!result&&<button type="button" className="primary" disabled={!parsed||!confirmed||busy||conflict} onClick={()=>void save()}>{busy?'正在导入…':`确认导入${parsed?` ${parsed.trades.length} 条`:''}`}</button>}</div>
 </dialog>;
}
