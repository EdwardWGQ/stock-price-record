import {Calculator,Info} from 'lucide-react';
import type {ChiefFeeResult,ChiefChannel,SecScope,FeeRounding} from '../lib/chief-fees';
import {chiefStockFeeSchedule} from '../lib/chief-fees';

export function ChiefFeeBreakdown({result,error,side,channel,secScope,rounding,onChannel,onSecScope,onRounding}:{
 result:ChiefFeeResult|null;error?:string;side:'buy'|'sell';channel:ChiefChannel;secScope:SecScope;rounding:FeeRounding;
 onChannel:(value:ChiefChannel)=>void;onSecScope:(value:SecScope)=>void;onRounding:(value:FeeRounding)=>void;
}) {
 const schedule=chiefStockFeeSchedule;
 const rows=[['commission','交易佣金',channel==='online'?'网交易 0 佣金':'每股 $0.03，最低 $20'],['platform','平台费',channel==='online'?'每股 $0.008，最低 $0.99':'电话交易免平台费'],['clearing','清算费','每股 $0.003，最低 $0.01'],['sec','证监会费（SEC）','成交额 × 0.00206%，最低 $0.01'],['finra','FINRA 交易活动费','2026-10-01 至 2026-12-31 临时豁免']] as const;
 return <section className="chief-fee-panel" aria-label="致富手续费估算">
  <header><span><Calculator size={16} aria-hidden="true"/>致富美股手续费</span><small>单笔估算 · USD</small></header>
  <div className="chief-fee-channel" role="group" aria-label="致富交易方式"><button type="button" aria-pressed={channel==='online'} onClick={()=>onChannel('online')}>App／网上交易 · 0 佣</button><button type="button" aria-pressed={channel==='phone'} onClick={()=>onChannel('phone')}>电话交易</button></div>
  {result?<><dl className="chief-fee-lines">{rows.map(([key,title,note])=><div key={key}><dt>{title}<small>{note}</small></dt><dd>${result[key]}</dd></div>)}</dl><div className="chief-fee-total"><span>预计手续费合计</span><strong data-testid="chief-fee-total">${result.total}</strong></div><p className="chief-fee-date">美东成交日期 {result.tradeDate} · 已计算各项最低收费和上限</p></>:<p className="chief-fee-message" role="status">{error??'填写股数、成交价和成交日期后自动计算。'}</p>}
  <details className="chief-fee-settings"><summary><Info size={14} aria-hidden="true"/>收费口径与调整</summary><div>
   <label>证监会费收取方向<select aria-label="证监会费收取方向" value={secScope} onChange={event=>onSecScope(event.target.value as SecScope)}><option value="sell">仅卖出（默认）</option><option value="both">买入和卖出（按实际结单）</option></select></label>
   <label>各项费用取整<select aria-label="各项费用取整" value={rounding} onChange={event=>onRounding(event.target.value as FeeRounding)}><option value="nearest">四舍五入到美分</option><option value="up">分别向上取整到美分</option></select></label>
   <p>你提供的收费表未注明 SEC 收取方向；默认按卖出计算，可按致富结单调整。{side==='buy'&&secScope==='sell'?'当前买入未计 SEC。':''}取整口径也可调整，最终以结单为准。</p>
   <p>平台费和清算费各自上限为成交额的 3%；最低收费优先。买卖分开计费，不合单。本估算仅适用于普通美股／ETF 单笔交易，不包括月供、期权、融资利息、ADR 托管费、汇兑等费用。</p>
   <p>App 0 佣方案按你提供的表计算；账户资格或经纪议价收费不同，请改为手动填写。当前表的适用估算区间：{schedule.validFrom} 至 {schedule.validThrough}，核对日期 {schedule.verifiedOn}。</p>
   <a href={schedule.source} target="_blank" rel="noreferrer">致富官方美股收费</a><a href={schedule.detailedSource} target="_blank" rel="noreferrer">完整收费 PDF</a><a href={schedule.secSource} target="_blank" rel="noreferrer">SEC 费率说明</a>
  </div></details>
 </section>;
}
