import type {ChiefManualEntry} from './broker-import';
import {chiefFeesForRecord,type ChiefChannel,type SecScope,type FeeRounding,type ChiefFeeResult} from './chief-fees';
import {resolveLocal} from './time';
import {normalizeInstrument} from '../../shared/market-identity';

export interface ChiefManualDraft {
 key:string;entry:ChiefManualEntry;feeMode:'chief'|'manual';
 channel:ChiefChannel;secScope:SecScope;rounding:FeeRounding;
}

/** The displayed estimate and the import preview use the same current inputs. */
export function resolveChiefManualDraft(draft:ChiefManualDraft):{entry:ChiefManualEntry;estimate:ChiefFeeResult|null;error?:string} {
 if(draft.feeMode==='manual')return {entry:normalizeInstrument(draft.entry),estimate:null};
 const entry={...normalizeInstrument(draft.entry),fees:''};
 if(!entry.quantity.trim()||!entry.price.trim()||!entry.occurred_at)return {entry,estimate:null,error:'填写数量、成交价格和成交时间后自动计算。'};
 try{
  const estimate=chiefFeesForRecord({quantity:entry.quantity.trim().replace(/,/g,''),price:entry.price.trim().replace(/,/g,''),side:entry.side as 'buy'|'sell',occurredAt:resolveLocal(entry.occurred_at,entry.record_timezone),currency:entry.currency,exchange:entry.exchange,channel:draft.channel,secScope:draft.secScope,rounding:draft.rounding});
  return {entry:{...entry,fees:estimate.total},estimate};
 }catch(cause){
  const message=cause instanceof Error?cause.message:'手续费暂时无法计算。';
  const timeErrors:Record<string,string>={TIMEZONE:'请选择有效的记录时区。',TIME_INVALID:'请填写有效的成交时间。',TIME_GAP:'该记录时区不存在这一成交时间，请核对结单。',TIME_AMBIGUOUS:'该成交时间在记录时区出现两次，请按结单换算为 UTC 填写。'};
  return {entry,estimate:null,error:timeErrors[message]??message};
 }
}
