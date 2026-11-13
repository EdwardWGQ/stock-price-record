import type {Instrument} from './types';
import {marketExchange,normalizeInstrument} from '../../shared/market-identity';

export function instrumentKey(instrument:Pick<Instrument,'symbol'|'exchange'|'currency'>):string {
 return JSON.stringify([instrument.symbol.trim().toUpperCase(),marketExchange(instrument),instrument.currency.trim().toUpperCase()]);
}

/** Copy instrument fields only: a subsequent purchase gets its own ID and time. */
export function tradeInstruments(instruments:Instrument[]):Instrument[] {
 const unique=new Map<string,Instrument>();
 for(const instrument of instruments){
  const key=instrumentKey(instrument);
  if(!unique.has(key))unique.set(key,normalizeInstrument({symbol:instrument.symbol,name:instrument.name,exchange:instrument.exchange,currency:instrument.currency,timezone:instrument.timezone}));
 }
 return [...unique.values()].sort((a,b)=>a.symbol.localeCompare(b.symbol)||a.exchange.localeCompare(b.exchange)||a.currency.localeCompare(b.currency));
}
