import {useEffect,useRef,useState} from 'react';
import {X} from 'lucide-react';
import {calculateChiefStockFees,type ChiefChannel,type SecScope,type FeeRounding,type ChiefFeeResult} from '../lib/chief-fees';
import {marketDate} from '../lib/time';
import {ChiefFeeBreakdown} from './ChiefFeeBreakdown';

export function ChiefFeeCalculator({onClose}:{onClose:()=>void}) {
 const dialog=useRef<HTMLDialogElement>(null);
 const [side,setSide]=useState<'buy'|'sell'>('buy'),[quantity,setQuantity]=useState(''),[price,setPrice]=useState('');
 const [date,setDate]=useState(()=>marketDate(new Date().toISOString(),'America/New_York'));
 const [channel,setChannel]=useState<ChiefChannel>('online'),[secScope,setSecScope]=useState<SecScope>('sell'),[rounding,setRounding]=useState<FeeRounding>('nearest');
 useEffect(()=>{const element=dialog.current;element?.showModal();return()=>element?.close();},[]);
 let result:ChiefFeeResult|null=null,error:string|undefined;
 try{result=calculateChiefStockFees({side,quantity,price,tradeDate:date,channel,secScope,rounding});}catch(cause){error=quantity&&price?(cause instanceof Error?cause.message:'请核对输入。'):undefined;}
 return <dialog className="record-dialog chief-calculator-dialog" ref={dialog} aria-labelledby="chiefCalculatorTitle" onCancel={event=>{event.preventDefault();onClose();}}>
  <div className="dialog-head"><div><span className="eyebrow">CHIEF SECURITIES / FEES</span><h2 id="chiefCalculatorTitle">致富手续费计算器</h2></div><button type="button" aria-label="关闭手续费计算器" onClick={onClose}><X size={20}/></button></div>
  <div className="chief-calculator-body"><p className="help">输入股数和每股成交价，即可预估费用。这里用于试算，不会生成交易记录。</p><div className="form-grid">
   <label>买卖方向<select aria-label="买卖方向" value={side} onChange={event=>setSide(event.target.value as 'buy'|'sell')}><option value="buy">买入</option><option value="sell">卖出</option></select></label>
   <label>成交日期（美东）<input type="date" value={date} onChange={event=>setDate(event.target.value)}/></label>
   <label>股数<input inputMode="decimal" value={quantity} placeholder="例如 10" onChange={event=>setQuantity(event.target.value)}/></label>
   <label>每股成交价（USD）<input inputMode="decimal" value={price} placeholder="例如 200" onChange={event=>setPrice(event.target.value)}/></label>
  </div><ChiefFeeBreakdown result={result} error={error} side={side} channel={channel} secScope={secScope} rounding={rounding} onChannel={setChannel} onSecScope={setSecScope} onRounding={setRounding}/>
  </div>
  <div className="dialog-footer chief-calculator-footer">{result&&<div className="chief-footer-totals"><span>预计手续费 <b>${result.total}</b></span><small>{side==='buy'?'预计买入支出':'预计卖出净收入'} <strong data-testid="chief-cash-total">${result.cashAmount}</strong></small></div>}<button className="secondary" type="button" onClick={onClose}>关闭</button></div>
 </dialog>;
}
