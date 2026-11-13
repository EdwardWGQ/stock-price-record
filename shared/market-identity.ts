type MarketIdentity = {symbol:string;exchange:string;currency:string};

// These USD ETFs have one primary listing on NYSE Arca. Tencent labels that
// venue as AMEX; older manual entries defaulted to NASDAQ. Keep this correction
// limited to verified tickers and venues, never merge arbitrary same-symbol stocks.
const arcaEtfs = new Set(['SPY','VOO','VTI']);
const arcaAliases = new Set(['AMEX','ARCA','NYSE ARCA','NYSEARCA','NYSE_ARCA','ARCX']);
export function marketExchange(item:MarketIdentity,legacyEntry=true):string {
 const exchange=item.exchange.trim().toUpperCase();
 if(item.currency.trim().toUpperCase()==='USD'&&arcaEtfs.has(item.symbol.trim().toUpperCase())&&(arcaAliases.has(exchange)||legacyEntry&&exchange==='NASDAQ'))return 'NYSE ARCA';
 return exchange;
}

export function normalizeInstrument<T extends MarketIdentity>(item:T):T {
 return {...item,symbol:item.symbol.trim().toUpperCase(),exchange:marketExchange(item),currency:item.currency.trim().toUpperCase()};
}
