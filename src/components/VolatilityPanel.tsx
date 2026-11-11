import {useEffect,useRef,useState} from 'react';
import {ArrowDownRight,ArrowUpRight,CalendarDays,Minus,RefreshCw} from 'lucide-react';
import {fetchVolatility} from '../lib/api';
import {errorText} from '../lib/i18n';
import type {Language,Volatility} from '../lib/types';
import snapshot from '../lib/volatility-snapshot.json';
import {demoMode} from '../lib/client';
import {MiniChart} from './MonitorChart';
import {MarketSentiment} from './MarketSentiment';
import {IndexSentiment} from './IndexSentiment';
import {sentimentMetrics,type SentimentInput} from '../lib/market-sentiment';

const symbols=['VIX','VXN'] as const;
type Symbol=typeof symbols[number];
type State={data?:Volatility;loading:boolean;error?:unknown};
const percentLabel=(value:number|null)=>value===null?'—':`${value>0?'+':''}${value.toFixed(2)}%`;

function ChangeValue({value}:{value:number|null}) {
 const Icon=value===null||value===0?Minus:value<0?ArrowDownRight:ArrowUpRight;
 return <dd className={value===null||value===0?'vol-change-neutral':value<0?'vol-change-easing':'vol-change-rising'}><Icon size={14} aria-hidden="true"/>{percentLabel(value)}</dd>;
}

