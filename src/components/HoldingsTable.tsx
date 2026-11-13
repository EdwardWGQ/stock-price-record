import {useState} from 'react';
import Decimal from 'decimal.js';
import type {Instrument,Language} from '../lib/types';
import {type Holding,holdingTotals} from '../lib/holdings';
import {money,signedPercent} from '../lib/finance';
import {colors} from './MonitorChart';

type SortKey='symbol'|'price'|'quantity'|'averageCost'|'cost'|'marketValue'|'profit'|'returnPercent';
const tone=(value:string|null)=>value===null||new Decimal(value).isZero()?'zero':new Decimal(value).gt(0)?'up':'down';
export function HoldingsTable({holdings,busy,loading,language,onBuy,onJournal,quoteErrors={},refreshing=false,onRefresh}:{holdings:Holding[];busy:boolean;loading:boolean;language:Language;onBuy:(instrument:Instrument)=>void;onJournal:()=>void;quoteErrors?:Record<string,string|undefined>;refreshing?:boolean;onRefresh?:()=>void}) {
 const zh=language==='zh',[sort,setSort]=useState<{key:SortKey;dir:number}>({key:'returnPercent',dir:1});
 const value=(row:Holding,key:SortKey)=>key==='price'?row.quote?.price??null:row[key];
 const rows=[...holdings].sort((a,b)=>{
  const av=value(a,sort.key),bv=value(b,sort.key);
  if(av===null&&bv===null)return a.key.localeCompare(b.key);
  if(av===null)return 1;if(bv===null)return -1;
  return (sort.key==='symbol'?av.localeCompare(bv):new Decimal(av).comparedTo(bv))*sort.dir||a.key.localeCompare(b.key);
 });
 const cash=(value:string|null,currency:string)=>value===null?'—':money(value,currency,language);
 const signedCash=(value:string|null,currency:string)=>value===null?'—':`${new Decimal(value).gt(0)?'+':''}${money(value,currency,language)}`;
 const headings:[SortKey,string][]=[['symbol',zh?'股票':'Stock'],['price',zh?'最新价':'Last'],['quantity',zh?'持仓数量':'Shares'],['averageCost',zh?'平均成本':'Average cost'],['cost',zh?'持仓成本':'Book cost'],['marketValue',zh?'持仓市值':'Market value'],['profit',zh?'持仓盈亏':'Unrealized P&L'],['returnPercent',zh?'收益率':'Return']];
 return <section className="table-section holdings-section" id="detailSection" aria-labelledby="holdingsTitle">
  <div className="holdings-heading"><h2 id="holdingsTitle">{zh?'我的持仓收益':'My holding returns'}</h2><div><span>{zh?`${holdings.length} 只持仓`:`${holdings.length} positions`}</span>{onRefresh&&<button type="button" className="terminal-button" disabled={busy||refreshing} onClick={onRefresh}>{refreshing?(zh?'正在刷新报价…':'Refreshing quotes…'):(zh?'刷新持仓报价':'Refresh holding quotes')}</button>}<button type="button" className="terminal-button" onClick={onJournal}>{zh?'查看交易记录':'View trades'}</button></div></div>
  <p className="holdings-method">{zh?'按完整成交记录计算，买入手续费计入移动平均成本；显示当前持仓的未实现收益。':'Calculated from all recorded trades using moving average cost including buy fees. Returns show unrealized gains on current positions.'}</p>
  {!loading&&holdingTotals(holdings).map(total=><div className="holdings-summary" key={total.currency} aria-label={`${total.currency} ${zh?'持仓汇总':'holdings summary'}`}>
   <div><span>{zh?'持仓市值':'Market value'} · {total.currency}</span><strong>{cash(total.marketValue,total.currency)}</strong></div>
   <div><span>{zh?'持仓成本（含买入费用）':'Book cost including buy fees'}</span><strong>{cash(total.cost,total.currency)}</strong></div>
   <div><span>{zh?'持仓盈亏':'Unrealized P&L'}</span><strong className={tone(total.profit)}>{signedCash(total.profit,total.currency)}</strong></div>
   <div><span>{zh?'持仓收益率':'Return'}</span><strong className={tone(total.returnPercent)}>{signedPercent(total.returnPercent)}</strong></div>
   {(total.missingQuotes>0||total.incomplete>0)&&<p>{zh?`${total.missingQuotes>0?`${total.missingQuotes} 只持仓暂无可用估值；`:''}${total.incomplete>0?`${total.incomplete} 只持仓买卖记录不完整；`:''}相关汇总待数据补全。`:'Some quotes or trade records are missing; affected totals are unavailable.'}</p>}
  </div>)}
  {loading?<p className="holdings-empty" role="status">{zh?'正在加载完整成交记录…':'Loading all trades…'}</p>:holdings.length?<div className="table-scroll" role="region" aria-label={zh?'持仓收益明细，可横向滚动':'Holding returns, scroll horizontally'} tabIndex={0}><table><thead><tr>{headings.map(([key,label])=><th key={key} aria-sort={sort.key===key?sort.dir===1?'ascending':'descending':'none'}><button type="button" onClick={()=>setSort(previous=>({key,dir:previous.key===key?-previous.dir:1}))}>{label}{sort.key===key?<span aria-hidden="true">{sort.dir===1?' ↑':' ↓'}</span>:null}</button></th>)}<th>{zh?'操作':'Actions'}</th></tr></thead><tbody>{rows.map(row=><tr key={row.key}>
   <td><div translate="no" className="stock-label notranslate"><span className="stock-dot" style={{background:colors[holdings.findIndex(item=>item.key===row.key)%colors.length]}}/>{row.symbol}</div><small className="holding-market">{row.exchange} · {row.currency}</small>{row.incomplete&&<small className="holding-incomplete">{zh?'买卖记录不完整':'Incomplete trade records'}</small>}</td>
   <td title={row.quote?`${row.quote.source} · ${row.quote.as_of}`:quoteErrors[row.key]}>{cash(row.quote?.price??null,row.currency)}{(row.quote?.stale||row.quote?.cached)&&<small className="stale-tag">*</small>}{!row.quote&&<small className="holding-quote-status">{refreshing?(zh?'报价更新中…':'Updating quote…'):quoteErrors[row.key]??(zh?'暂无报价':'Quote unavailable')}</small>}</td>
   <td>{row.quantity}</td><td>{cash(row.averageCost,row.currency)}</td><td>{cash(row.cost,row.currency)}</td><td>{cash(row.marketValue,row.currency)}</td><td className={tone(row.profit)}>{signedCash(row.profit,row.currency)}</td><td className={tone(row.returnPercent)}>{signedPercent(row.returnPercent)}</td>
   <td><button type="button" className="date-link detail-buy-button" disabled={busy} aria-label={`${zh?'追加买入 / 定投':'Additional buy / DCA'} ${row.symbol} detail`} onClick={()=>onBuy(row)}>{zh?'追加买入':'Buy again'}</button></td>
  </tr>)}</tbody></table></div>:<div className="holdings-empty"><p>{zh?'还没有持仓记录。添加或导入实际买入成交后，这里会显示持仓收益。':'No open positions. Record or import purchases to see your holding returns.'}</p><button type="button" className="terminal-button" onClick={onJournal}>{zh?'添加 / 导入成交':'Record / import trades'}</button></div>}
 </section>;
}
