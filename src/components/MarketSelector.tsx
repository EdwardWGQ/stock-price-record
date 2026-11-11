import {useEffect,useRef,useState} from 'react';
import {Check,ChevronDown,MoveUpRight} from 'lucide-react';
import {markets,activeMarket} from '../lib/markets';
import type {Language} from '../lib/types';

export function MarketSelector({language}:{language:Language}) {
 const zh=language==='zh',root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),first=useRef<HTMLButtonElement>(null);
 const [open,setOpen]=useState(false);
 useEffect(()=>{
  if(!open)return;
  first.current?.focus();
  const dismiss=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);trigger.current?.focus();}};
  document.addEventListener('pointerdown',dismiss);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',escape);};
 },[open]);
 return <div className="market-selector" ref={root} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setOpen(false);}}>
  <button ref={trigger} type="button" className="market-selector-trigger" aria-label={zh?'选择市场，当前美股':'Choose market, currently U.S. equities'} aria-expanded={open} aria-controls="marketSelectorPanel" onClick={()=>setOpen(value=>!value)} onKeyDown={event=>{if(event.key==='ArrowDown'){event.preventDefault();setOpen(true);}}}><span className="market-code">{activeMarket.code}</span><span>{zh?activeMarket.name:activeMarket.english}</span><ChevronDown size={14} aria-hidden="true"/></button>
  {open&&<div id="marketSelectorPanel" className="market-selector-panel" role="region" aria-label={zh?'市场选择':'Market selection'}><div className="market-selector-heading">{zh?'选择你的市场':'Choose your market'}<MoveUpRight size={14} aria-hidden="true"/></div>{markets.map(market=><button key={market.id} ref={market.available?first:undefined} type="button" className={`market-choice${market.available?' market-choice-current':''}`} disabled={!market.available} onClick={()=>{setOpen(false);trigger.current?.focus();}}><span className={`market-choice-code market-choice-${market.id}`}>{market.code}</span><span className="market-choice-name"><b>{zh?market.name:market.english}</b><small>{zh?market.monitorLabel:market.code}</small></span><span className="market-choice-state">{market.available?<Check size={17} aria-label={zh?'当前市场':'Current market'}/>:zh?'筹备中':'Planned'}</span></button>)}<p>{zh?'目前开放美股监测与市场分析。':'U.S. monitoring and market analysis are currently available.'}</p></div>}
 </div>;
}
