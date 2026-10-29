import {useEffect,useRef} from 'react';
import Chart from 'chart.js/auto';
import type {Bar,WatchItem} from '../lib/types';
import {returnSeries} from '../lib/baseline';
export const colors=['#f87171','#fb923c','#fbbf24','#4ade80','#22d3ee','#60a5fa','#a78bfa','#f472b6','#2dd4bf','#facc15','#fff000','#ff5663','#00e09f','#ff86d4','#11cced','#96f000','#fc914e','#c475ff','#22ffd4'];
export function MonitorChart({items,histories,selected}:{items:WatchItem[];histories:Record<string,Bar[]>;selected:string|null}) {
 const canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  if(!canvas.current)return;
  const dates=Array.from(new Set(items.flatMap(item=>(histories[item.id]??[]).filter(b=>b.date>=(item.baseline_date??item.baseline_at.slice(0,10))).map(b=>b.date)))).sort();
  const chart=new Chart(canvas.current,{type:'line',data:{labels:dates,datasets:items.map((item,i)=>{
   const on=!selected||selected===item.id;
   return {label:item.symbol,data:returnSeries(item,histories[item.id]??[],dates),borderColor:on?colors[i%colors.length]:colors[i%colors.length]+'12',borderWidth:on?1.5:.5,pointRadius:0,pointHoverRadius:4,backgroundColor:'transparent',tension:.15,spanGaps:false,order:on?0:1};
  })},options:{responsive:true,maintainAspectRatio:false,animation:false,interaction:{mode:'nearest',intersect:false},plugins:{legend:{display:false},tooltip:{filter:item=>!selected||items[item.datasetIndex]?.id===selected,backgroundColor:'#000',borderColor:'#333',borderWidth:1,titleColor:'#fff',bodyColor:'#fff',titleFont:{size:10},bodyFont:{size:10},callbacks:{label:c=>` ${c.dataset.label} ${Number(c.parsed.y)>=0?'+':''}${c.parsed.y?.toFixed(2)}%`}}},scales:{x:{ticks:{color:'#555',maxTicksLimit:10,font:{size:8},callback:(_,index)=>dates[index]?.slice(5).replace('-','/')},grid:{color:'#111'}},y:{ticks:{color:'#555',font:{size:8},callback:value=>`${Number(value)>=0?'+':''}${value}%`},grid:{color:'#111'}}}}});
  return ()=>chart.destroy();
 },[items,histories,selected]);
 return <canvas ref={canvas} id="mainChart" role="img" aria-label="Cumulative return chart"/>;
}
export function MiniChart({bars}:{bars:Bar[]}){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{if(!ref.current)return;const chart=new Chart(ref.current,{type:'line',data:{labels:bars.map(b=>b.date),datasets:[{data:bars.map(b=>Number(b.close)),borderColor:'#4ade80',borderWidth:1,pointRadius:0,tension:.15}]},options:{responsive:true,maintainAspectRatio:false,animation:false,plugins:{legend:{display:false}},scales:{x:{display:false},y:{ticks:{color:'#444',font:{size:7}},grid:{color:'#111'}}}}});return()=>chart.destroy();},[bars]);
 return <canvas ref={ref}/>;
}
