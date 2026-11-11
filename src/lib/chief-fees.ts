import Decimal from 'decimal.js';
import {decimalValue} from './finance';
import {marketDate} from './time';

/** User-supplied Chief stock fee sheet, cross-checked against the October 2026 PDF. */
export const chiefStockFeeSchedule={
 id:'chief-us-stock-2026-q4-v1',verifiedOn:'2026-11-10',validFrom:'2026-10-01',validThrough:'2026-12-31',
 platformPerShare:'0.008',platformMinimum:'0.99',clearingPerShare:'0.003',clearingMinimum:'0.01',amountCap:'0.03',
 phoneCommissionPerShare:'0.03',phoneCommissionMinimum:'20',secRate:'0.0000206',secMinimum:'0.01',
 finraWaiverFrom:'2026-10-01',finraWaiverThrough:'2026-12-31',
 source:'https://www.chiefgroup.com.hk/hk/securities/us-stock',
 detailedSource:'https://chief-website.oss-cn-hongkong.aliyuncs.com/Services/hk/allcharges.pdf',
 secSource:'https://www.sec.gov/rules-regulations/fee-rate-advisories/2026-2',
} as const;
export type ChiefChannel='online'|'phone';
export type SecScope='sell'|'both';
export type FeeRounding='nearest'|'up';
export interface ChiefFeeInput {
 quantity:string;price:string;side:'buy'|'sell';tradeDate:string;
 channel?:ChiefChannel;secScope?:SecScope;rounding?:FeeRounding;
}
export interface ChiefFeeResult {
 scheduleId:string;tradeDate:string;gross:string;commission:string;platform:string;clearing:string;sec:string;finra:string;
 total:string;cashAmount:string;channel:ChiefChannel;secScope:SecScope;rounding:FeeRounding;
}

/** Single ordinary USD equity trade. Round each line before summing, without floats. */
export function calculateChiefStockFees({quantity,price,side,tradeDate,channel='online',secScope='sell',rounding='nearest'}:ChiefFeeInput):ChiefFeeResult {
 const schedule=chiefStockFeeSchedule;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(tradeDate)||!Number.isFinite(Date.parse(tradeDate))||new Date(tradeDate).toISOString().slice(0,10)!==tradeDate)throw new Error('请选择有效的成交日期。');
 if(tradeDate<schedule.validFrom||tradeDate>schedule.validThrough)throw new Error(`当前收费表仅用于 ${schedule.validFrom} 至 ${schedule.validThrough} 的估算，其他日期请核对新费率或手动填写实际手续费。`);
 if(!['buy','sell'].includes(side)||!['online','phone'].includes(channel)||!['sell','both'].includes(secScope)||!['nearest','up'].includes(rounding))throw new Error('请选择有效的收费方案。');
 let shares:Decimal,unitPrice:Decimal;
 try{shares=new Decimal(decimalValue(quantity));unitPrice=new Decimal(decimalValue(price));}catch{throw new Error('请填写大于零的股数和成交价，最多 8 位小数。');}
 const gross=shares.times(unitPrice),cap=gross.times(schedule.amountCap);
 const rounded=(value:Decimal)=>value.toDecimalPlaces(2,rounding==='up'?Decimal.ROUND_CEIL:Decimal.ROUND_HALF_UP);
 // The fee sheet explicitly gives minimum charges priority over the 3% cap.
 const capped=(perShare:string,minimum:string)=>Decimal.max(minimum,Decimal.min(shares.times(perShare),cap));
 const commission=rounded(channel==='phone'?Decimal.max(schedule.phoneCommissionMinimum,shares.times(schedule.phoneCommissionPerShare)):new Decimal(0));
 const platform=rounded(channel==='online'?capped(schedule.platformPerShare,schedule.platformMinimum):new Decimal(0));
 const clearing=rounded(capped(schedule.clearingPerShare,schedule.clearingMinimum));
 const sec=rounded(side==='sell'||secScope==='both'?Decimal.max(schedule.secMinimum,gross.times(schedule.secRate)):new Decimal(0));
 // Date bounded: do not extrapolate the temporary FINRA waiver past Dec 31, 2026.
 const finra=new Decimal(0),total=commission.plus(platform).plus(clearing).plus(sec).plus(finra);
 return {scheduleId:schedule.id,tradeDate,gross:gross.toFixed(),commission:commission.toFixed(2),platform:platform.toFixed(2),clearing:clearing.toFixed(2),sec:sec.toFixed(2),finra:finra.toFixed(2),total:total.toFixed(2),cashAmount:(side==='buy'?gross.plus(total):gross.minus(total)).toFixed(2),channel,secScope,rounding};
}

export function chiefFeesForRecord(input:Omit<ChiefFeeInput,'tradeDate'> & {occurredAt:string;currency:string;exchange:string}):ChiefFeeResult {
 if(input.currency!=='USD'||!['NASDAQ','NYSE','AMEX','ARCA','NYSE ARCA','BATS','NYSEAMERICAN','NYSE AMERICAN','US'].includes(input.exchange.toUpperCase()))throw new Error('致富自动估算仅支持普通美股／ETF 的美元成交。其他市场、期权或期货请手动填写手续费。');
 const tradeDate=marketDate(input.occurredAt,'America/New_York');
 return calculateChiefStockFees({...input,tradeDate});
}
