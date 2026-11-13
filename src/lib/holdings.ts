import Decimal from 'decimal.js';
import type {Instrument,Trade,Quote} from './types';
import {tradeValue} from './finance';
import {instrumentKey} from './trade-instruments';
import {normalizeInstrument} from '../../shared/market-identity';

export interface Position extends Instrument {key:string;quantity:string;cost:string|null;incomplete:boolean}
export interface Holding extends Position {quote:Quote|null;averageCost:string|null;marketValue:string|null;profit:string|null;returnPercent:string|null}
export interface HoldingTotal {currency:string;count:number;cost:string|null;marketValue:string|null;profit:string|null;returnPercent:string|null;missingQuotes:number;incomplete:number}

/** Moving average book cost, including buy fees. Sales remove proportional cost. */
export function calculatePositions(trades:Trade[]):Position[] {
 const positions=new Map<string,{instrument:Instrument;quantity:Decimal;cost:Decimal;incomplete:boolean}>();
 const ordered=[...trades].sort((a,b)=>Date.parse(a.occurred_at)-Date.parse(b.occurred_at)||a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id));
 for(const trade of ordered){
  const key=instrumentKey(trade),position=positions.get(key)??{instrument:trade,quantity:new Decimal(0),cost:new Decimal(0),incomplete:false};
  const quantity=new Decimal(trade.quantity);
  if(trade.side==='buy'){
   position.quantity=position.quantity.plus(quantity);
   position.cost=position.cost.plus(tradeValue(trade));
  }else{
   if(quantity.gt(position.quantity))position.incomplete=true;
   if(!position.incomplete)position.cost=quantity.eq(position.quantity)?new Decimal(0):position.cost.times(position.quantity.minus(quantity)).div(position.quantity);
   position.quantity=position.quantity.minus(quantity);
  }
  positions.set(key,position);
 }
 return [...positions].filter(([,position])=>!position.quantity.isZero()).map(([key,position])=>{
  const {symbol,name,exchange,currency,timezone}=normalizeInstrument(position.instrument);
  return {key,symbol,name,exchange,currency,timezone,quantity:position.quantity.toFixed(),cost:position.incomplete?null:position.cost.toFixed(),incomplete:position.incomplete};
 }).sort((a,b)=>a.symbol.localeCompare(b.symbol)||a.key.localeCompare(b.key));
}

/** Match full market identity; missing quotes never become a zero market value. */
export function valuePositions(positions:Position[],quotes:Record<string,Quote>):Holding[] {
 const matched=new Map<string,Quote>();
 for(const quote of Object.values(quotes)){
  if(!/^\d+(?:\.\d+)?$/.test(quote.price))continue;
  const key=instrumentKey(quote),prior=matched.get(key);
  if(!prior||Date.parse(quote.as_of)>Date.parse(prior.as_of)||quote.as_of===prior.as_of&&(!quote.stale&&prior.stale||quote.stale===prior.stale&&Date.parse(quote.fetched_at)>Date.parse(prior.fetched_at)))matched.set(key,quote);
 }
 return positions.map(position=>{
  const quantity=new Decimal(position.quantity),quote=matched.get(position.key)??null;
  const cost=position.cost===null?null:new Decimal(position.cost);
  const marketValue=quote&&quantity.gt(0)?quantity.times(quote.price):null;
  const profit=marketValue&&cost?marketValue.minus(cost):null;
  return {...position,quote,averageCost:cost&&quantity.gt(0)?cost.div(quantity).toFixed():null,marketValue:marketValue?.toFixed()??null,profit:profit?.toFixed()??null,returnPercent:profit&&cost?.gt(0)?profit.div(cost).times(100).toFixed(2):null};
 });
}

export function holdingTotals(holdings:Holding[]):HoldingTotal[] {
 const currencies=[...new Set(holdings.map(position=>position.currency))].sort();
 const sum=(rows:Holding[],field:'cost'|'marketValue'|'profit')=>rows.every(row=>row[field]!==null)?rows.reduce((total,row)=>total.plus(row[field]!),new Decimal(0)).toFixed():null;
 return currencies.map(currency=>{
  const rows=holdings.filter(row=>row.currency===currency),cost=sum(rows,'cost'),marketValue=sum(rows,'marketValue'),profit=sum(rows,'profit');
  return {currency,count:rows.length,cost,marketValue,profit,returnPercent:profit!==null&&cost!==null&&new Decimal(cost).gt(0)?new Decimal(profit).div(cost).times(100).toFixed(2):null,missingQuotes:rows.filter(row=>row.marketValue===null).length,incomplete:rows.filter(row=>row.incomplete).length};
 });
}
