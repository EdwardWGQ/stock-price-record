export function preparedKey(kind:'quote'|'history',item:{symbol:string;exchange:string;currency:string;timezone:string},start?:string) {
 return `${kind}:${item.symbol}:${item.exchange}:${item.currency}:${item.timezone}${kind==='history'?':'+start:''}`;
}
