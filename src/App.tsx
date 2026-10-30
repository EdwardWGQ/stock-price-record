import {useEffect,useRef,useState} from 'react';
import {Decimal} from 'decimal.js';
import type {User} from '@supabase/supabase-js';
import type {WatchItem,Trade,Language,Bar,Quote,Instrument,WatchInput,TradeInput} from './lib/types';
import {configured,demoMode,supabase} from './lib/client';
import * as api from './lib/api';
import {initialDemo,demoQuote,demoBars,demoInstruments} from './lib/demo';
import {percent,signedPercent} from './lib/finance';
import {errorText,translator} from './lib/i18n';
import {formatTime,resolveLocal} from './lib/time';
import {baselineFromBars} from './lib/baseline';
import {MonitorChart,colors} from './components/MonitorChart';
import {BaselineDialog} from './components/BaselineDialog';
import {RecordDialog} from './components/RecordDialog';
import {Auth} from './components/Auth';
import {VolatilityPanel} from './components/VolatilityPanel';
import {DeleteDialog} from './components/DeleteDialog';
import {emailLink,cleanAuthAddress,processEmailLink} from './lib/auth-links';
import {saveExportFile} from './lib/export-file';
import {parallelEach} from './lib/parallel';
import {readWorkspace,writeWorkspace,clearWorkspace} from './lib/workspace-cache';
export default function App(){
 const language:Language='zh',zh=true,t=translator(language);
 const [user,setUser]=useState<User|null>(null),[ready,setReady]=useState(demoMode||!configured),[recovery,setRecovery]=useState(false);
 const [items,setItems]=useState<WatchItem[]>(demoMode?initialDemo().watchlist:[]),[trades,setTrades]=useState<Trade[]>(demoMode?initialDemo().trades:[]);
 const [histories,setHistories]=useState<Record<string,Bar[]>>(demoMode?Object.fromEntries(initialDemo().watchlist.map(i=>[i.id,demoBars(i)])):{});
 const [preparedVolatility,setPreparedVolatility]=useState<Record<string,import('./lib/types').Volatility>>({});
 const [restored,setRestored]=useState(false);
 const [quotes,setQuotes]=useState<Record<string,Quote>>(demoMode?Object.fromEntries(initialDemo().watchlist.map(i=>[i.id,demoQuote(i)])):{});
 const [errors,setErrors]=useState<Record<string,string>>({}),[volRefresh,setVolRefresh]=useState(0);
 const [recordsOwner,setRecordsOwner]=useState<string|null>(null),[refreshRetry,setRefreshRetry]=useState(0);
 const [date,setDate]=useState('2026-06-01'),[selected,setSelected]=useState<string|null>(null),[query,setQuery]=useState(''),[results,setResults]=useState<Instrument[]>([]);
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[tab,setTab]=useState<'monitor'|'journal'>('monitor'),[sort,setSort]=useState({key:'net',dir:1});
 const [refreshing,setRefreshing]=useState(false),[deleteTarget,setDeleteTarget]=useState<WatchItem|Trade|null>(null);
 const [baselineEdit,setBaselineEdit]=useState<WatchItem[]|null>(null),[tradeEdit,setTradeEdit]=useState<{existing?:Trade}|null>(null);
 const epoch=useRef(0),workLock=useRef(false),active=useRef<string|null>(null),refreshLock=useRef(false),refreshPending=useRef(false);
 const removedIds=useRef(new Set<string>()),historyFetched=useRef(new Map<string,number>());
 const historyKey=(item:WatchItem)=>JSON.stringify([item.id,item.symbol,item.exchange,item.currency,item.timezone,item.baseline_date??item.baseline_at.slice(0,10)]);
 const currentHistoryKeys=useRef(new Map<string,string>());
 currentHistoryKeys.current=new Map(items.map(item=>[item.id,historyKey(item)]));
 useEffect(()=>{document.title='US EQUITY MONITOR';document.documentElement.lang=zh?'zh-CN':'en';},[zh]);
 useEffect(()=>{if(!supabase)return;let live=true;void (async()=>{
 try{
  const link=emailLink(location.href);
  if(link){
   const processed=await processEmailLink(location.href,async value=>{const {error}=await supabase!.auth.verifyOtp(value);if(error)throw error;});
   const {data}=await supabase!.auth.getSession();
   if(live){setUser(data.session?.user??null);setRecovery(processed.recovery);}
   history.replaceState(null,'',cleanAuthAddress(location.href));
  }else{
   const {data,error}=await supabase!.auth.getSession();
   if(error)throw error;
   if(live)setUser(data.session?.user??null);
  }
 }catch{if(live)setNotice(zh?'验证链接无效或已过期。请重新发送确认邮件或申请重置密码。':'Verification link is invalid or expired. Request a new link.');history.replaceState(null,'',cleanAuthAddress(location.href));}
 finally{if(live)setReady(true);}
})();const sub=supabase.auth.onAuthStateChange((event,session)=>{const id=session?.user.id??null;const changed=id!==active.current;if(changed){epoch.current++;removedIds.current.clear();historyFetched.current.clear();setDeleteTarget(null);setRecordsOwner(null);setItems([]);setTrades([]);setHistories({});setQuotes({});setErrors({});setBaselineEdit(null);setTradeEdit(null);}active.current=id;if(changed&&id){setPreparedVolatility({});setRestored(false);const cached=readWorkspace(id);if(cached){setItems(cached.watchlist);setHistories(cached.histories);setQuotes(cached.quotes);setPreparedVolatility(cached.volatility);setDate(cached.baselineDate);setRestored(true);}}else if(!id){setPreparedVolatility({});setRestored(false);}setUser(session?.user??null);setReady(true);if(event==='PASSWORD_RECOVERY')setRecovery(true);});return()=>{live=false;sub.data.subscription.unsubscribe();};},[]);
 async function reload(){if(demoMode)return;const e=++epoch.current;setRecordsOwner(null);setBusy(true);try{const r=await api.loadRecords();if(e!==epoch.current)return;setItems(r.watchlist);setTrades(r.trades);setDate(r.profile?.baseline_date??'2026-06-01');setQuotes(previous=>({...r.quotes,...Object.fromEntries(Object.entries(previous).filter(([id])=>r.watchlist.some(item=>item.id===id&&item.symbol===previous[id].symbol&&item.exchange===previous[id].exchange&&item.currency===previous[id].currency)))}));setHistories(previous=>({...Object.fromEntries(Object.entries(previous).filter(([id])=>r.watchlist.some(item=>item.id===id&&currentHistoryKeys.current.get(id)===historyKey(item)))),...r.histories}));setPreparedVolatility(r.volatility);if(Object.keys(r.quotes).length)setRestored(true);setRecordsOwner(user?.id??null);}catch(err){setNotice(errorText(err,language));}finally{if(e===epoch.current)setBusy(false);}}
 useEffect(()=>{if(user&&!recovery)void reload();},[user?.id,recovery]);
 useEffect(()=>{if(!demoMode&&user&&recordsOwner===user.id)writeWorkspace(user.id,{watchlist:items,quotes,histories,volatility:preparedVolatility,baselineDate:date});},[items,quotes,histories,preparedVolatility,date,recordsOwner,user?.id]);
 async function refresh(){
  if(demoMode||!user||recovery||recordsOwner!==user.id)return;
  if(refreshLock.current){refreshPending.current=true;return;}
  refreshLock.current=true;const e=epoch.current;setRefreshing(true);
  setErrors({});
  const currentItems=items.filter(item=>!removedIds.current.has(item.id));
  const live=(item:WatchItem)=>e===epoch.current&&!removedIds.current.has(item.id);
  function fail(item:WatchItem,cause:unknown,quoteFailed=false){if(live(item)){setErrors(previous=>({...previous,[item.id]:errorText(cause,language)}));if(quoteFailed)setQuotes(previous=>previous[item.id]?({...previous,[item.id]:{...previous[item.id],stale:true}}):previous);}}
  try{
   const quoteTask=(async()=>{
    await parallelEach(Array.from({length:Math.ceil(currentItems.length/25)},(_,index)=>currentItems.slice(index*25,(index+1)*25)),2,async batch=>{
     try{
      const results=await api.fetchQuotes(batch);
      for(const item of batch){if(!live(item))continue;const result=results.find(row=>row.symbol===item.symbol&&row.exchange===item.exchange),q=result?.quote;
       if(!q){fail(item,new Error(result?.error??'MARKET_UNAVAILABLE'),true);continue;}
       if(q.symbol!==item.symbol||q.exchange!==item.exchange||q.currency!==item.currency){fail(item,new Error('IDENTITY_MISMATCH'),true);continue;}
       setQuotes(previous=>({...previous,[item.id]:{...q,cached:false}}));
      }
     }catch(cause){for(const item of batch)fail(item,cause,true);}
    });
   })();
   const historyTask=parallelEach(currentItems,6,async item=>{
    if(!live(item))return;
    const key=historyKey(item);
    if(Date.now()-(historyFetched.current.get(key)??0)<300000)return;
    try{
     const result=await api.fetchHistory(item,item.baseline_date??item.baseline_at.slice(0,10));
     if(result.currency!==item.currency||result.exchange!==item.exchange)throw new Error('IDENTITY_MISMATCH');
     if(!live(item)||currentHistoryKeys.current.get(item.id)!==key)return;
     historyFetched.current.set(key,Date.now());setHistories(previous=>({...previous,[item.id]:result.bars}));
    }catch(cause){fail(item,cause);}
   });
   await Promise.all([quoteTask,historyTask]);
  }finally{refreshLock.current=false;if(e===epoch.current)setRefreshing(false);if(refreshPending.current){refreshPending.current=false;setRefreshRetry(value=>value+1);}}
 }

 const itemKey=items.map(i=>`${i.id}:${i.symbol}:${i.exchange}`).join('|');useEffect(()=>{if(user)void refresh();},[itemKey,user?.id,recordsOwner,refreshRetry,recovery]);
 useEffect(()=>{if(demoMode)return;const timer=setInterval(()=>{if(!document.hidden)void refresh();},300000);return()=>clearInterval(timer);},[items,user?.id]);
 useEffect(()=>{let live=true;const timer=setTimeout(async()=>{if(!query.trim()){setResults([]);return;}try{const rows=demoMode?demoInstruments.filter(i=>`${i.symbol} ${i.name}`.toLowerCase().includes(query.toLowerCase())):await api.searchInstruments(query.trim());if(live)setResults(rows);}catch(err){if(live)setNotice(errorText(err,language));}},300);return()=>{live=false;clearTimeout(timer);};},[query]);
 async function applyBaselines(updates:api.BaselineUpdate[],bars:Record<string,Bar[]>,defaultDate:string|null){if(workLock.current)throw new Error('CONFLICT');workLock.current=true;const e=epoch.current;try{let saved:WatchItem[];
 if(demoMode){for(const u of updates)if(items.find(i=>i.id===u.id)?.revision!==u.revision)throw new Error('CONFLICT');saved=updates.map(u=>({...items.find(i=>i.id===u.id)!,...u,revision:u.revision+1,updated_at:new Date().toISOString()}));}
 else saved=await api.updateBaselines(updates,defaultDate);
 if(e!==epoch.current)return;setItems(p=>p.map(i=>saved.find(r=>r.id===i.id)??i));setHistories(p=>({...p,...bars}));if(defaultDate)setDate(defaultDate);setNotice(zh?'起始日期、起始价和收益曲线已更新。':'Start dates, prices and return curves updated.');
 }finally{workLock.current=false;}}
 async function add(item:Instrument){if(busy||workLock.current)return;workLock.current=true;setBusy(true);setResults([]);setQuery('');const e=epoch.current;try{if(items.some(i=>i.symbol===item.symbol&&i.exchange===item.exchange))return;
 const r=demoMode?{bars:demoBars(item,date),currency:item.currency,exchange:item.exchange}:await api.fetchHistory(item,date);if(r.currency!==item.currency||r.exchange!==item.exchange)throw new Error('IDENTITY_MISMATCH');const b=baselineFromBars(date,r.bars);const value:WatchInput={...item,id:crypto.randomUUID(),baseline_date:date,baseline_session:b.session,baseline_at:resolveLocal(`${date}T00:00:00`,item.timezone),baseline_timezone:item.timezone,baseline_price:b.price,alert_percent:'-30',notes:''};
 const saved=demoMode?{...value,user_id:'demo',revision:1,created_at:new Date().toISOString(),updated_at:new Date().toISOString()}:await api.saveWatch(value,user!.id);if(e!==epoch.current)return;setItems(p=>[...p,saved]);setHistories(p=>({...p,[saved.id]:b.bars}));if(demoMode)setQuotes(p=>({...p,[saved.id]:demoQuote(item)}));
 }catch(err){setNotice(errorText(err,language));}finally{workLock.current=false;setBusy(false);}}
 async function remove(item:WatchItem|Trade){
  if(busy||workLock.current)throw new Error('CONFLICT');
  workLock.current=true;const e=epoch.current;setBusy(true);
  try{
   if(!demoMode)await api.deleteRecord('baseline_at'in item?'watchlist':'trades',item.id,item.revision);
   if(e!==epoch.current)return;
   if('baseline_at'in item){
    removedIds.current.add(item.id);setItems(previous=>previous.filter(row=>row.id!==item.id));
    if(selected===item.id)setSelected(null);
    setQuotes(previous=>{const next={...previous};delete next[item.id];return next;});
    setHistories(previous=>{const next={...previous};delete next[item.id];return next;});
    setErrors(previous=>{const next={...previous};delete next[item.id];return next;});
   }else setTrades(previous=>previous.filter(row=>row.id!==item.id));
   setNotice(`${item.symbol} ${'baseline_at'in item?'已从自选列表删除。':'交易记录已删除。'}`);
  }finally{workLock.current=false;if(e===epoch.current)setBusy(false);}
 }

 async function saveTrade(value:WatchInput|TradeInput,revision?:number){if('baseline_at'in value)throw new Error('VALIDATION');const e=epoch.current;const saved=demoMode?{...value,user_id:'demo',revision:(revision??0)+1,created_at:new Date().toISOString(),updated_at:new Date().toISOString()}:await api.saveTrade(value,user!.id,revision);if(e===epoch.current)setTrades(p=>(revision===undefined?[saved,...p]:p.map(i=>i.id===saved.id?saved:i)).sort((a,b)=>b.occurred_at.localeCompare(a.occurred_at)));}
 async function exportData(){try{const data=demoMode?{version:1,exported_at:new Date().toISOString(),watchlist:items,trades}:await api.exportAll();await saveExportFile(data);}catch(err){setNotice(errorText(err,language));}}
 function net(item:WatchItem){return quotes[item.id]?percent(quotes[item.id].price,item.baseline_price):null;}function cls(value:string|null){return value===null||Number(value)===0?'zero':Number(value)>0?'up':'down';}
 const alerts=items.filter(i=>net(i)!==null&&new Decimal(net(i)!).lte(i.alert_percent)),workspace=demoMode||!!user&&!recovery;
 const latest=Object.values(quotes).map(q=>q.fetched_at).sort().at(-1),qs=Object.values(quotes),marketStatus=demoMode?'SNAPSHOT':qs.some(q=>q.market_open===true)?'LIVE':qs.length&&qs.every(q=>q.market_open===false)?'CLOSED':'--';
 const rows=[...items].sort((a,b)=>{const av=sort.key==='symbol'?a.symbol:sort.key==='price'?quotes[a.id]?.price:sort.key==='baseline'?a.baseline_price:net(a),bv=sort.key==='symbol'?b.symbol:sort.key==='price'?quotes[b.id]?.price:sort.key==='baseline'?b.baseline_price:net(b);if(av==null)return 1;if(bv==null)return-1;return(sort.key==='symbol'?av.localeCompare(bv):new Decimal(av).comparedTo(bv))*sort.dir;});
 return <div className="monitor-app notranslate" translate="no">{alerts.length>0&&workspace&&<div className="alert-bar" translate="no">*** WARNING: {alerts.map(i=>`${i.symbol} ${Number(net(i)).toFixed(1)}%`).join(' | ')} ***</div>}
 <header className="topbar"><a className="title" href="/">US EQUITY <span>MONITOR</span></a>{workspace&&<div className="top-controls"><label className="top-date">START <input aria-label={zh?'当前统一起始日期':'Current start date'} type="date" value={date} readOnly onClick={()=>setBaselineEdit(items)}/></label><button className="terminal-button" disabled={busy} onClick={()=>setBaselineEdit(items)}>{zh?'修改起始日期':'CHANGE START'}</button><div className="search-wrap"><input translate="no" aria-label={zh?'搜索股票':'Search stocks'} placeholder={zh?'搜索股票':'Search stocks...'} value={query} onChange={e=>setQuery(e.target.value)} maxLength={80}/>{results.length>0&&<div className="search-dropdown">{results.map(i=><button key={`${i.symbol}:${i.exchange}`} disabled={busy} onClick={()=>void add(i)} className="search-item"><span><b translate="no" className="notranslate">{i.symbol}</b> {i.name}</span><span>{items.some(row=>row.symbol===i.symbol&&row.exchange===i.exchange)?'added':'+ add'}</span></button>)}</div>}</div></div>}<div className="top-info">{workspace&&<><a className="section-jump" href="#volSection">VIX / VXN 分析</a><a className="section-jump" href="#detailSection">{zh?'明细表':'DETAIL'}</a></>}{workspace&&<><button className="terminal-button" disabled={busy||refreshing} onClick={()=>{setVolRefresh(value=>value+1);void refresh();}}>{busy||refreshing?'…':'↻'}</button><span>UPDATED <b>{latest?new Date(latest).toLocaleTimeString('en-GB'):'--'}</b> <span className={marketStatus==='LIVE'?'up':'zero'}>{marketStatus}</span></span></>}</div></header>
 {demoMode&&<div className="demo-banner">{zh?'演示 / 历史快照 · 2026-10-28 · 非实时行情 · 日期修改使用示例日开盘价':'DEMO / HISTORICAL SNAPSHOT · 2026-10-28 · SAMPLE DAILY OPENS · NOT LIVE'}<button onClick={()=>{const d=initialDemo();setItems(d.watchlist);setTrades(d.trades);setDate('2026-06-01');setHistories(Object.fromEntries(d.watchlist.map(i=>[i.id,demoBars(i)])));setQuotes(Object.fromEntries(d.watchlist.map(i=>[i.id,demoQuote(i)])));setNotice('');}}>RESET</button></div>}
 {restored&&workspace&&Object.values(quotes).some(quote=>quote.cached)&&<div className="prepared-note">已显示上次行情与曲线，正在后台更新；* 标记的价格为缓存，请核对报价时间。</div>}
 {notice&&<div className="notice" role="status">{notice}<button onClick={()=>setNotice('')}>×</button></div>}
 {!ready?<div className="loading">Loading…</div>:!configured&&!demoMode?<section className="setup-card"><h1>US EQUITY MONITOR</h1><p>{t('setupHint')}</p></section>:!workspace?<Auth language={language} recovery={recovery} onRecovered={()=>setRecovery(false)}/>:<>
 {tab==='monitor'?<><div className="main-grid"><section className="chart-panel"><div className="chart-toolbar"><span className="label">CUMULATIVE RETURN (% from baseline)</span><div className="tags"><button className={`tag ${selected===null?'on':''}`} onClick={()=>setSelected(null)}>ALL</button>{items.map(i=><button key={i.id} translate="no" className={`tag notranslate ${selected===i.id?'on':''}`} onClick={()=>setSelected(p=>p===i.id?null:i.id)}>{i.symbol}</button>)}</div></div><div className="chart-wrap"><MonitorChart items={items} histories={histories} selected={selected}/>{!Object.values(histories).some(b=>b.length>0)&&<div className="chart-empty">{zh?'添加股票或配置行情后显示累计收益曲线':'Add stocks and connect market data to view returns'}</div>}</div></section><aside className="watchlist"><div className="wl-header"><span>WATCHLIST</span><span>{items.length} stocks</span></div>{items.map(i=><div key={i.id} className={`wl-row ${selected===i.id?'active':''}`}><button translate="no" className="sym notranslate" onClick={()=>setSelected(p=>p===i.id?null:i.id)} title={i.name}>{i.symbol}</button><span className={`price ${quotes[i.id]?.stale?'quote-stale':''}`} title={errors[i.id]??(quotes[i.id]?quotes[i.id].source+' · '+quotes[i.id].as_of:'')}>{quotes[i.id]?`${i.currency==='USD'?'$':i.currency+' '}${new Decimal(quotes[i.id].price).toFixed(2)}`:errors[i.id]?'ERR':'--'}{quotes[i.id]?.stale&&<small className='stale-tag'>*</small>}</span><span className={`net ${cls(net(i))}`}>{net(i)!==null?`${Number(net(i))>0?'+':''}${Number(net(i)).toFixed(1)}%`:'--'}</span><button className="date-edit" aria-label={`${zh?'修改日期':'Start date'} ${i.symbol}`} title={`${i.baseline_date??date} / change date`} disabled={busy} onClick={()=>setBaselineEdit([i])}>◷</button><button className="rm" aria-label={`${t('remove')} ${i.symbol}`} disabled={busy} onClick={()=>setDeleteTarget(i)}>×</button></div>)}</aside></div>
 <VolatilityPanel prepared={preparedVolatility} onData={data=>setPreparedVolatility(previous=>({...previous,[data.name]:data}))} key={user?.id??'demo'} language={language} userId={user?.id??null} refreshToken={volRefresh}/>
 <section className="table-section" id="detailSection"><div className="label">DETAIL · CLICK HEADER TO SORT</div><div className="table-scroll"><table><thead><tr>{[['symbol','SYMBOL'],['price','LAST'],['','CHG%'],['baseline','BASELINE'],['','START DATE'],['net','NET']].map(([key,label],n)=><th key={n} onClick={()=>key&&setSort(s=>({key,dir:s.key===key?-s.dir:1}))}>{label}</th>)}<th/></tr></thead><tbody>{rows.map(i=><tr key={i.id} className={alerts.some(a=>a.id===i.id)?'alert-row':''}><td><div translate="no" className="stock-label notranslate"><span className="stock-dot" style={{background:colors[items.findIndex(x=>x.id===i.id)%colors.length]}}/>{i.symbol}</div></td><td>{quotes[i.id]?`${i.currency==='USD'?'$':i.currency+' '}${new Decimal(quotes[i.id].price).toFixed(2)}`:'--'}</td><td className={cls(quotes[i.id]?.change_percent??null)}>{signedPercent(quotes[i.id]?.change_percent??null)}</td><td>{i.baseline_price?new Decimal(i.baseline_price).toFixed(2):'--'}</td><td><button className="date-link" disabled={busy} onClick={()=>setBaselineEdit([i])}>{i.baseline_date??date}</button>{i.baseline_session&&i.baseline_session!==(i.baseline_date??date)&&<small> → {i.baseline_session}</small>}</td><td className={cls(net(i))}>{signedPercent(net(i))}</td><td><button className="rm" disabled={busy} aria-label={`${t('remove')} ${i.symbol} detail`} onClick={()=>setDeleteTarget(i)}>×</button></td></tr>)}</tbody></table></div></section></>:<section className="table-section journal-section"><div className="journal-heading"><span className="label">TRADING JOURNAL</span><button className="terminal-button" onClick={()=>setTradeEdit({})}>{t('addTrade')}</button></div><div className="table-scroll"><table><thead><tr><th>SYMBOL</th><th>SIDE</th><th>QTY</th><th>PRICE</th><th>FEES</th><th>TIME / ZONE</th><th/></tr></thead><tbody>{trades.map(i=><tr key={i.id}><td translate="no" className="notranslate">{i.symbol}</td><td>{i.side.toUpperCase()}</td><td>{i.quantity}</td><td>{i.price} {i.currency}</td><td>{i.fees}</td><td>{formatTime(i.occurred_at,i.record_timezone,language)}</td><td><button className="date-link" aria-label={`${t('edit')} ${i.symbol}`} onClick={()=>setTradeEdit({existing:i})}>{t('edit')}</button><button className="rm" disabled={busy} aria-label={`${t('remove')} ${i.symbol}`} onClick={()=>setDeleteTarget(i)}>×</button></td></tr>)}</tbody></table></div></section>}
 <footer className="footer-bar"><span>STOCK MONITOR · BASELINE {date} · ALERT -30%{!demoMode?' · 腾讯报价 / 新浪日线 · * 缓存或超过15分钟 · 日线复权口径由来源决定':''}</span><div><button onClick={()=>setTab('monitor')}>{zh?'行情监控':'MONITOR'}</button><button onClick={()=>setTab('journal')}>{t('journal')}</button><button onClick={()=>void exportData()}>{t('export')}</button>{!demoMode&&<button onClick={()=>{if(user)clearWorkspace(user.id);void supabase!.auth.signOut();}}>{t('signout')}</button>}</div></footer></>}
 {deleteTarget&&<DeleteDialog key={deleteTarget.id} item={deleteTarget} onClose={()=>setDeleteTarget(null)} onDelete={()=>remove(deleteTarget)}/>}
 {baselineEdit&&<BaselineDialog items={baselineEdit} defaultDate={date} language={language} onClose={()=>setBaselineEdit(null)} onApply={applyBaselines}/>}{tradeEdit&&<RecordDialog kind="trade" existing={tradeEdit.existing} zone="America/New_York" language={language} onClose={()=>setTradeEdit(null)} onSave={saveTrade}/>}
 </div>;
}