export function VolatilityPanel({language,userId,refreshToken,prepared={},onData}:{language:Language;userId:string|null;refreshToken:number;prepared?:Record<string,Volatility>;onData?:(data:Volatility)=>void}) {
 const zh=language==='zh';
 const [states,setStates]=useState<Partial<Record<Symbol,State>>>({});
 const [ranges,setRanges]=useState<Record<Symbol,'20'|'all'>>({VIX:'all',VXN:'all'});
 const [mobileIndex,setMobileIndex]=useState<Symbol>('VIX');
 const generation=useRef(0),pending=useRef(new Set<Symbol>());
 async function load(symbol:Symbol,current=generation.current) {
  if(demoMode||!userId||pending.current.has(symbol))return;
  pending.current.add(symbol);
  setStates(previous=>({...previous,[symbol]:{...previous[symbol],loading:true,error:undefined}}));
  try {
   const data=await fetchVolatility(symbol);
   if(current===generation.current){setStates(previous=>({...previous,[symbol]:{data,loading:false}}));onData?.(data);}
  }catch(error) {
   if(current===generation.current)setStates(previous=>({...previous,[symbol]:{data:previous[symbol]?.data?{...previous[symbol]!.data!,stale:true}:undefined,loading:false,error}}));
  }finally {if(current===generation.current)pending.current.delete(symbol);}
 }
 useEffect(()=>{
  const current=++generation.current;pending.current.clear();setStates({});
  if(!demoMode&&userId) {
   for(const symbol of symbols)void load(symbol,current);
   const timer=setInterval(()=>{if(!document.hidden)for(const symbol of symbols)void load(symbol,current);},300000);
   return ()=>{clearInterval(timer);generation.current++;pending.current.clear();};
  }
 },[userId]);
 useEffect(()=>{if(refreshToken)for(const symbol of symbols)void load(symbol);},[refreshToken]);
 const sentimentData=(symbol:Symbol):SentimentInput|undefined=>{
  if(demoMode)return {bars:snapshot[symbol]};
  const data=states[symbol]?.data??prepared[symbol];
  return data&&states[symbol]?.error!==undefined?{...data,stale:true}:data;
 };
 const loading=symbols.some(symbol=>states[symbol]?.loading);
 const dates=symbols.map(symbol=>sentimentMetrics(sentimentData(symbol))?.date);
 const closingDate=dates[0]&&dates[0]===dates[1]?dates[0]:null;
 return <section className="vol-section vol-dashboard" id="volSection" aria-label={zh?'市场情绪与波动率':'Market sentiment and volatility'}>
  <header className="vol-dashboard-header">
   <div><div className="vol-eyebrow">U.S. EQUITIES / MARKET ANALYSIS</div><h2>{zh?'美股市场分析':'U.S. market analysis'}</h2><p>{zh?'读懂市场情绪，观察大盘与科技权重板块的波动。':'Understand sentiment and follow volatility across the broad market and technology-heavy equities.'}</p></div>
   <div className="vol-dashboard-actions"><span className="vol-data-date"><CalendarDays size={14} aria-hidden="true"/>{zh?'日收盘':'DAILY CLOSE'}{closingDate?` · ${closingDate}`:''}{demoMode?(zh?' · 历史快照':' · SNAPSHOT'):''}</span>{!demoMode&&<button type="button" className="vol-refresh-all" aria-label={zh?'刷新两个指数':'Refresh both indexes'} disabled={loading||!userId} onClick={()=>{for(const symbol of symbols)void load(symbol);}}><RefreshCw size={15} className={loading?'vol-spinning':''} aria-hidden="true"/>{loading?(zh?'正在刷新':'Refreshing'):(zh?'刷新数据':'Refresh data')}</button>}</div>
  </header>
  <MarketSentiment language={language} vix={sentimentData('VIX')} vxn={sentimentData('VXN')} demo={demoMode} loading={loading}/>
  <div className="vol-mobile-tabs" role="group" aria-label={zh?'选择查看的指数':'Choose an index'}>{symbols.map(symbol=><button type="button" key={symbol} aria-pressed={mobileIndex===symbol} aria-controls={`volCard${symbol}`} onClick={()=>setMobileIndex(symbol)}><b translate="no" className="notranslate">{symbol}</b><span>{symbol==='VIX'?(zh?'美国大盘':'Broad market'):(zh?'科技权重板块':'Technology-heavy')}</span></button>)}</div>
  <div className="vol-grid">{symbols.map(symbol=>{
   const state=states[symbol],data=state?.data??prepared[symbol],input=sentimentData(symbol),bars=input?.bars??[],metrics=sentimentMetrics(input);
   const value=metrics?.value??null,period=ranges[symbol]==='20'?20:null,first=period?bars.slice(-period)[0]:bars[0];
   const scope=symbol==='VIX'?(zh?'标普 500 · 美国大盘':'S&P 500 · Broad U.S. market'):(zh?'纳指 100 · 科技权重板块':'Nasdaq-100 · Technology-heavy market');
   return <article key={symbol} id={`volCard${symbol}`} className={`vol-card vol-card-${symbol.toLowerCase()}${mobileIndex===symbol?' vol-card-active':''}`} aria-busy={state?.loading??false}>
    <header className="vol-head"><div className="vol-identity"><span className="vol-symbol-marker" aria-hidden="true"/><div><b translate="no" className="notranslate">{symbol}</b><p className="vol-scope">{scope}</p></div></div>{!demoMode&&<button type="button" className="vol-reload" disabled={state?.loading||!userId} onClick={()=>void load(symbol)} aria-label={zh?`重新加载 ${symbol}`:`Reload ${symbol}`} title={zh?`重新加载 ${symbol}`:`Reload ${symbol}`}><RefreshCw size={16} className={state?.loading?'vol-spinning':''} aria-hidden="true"/></button>}</header>
    <div className="vol-price-line"><strong>{value?.toFixed(2)??'--'}</strong><span>{zh?'波动率指数':'VOLATILITY INDEX'}</span>{input?.stale&&<span className="vol-stale-chip">{zh?'缓存／已过期':'STALE'}</span>}</div>
    {state?.loading&&<p className="vol-request-note" role="status">{zh?'正在加载官方日收盘数据…':'Loading official daily closes…'}</p>}
    {state?.error!==undefined&&<p className="vol-request-note vol-request-error" role="status">{state.error instanceof Error&&state.error.message==='MARKET_UNAVAILABLE'?(zh?'官方指数服务暂不可用，请重新加载。':'Official index service is unavailable. Please reload.'):errorText(state.error,language)}{data&&(zh?' 保留上次数据，请核对下方日期。':' Previous data retained; check the date below.')}</p>}
    {!metrics&&!state?.loading&&!state?.error&&<p className="vol-request-note">{zh?'暂无官方指数数据。':'Official index data is unavailable.'}</p>}
    <dl className="vol-metrics"><div><dt>{zh?'日变化':'Daily change'}</dt><ChangeValue value={metrics?.daily??null}/></div><div><dt>{zh?'近 5 日':'Five sessions'}</dt><ChangeValue value={metrics?.fiveDay??null}/></div><div><dt>{zh?'20 日均值':'20-session avg.'}</dt><dd>{metrics?.average20?.toFixed(2)??'—'}</dd></div></dl>
    <div className="vol-chart-toolbar"><span><i className="vol-average-key" aria-hidden="true"/>{zh?'虚线：20 日均值':'Dashed: 20-session avg.'}</span><div className="vol-range-controls" role="group" aria-label={zh?`${symbol} 图表范围`:`${symbol} chart range`}>{(['20','all'] as const).map(range=><button type="button" key={range} aria-pressed={ranges[symbol]===range} onClick={()=>setRanges(previous=>({...previous,[symbol]:range}))}>{range==='20'?(zh?'近 20 日':'20 sessions'):(zh?'全部':'All')}</button>)}</div></div>
    <div className="vol-chart">{metrics?<MiniChart bars={bars} period={period} average={metrics.average20} label={symbol} color={symbol==='VIX'?'#56c9ad':'#9b9eff'} language={language}/>:<div className="vol-chart-placeholder">{zh?'等待指数数据':'Awaiting index data'}</div>}</div>
    <div className="vol-chart-caption"><span>{first?.date&&metrics?`${first.date.slice(5).replace('-','/')} — ${metrics.date.slice(5).replace('-','/')}`:'—'}</span><span>{zh?'轻触或悬停查看数值':'Tap or hover to inspect'}</span></div>
    <IndexSentiment symbol={symbol} language={language} data={input} demo={demoMode} loading={state?.loading??false}/>
    <footer className="vol-card-footer"><span>{demoMode?(zh?'Cboe 官方 · 历史快照':'Cboe official · snapshot'):data?.source??'Cboe official / daily close'}</span><span>{metrics?.date??'—'}</span></footer>
   </article>;
  })}</div>
 </section>;
}
