import {useEffect,useRef,useState} from 'react';
import {fetchVolatility} from '../lib/api';
import {errorText} from '../lib/i18n';
import {percent,signedPercent} from '../lib/finance';
import type {Bar,Language,Volatility} from '../lib/types';
import snapshot from '../lib/volatility-snapshot.json';
import {demoMode} from '../lib/client';
import {MiniChart} from './MonitorChart';

const symbols=['VIX','VXN'] as const;
type Symbol=typeof symbols[number];
type State={data?:Volatility;loading:boolean;error?:unknown};
export function VolatilityPanel({language,userId,refreshToken,prepared={},onData}:{language:Language;userId:string|null;refreshToken:number;prepared?:Record<string,Volatility>;onData?:(data:Volatility)=>void}) {
 const zh=language==='zh';
 const [states,setStates]=useState<Partial<Record<Symbol,State>>>({});
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
 return <section className="vol-section" id="volSection"><div className="label">VOLATILITY INDEX · DAILY ANALYSIS</div><div className="vol-grid">{symbols.map(symbol=>{
  const state=states[symbol],data=state?.data??prepared[symbol],bars:Bar[]=demoMode?snapshot[symbol]:data?.bars??[],last=bars.at(-1),value=last?Number(last.close):null;
  return <article key={symbol} className="vol-card" aria-busy={state?.loading??false}>
   <div className="vol-head"><b translate="no" className="notranslate">{symbol}</b><strong>{value?.toFixed(2)??'--'}</strong></div>
   {state?.loading&&<p className="help" role="status">{zh?'正在加载官方日收盘数据…':'Loading official daily closes…'}</p>}
   {state?.error!==undefined&&<p className="help" role="status">{state.error instanceof Error&&state.error.message==='MARKET_UNAVAILABLE'?(zh?'官方指数服务暂不可用，请重新加载。':'Official index service is unavailable. Please reload.'):errorText(state.error,language)}{data&&(zh?' 保留上次数据，请核对下方日期。':' Previous data retained; check the date below.')}</p>}
   {value===null?!state?.loading&&!state?.error&&<p className="help">{zh?'暂无官方指数数据。':'Official index data is unavailable.'}</p>:<>
    <div className="vol-note">{value<20?zh?'平静':'CALM':value<30?zh?'波动升高':'ELEVATED':zh?'高度波动':'HIGH VOLATILITY'} · {zh?'日涨跌':'DAILY'} {signedPercent(percent(last!.close,bars.at(-2)?.close??null))} · {zh?'近5日':'5D'} {signedPercent(percent(last!.close,bars.at(-6)?.close??null))}</div>
    <div className="vol-meta">20D AVG {(bars.slice(-20).reduce((sum,bar)=>sum+Number(bar.close),0)/Math.min(20,bars.length)).toFixed(2)} · {demoMode?'Cboe official / snapshot':data?.source??'Cboe official / daily close'} · {last!.date}{data?.stale?(zh?' · 缓存／已过期':' · STALE'):''}</div>
    <div className="vol-chart"><MiniChart bars={bars}/></div>
   </>}
   {!demoMode&&<button className="terminal-button" disabled={state?.loading} onClick={()=>void load(symbol)} aria-label={zh?`重新加载 ${symbol}`:`Reload ${symbol}`}>{zh?'重新加载':'Reload'}</button>}
  </article>;
 })}</div></section>;
}
