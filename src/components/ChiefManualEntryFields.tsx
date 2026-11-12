import {Plus,Trash2} from 'lucide-react';
import type {ChiefManualEntry} from '../lib/broker-import';

export interface ChiefManualDraft {key:string;entry:ChiefManualEntry}

export function newChiefManualDraft(previous?:ChiefManualEntry):ChiefManualDraft {
 return {key:crypto.randomUUID(),entry:{reference:'',symbol:'',name:'',exchange:previous?.exchange??'NASDAQ',currency:'USD',side:'buy',quantity:'',price:'',fees:'',occurred_at:'',record_timezone:previous?.record_timezone??'Asia/Hong_Kong',notes:''}};
}

export function ChiefManualEntryFields({drafts,onChange}:{drafts:ChiefManualDraft[];onChange:(drafts:ChiefManualDraft[])=>void}) {
 function update(key:string,field:keyof ChiefManualEntry,value:string){onChange(drafts.map(draft=>draft.key===key?{...draft,entry:{...draft.entry,[field]:value}}:draft));}
 return <div className="broker-manual-entries">
  <p className="help">逐笔填写实际成交，每次最多 200 条。金额以美元（USD）计；请按结单填写实际手续费，免手续费时填 0。</p>
  {drafts.map(({key,entry},index)=><section className="broker-manual-entry" key={key} aria-label={`第 ${index+1} 笔成交`}>
   <div className="broker-manual-heading"><h3>第 {index+1} 笔成交 <small>USD · 美股</small></h3>{drafts.length>1&&<button type="button" className="secondary" aria-label={`删除第 ${index+1} 笔成交`} onClick={()=>onChange(drafts.filter(draft=>draft.key!==key))}><Trash2 size={14} aria-hidden="true"/>删除</button>}</div>
   <div className="form-grid">
    <label>成交编号<input required maxLength={100} value={entry.reference} placeholder="每笔成交的独立编号" onChange={event=>update(key,'reference',event.target.value)}/></label>
    <label>股票代码<input required maxLength={24} value={entry.symbol} placeholder="例如：AAPL" autoCapitalize="characters" onChange={event=>update(key,'symbol',event.target.value)}/></label>
    <label>公司名称<input required maxLength={160} value={entry.name} placeholder="例如：Apple" onChange={event=>update(key,'name',event.target.value)}/></label>
    <label>交易所<select aria-label="交易所" value={entry.exchange} onChange={event=>update(key,'exchange',event.target.value)}><option value="NASDAQ">NASDAQ</option><option value="NYSE">NYSE</option><option value="AMEX">AMEX</option><option value="ARCA">ARCA</option><option value="BATS">BATS</option><option value="OTC">OTC</option></select></label>
    <label>交易方向<select aria-label="交易方向" value={entry.side} onChange={event=>update(key,'side',event.target.value)}><option value="buy">买入</option><option value="sell">卖出</option></select></label>
    <label>数量<input required inputMode="decimal" value={entry.quantity} placeholder="实际成交股数" onChange={event=>update(key,'quantity',event.target.value)}/></label>
    <label>成交价格（USD）<input required inputMode="decimal" value={entry.price} placeholder="每股成交价格" onChange={event=>update(key,'price',event.target.value)}/></label>
    <label>手续费（USD）<input required inputMode="decimal" value={entry.fees} placeholder="填写实际费用，可填 0" onChange={event=>update(key,'fees',event.target.value)}/></label>
    <label>成交时间<input required type="datetime-local" step="1" value={entry.occurred_at} onChange={event=>update(key,'occurred_at',event.target.value)}/></label>
    <label>记录时区<select aria-label="记录时区" value={entry.record_timezone} onChange={event=>update(key,'record_timezone',event.target.value)}><option value="Asia/Hong_Kong">香港时间 · Asia/Hong_Kong</option><option value="Asia/Shanghai">北京时间 · Asia/Shanghai</option><option value="America/New_York">美东时间 · America/New_York</option><option value="UTC">UTC</option></select></label>
    <label className="span-two">备注（选填）<textarea rows={2} maxLength={1800} value={entry.notes} placeholder="补充这笔成交的说明" onChange={event=>update(key,'notes',event.target.value)}/></label>
   </div>
  </section>)}
  <button type="button" className="secondary" disabled={drafts.length>=200} onClick={()=>onChange([...drafts,newChiefManualDraft(drafts.at(-1)?.entry)])}><Plus size={15} aria-hidden="true"/>添加一笔成交</button>
 </div>;
}
