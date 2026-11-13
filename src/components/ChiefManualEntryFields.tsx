import {Plus,Trash2} from 'lucide-react';
import type {ChiefManualEntry} from '../lib/broker-import';
import {resolveChiefManualDraft,type ChiefManualDraft} from '../lib/chief-manual-fees';
import {ChiefFeeBreakdown} from './ChiefFeeBreakdown';

export function newChiefManualDraft(previous?:ChiefManualEntry):ChiefManualDraft {
 return {key:crypto.randomUUID(),feeMode:'chief',channel:'online',secScope:'sell',rounding:'nearest',entry:{reference:'',symbol:'',name:'',exchange:previous?.exchange??'NASDAQ',currency:'USD',side:'buy',quantity:'',price:'',fees:'',occurred_at:'',record_timezone:previous?.record_timezone??'Asia/Hong_Kong',notes:''}};
}

export function ChiefManualEntryFields({drafts,onChange}:{drafts:ChiefManualDraft[];onChange:(drafts:ChiefManualDraft[])=>void}) {
 function update(key:string,field:keyof ChiefManualEntry,value:string){onChange(drafts.map(draft=>draft.key===key?{...draft,entry:{...draft.entry,[field]:value}}:draft));}
 function configure(key:string,settings:Partial<Pick<ChiefManualDraft,'feeMode'|'channel'|'secScope'|'rounding'>>){onChange(drafts.map(draft=>{
  if(draft.key!==key)return draft;
  const estimate=settings.feeMode==='manual'?resolveChiefManualDraft(draft).estimate:null;
  return {...draft,...settings,entry:estimate?{...draft.entry,fees:estimate.total}:draft.entry};
 }));}
 return <div className="broker-manual-entries">
  <p className="help">逐笔填写实际成交，每次最多 200 条。金额以美元（USD）计；手续费默认按致富收费表自动估算，可切换为手动填写实际费用。</p>
  {drafts.map((draft,index)=>{const {key,feeMode}=draft,{entry,estimate,error}=resolveChiefManualDraft(draft);return <section className="broker-manual-entry" key={key} aria-label={`第 ${index+1} 笔成交`}>
   <div className="broker-manual-heading"><h3>第 {index+1} 笔成交 <small>USD · 美股</small></h3>{drafts.length>1&&<button type="button" className="secondary" aria-label={`删除第 ${index+1} 笔成交`} onClick={()=>onChange(drafts.filter(draft=>draft.key!==key))}><Trash2 size={14} aria-hidden="true"/>删除</button>}</div>
   <div className="form-grid">
    <label className="span-two">手续费计算方式<select aria-label="手续费计算方式" value={feeMode} onChange={event=>configure(key,{feeMode:event.target.value as ChiefManualDraft['feeMode']})}><option value="chief">致富美股 · 按收费表自动估算</option><option value="manual">手动填写实际手续费</option></select></label>
    <label>成交编号<input required maxLength={100} value={entry.reference} placeholder="每笔成交的独立编号" onChange={event=>update(key,'reference',event.target.value)}/></label>
    <label>股票代码<input required maxLength={24} value={entry.symbol} placeholder="例如：AAPL" autoCapitalize="characters" onChange={event=>update(key,'symbol',event.target.value)}/></label>
    <label>公司名称<input required maxLength={160} value={entry.name} placeholder="例如：Apple" onChange={event=>update(key,'name',event.target.value)}/></label>
    <label>交易所<select aria-label="交易所" value={entry.exchange} onChange={event=>update(key,'exchange',event.target.value)}><option value="NASDAQ">NASDAQ</option><option value="NYSE">NYSE</option><option value="AMEX">AMEX</option><option value="ARCA">ARCA</option><option value="BATS">BATS</option><option value="OTC">OTC</option></select></label>
    <label>交易方向<select aria-label="交易方向" value={entry.side} onChange={event=>update(key,'side',event.target.value)}><option value="buy">买入</option><option value="sell">卖出</option></select></label>
    <label>数量<input required inputMode="decimal" value={entry.quantity} placeholder="实际成交股数" onChange={event=>update(key,'quantity',event.target.value)}/></label>
    <label>成交价格（USD）<input required inputMode="decimal" value={entry.price} placeholder="每股成交价格" onChange={event=>update(key,'price',event.target.value)}/></label>
    <label>手续费（USD）<input required inputMode="decimal" readOnly={feeMode==='chief'} value={entry.fees} placeholder={feeMode==='chief'?'填写数量、价格和时间后自动填入':'填写实际费用，可填 0'} onChange={event=>update(key,'fees',event.target.value)}/></label>
    <label>成交时间<input required type="datetime-local" step="1" value={entry.occurred_at} onChange={event=>update(key,'occurred_at',event.target.value)}/></label>
    <label>记录时区<select aria-label="记录时区" value={entry.record_timezone} onChange={event=>update(key,'record_timezone',event.target.value)}><option value="Asia/Hong_Kong">香港时间 · Asia/Hong_Kong</option><option value="Asia/Shanghai">北京时间 · Asia/Shanghai</option><option value="America/New_York">美东时间 · America/New_York</option><option value="UTC">UTC</option></select></label>
    <label className="span-two">备注（选填）<textarea rows={2} maxLength={1800} value={entry.notes} placeholder="补充这笔成交的说明" onChange={event=>update(key,'notes',event.target.value)}/></label>
   </div>
   {feeMode==='chief'?<><p className="help" role="status">{estimate?`已自动估算 · ${draft.channel==='online'?'App／网上交易':'电话交易'} · 美东成交日期 ${estimate.tradeDate}。最终以结单为准。`:error}</p><details className="broker-manual-fee-details"><summary>查看手续费明细与调整</summary><ChiefFeeBreakdown result={estimate} error={error} side={entry.side as 'buy'|'sell'} channel={draft.channel} secScope={draft.secScope} rounding={draft.rounding} onChannel={channel=>configure(key,{channel})} onSecScope={secScope=>configure(key,{secScope})} onRounding={rounding=>configure(key,{rounding})}/></details></>:<p className="help">请按结单填写实际手续费，免手续费时填 0；修改其他成交信息不会覆盖手填费用。</p>}
  </section>;})}
  <button type="button" className="secondary" disabled={drafts.length>=200} onClick={()=>onChange([...drafts,newChiefManualDraft(drafts.at(-1)?.entry)])}><Plus size={15} aria-hidden="true"/>添加一笔成交</button>
 </div>;
}
