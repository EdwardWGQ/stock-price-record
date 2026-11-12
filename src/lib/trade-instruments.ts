import type {Instrument} from './types';

export function instrumentKey(instrument:Instrument):string {
 return JSON.stringify([instrument.symbol.trim().toUpperCase(),instrument.exchange.trim().toUpperCase(),instrument.currency.trim().toUpperCase()]);
}

/** Copy instrument fields only: a subsequent purchase gets its own ID and time. */
export function tradeInstruments(instruments:Instrument[]):Instrument[] {
 const unique=new Map<string,Instrument>();
 for(const instrument of instruments){
  const key=instrumentKey(instrument);
  if(!unique.has(key))unique.set(key,{symbol:instrument.symbol,name:instrument.name,exchange:instrument.exchange,currency:instrument.currency,timezone:instrument.timezone});
 }
 return [...unique.values()].sort((a,b)=>a.symbol.localeCompare(b.symbol)||a.exchange.localeCompare(b.exchange)||a.currency.localeCompare(b.currency));
}
