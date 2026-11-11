import {useEffect,useRef} from 'react';
import Chart from 'chart.js/auto';
import Decimal from 'decimal.js';
import type {Bar,WatchItem} from '../lib/types';
import {returnSeries} from '../lib/baseline';
export const colors=['#f87171','#fb923c','#fbbf24','#4ade80','#22d3ee','#60a5fa','#a78bfa','#f472b6','#2dd4bf','#facc15','#fff000','#ff5663','#00e09f','#ff86d4','#11cced','#96f000','#fc914e','#c475ff','#22ffd4'];
export function MonitorChart({items,histories,selected}:{items:WatchItem[];histories:Record<string,Bar[]>;selected:string|null}) {
 const canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  if(!canvas.current)return;
  const dates=Array.from(new Set(items.flatMap(item=>(histories[item.id]??[]).filter(b=>b.date>=(item.baseline_date??item.baseline_at.slice(0,10))).map(b=>b.date)))).sort();
  // Look up prices by the shared chart date, never by a stock's bar index.
  const barsByDate=items.map(item=>new Map((histories[item.id]??[]).map(bar=>[bar.date,bar])));
  const chart=new Chart(canvas.current,{type:'line',data:{labels:dates,datasets:items.map((item,i)=>{
   const on=!selected||selected===item.id;
   return {label:item.symbol,data:returnSeries(item,histories[item.id]??[],dates),borderColor:on?colors[i%colors.length]:colors[i%colors.length]+'12',borderWidth:on?1.5:.5,pointRadius:0,pointHoverRadius:4,backgroundColor:'transparent',tension:.15,spanGaps:false,order:on?0:1};
  })},options:{responsive:true,maintainAspectRatio:false,animation:false,interaction:{mode:'nearest',intersect:false},plugins:{legend:{display:false},tooltip:{filter:item=>!selected||items[item.datasetIndex]?.id===selected,backgroundColor:'#000',borderColor:'#333',borderWidth:1,titleColor:'#fff',bodyColor:'#fff',titleFont:{size:10},bodyFont:{size:10},callbacks:{label:c=>{
   const item=items[c.datasetIndex],bar=barsByDate[c.datasetIndex]?.get(dates[c.dataIndex]);
   const price=bar?`${item.currency==='USD'?'$':item.currency+' '}${new Decimal(bar.close).toFixed(2)}`:'--';
   return ` ${c.dataset.label} ${price} (收盘)  ${Number(c.parsed.y)>=0?'+':''}${c.parsed.y?.toFixed(2)}%`;
  }}}},scales:{x:{ticks:{color:'#555',maxTicksLimit:10,font:{size:8},callback:(_,index)=>dates[index]?.slice(5).replace('-','/')},grid:{color:'#111'}},y:{ticks:{color:'#555',font:{size:8},callback:value=>`${Number(value)>=0?'+':''}${value}%`},grid:{color:'#111'}}}}});
  return ()=>chart.destroy();
 },[items,histories,selected]);
 return <canvas ref={canvas} id="mainChart" role="img" aria-label="Cumulative return chart"/>;
}
export function MiniChart({bars,period=null,average=null,label='Index',color='#56c9ad',language='zh'}:{bars:Bar[];period?:number|null;average?:number|null;label?:string;color?:string;language?:string}){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  if(!ref.current)return;
  const shown=period?bars.slice(-period):bars,dates=shown.map(bar=>bar.date);
  const chart=new Chart(ref.current,{type:'line',data:{labels:dates,datasets:[{label,data:shown.map(bar=>Number(bar.close)),borderColor:color,backgroundColor:color+'12',fill:true,borderWidth:2,pointRadius:0,pointHoverRadius:4,pointHoverBackgroundColor:color,tension:.18},...(average===null?[]:[{label:'20D AVG',data:shown.map(()=>average),borderColor:'#667183',borderDash:[4,4],borderWidth:1,pointRadius:0,pointHoverRadius:0,fill:false}])]},options:{responsive:true,maintainAspectRatio:false,animation:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:false},tooltip:{filter:item=>item.datasetIndex===0,displayColors:false,backgroundColor:'#171e29',borderColor:'#3a4556',borderWidth:1,cornerRadius:8,padding:10,titleColor:'#f0f3f8',bodyColor:color,titleFont:{size:11},bodyFont:{size:12},callbacks:{title:items=>dates[items[0]?.dataIndex]??'',label:context=>`${label}  ${context.parsed.y?.toFixed(2)}`,afterBody:()=>average===null?'':`${language==='zh'?'20 日均值':'20-session average'}  ${average.toFixed(2)}`}}},scales:{x:{ticks:{color:'#737f92',font:{size:10},maxTicksLimit:5,maxRotation:0,callback:(_,index)=>dates[index]?.slice(5).replace('-','/')},grid:{display:false},border:{display:false}},y:{ticks:{color:'#737f92',font:{size:10},maxTicksLimit:4,padding:8},grid:{color:'#202936'},border:{display:false}}}}});
  return()=>chart.destroy();
 },[bars,period,average,label,color,language]);
 return <canvas ref={ref} role="img" aria-label={`${label} ${language==='zh'?'波动率走势图':'volatility history'}`}/>;
}
