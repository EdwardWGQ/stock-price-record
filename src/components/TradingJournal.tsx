import {useState} from 'react';
import type {Instrument,Trade,Language} from '../lib/types';
import {translator} from '../lib/i18n';
import {formatTime} from '../lib/time';
import {instrumentKey} from '../lib/trade-instruments';

export function TradingJournal({trades,instruments,busy,language,onAdd,onBuy,onEdit,onDelete,onImport,onFees}:{
 trades:Trade[];instruments:Instrument[];busy:boolean;language:Language;
 onAdd:()=>void;onBuy:(instrument?:Instrument)=>void;onEdit:(trade:Trade)=>void;onDelete:(trade:Trade)=>void;onImport:()=>void;onFees:()=>void;
}) {
 const t=translator(language),[filter,setFilter]=useState('');
 const selected=instruments.find(instrument=>instrumentKey(instrument)===filter);
 const visible=[...(selected?trades.filter(trade=>instrumentKey(trade)===filter):trades)].sort((a,b)=>new Date(b.occurred_at).getTime()-new Date(a.occurred_at).getTime()||a.id.localeCompare(b.id));
 return <section className="table-section journal-section">
  <div className="journal-heading"><span className="label">TRADING JOURNAL</span><div className="journal-actions">
   <button className="terminal-button journal-buy-button" disabled={busy||!instruments.length} onClick={()=>onBuy(selected)}>{t('additionalBuy')}</button>
   <button className="terminal-button" onClick={onFees}>致富手续费计算器</button><button className="terminal-button" onClick={onImport}>致富成交导入</button><button className="terminal-button" onClick={onAdd}>{t('addTrade')}</button>
  </div></div>
  <div className="journal-filter"><label>{t('tradeStockFilter')}<select aria-label={t('tradeStockFilter')} value={selected?filter:''} onChange={event=>setFilter(event.target.value)}><option value="">{t('allTradeStocks')}</option>{instruments.map(instrument=><option value={instrumentKey(instrument)} key={instrumentKey(instrument)}>{instrument.symbol} · {instrument.exchange} · {instrument.currency}</option>)}</select></label><p className="help">{language==='zh'?`已加载记录中显示 ${visible.length} 笔，买入 ${visible.filter(trade=>trade.side==='buy').length} 笔。每次追加买入单独保存成交时间。`:`Showing ${visible.length} loaded records, including ${visible.filter(trade=>trade.side==='buy').length} buys. Each purchase keeps its own execution time.`}</p></div>
  <div className="table-scroll"><table><thead><tr><th>SYMBOL</th><th>SIDE</th><th>QTY</th><th>PRICE</th><th>FEES</th><th>TIME / ZONE</th><th/></tr></thead><tbody>{visible.map(trade=><tr key={trade.id}>
   <td translate="no" className="notranslate">{trade.symbol}{trade.notes.startsWith('[CHIEF-IMPORT-v1]')&&<span className="broker-source">致富导入</span>}</td><td>{trade.side.toUpperCase()}</td><td>{trade.quantity}</td><td>{trade.price} {trade.currency}</td><td>{trade.fees}</td><td>{formatTime(trade.occurred_at,trade.record_timezone,language)}<small className="journal-timezone">{trade.record_timezone}</small></td>
   <td><div className="journal-row-actions"><button className="date-link" disabled={busy} aria-label={`${t('additionalBuy')} ${trade.symbol} ${trade.exchange}`} onClick={()=>onBuy(trade)}>{t('buyAgain')}</button><button className="date-link" disabled={busy} aria-label={`${t('edit')} ${trade.symbol}`} onClick={()=>onEdit(trade)}>{t('edit')}</button><button className="rm" disabled={busy} aria-label={`${t('remove')} ${trade.symbol}`} onClick={()=>onDelete(trade)}>×</button></div></td>
  </tr>)}</tbody></table></div>
  {!visible.length&&<p className="help journal-empty">{selected?t('noStockTrades'):t('journalEmptyHint')}</p>}
 </section>;
}
