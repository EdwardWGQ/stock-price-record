import {createClient} from '@supabase/supabase-js';
import {fetchChinaQuotes,fetchChinaHistory} from '../market-data/china.ts';
import {officialVolatility} from '../market-data/volatility.ts';
import {preparedKey} from '../market-data/prepared.ts';
const env=(name:string)=>Deno.env.get(name)??'';
const secret=env('APP_SUPABASE_SECRET_KEY')||JSON.parse(env('SUPABASE_SECRET_KEYS')||'{}').default||env('SUPABASE_SERVICE_ROLE_KEY');
const admin=createClient(env('SUPABASE_URL'),secret,{auth:{persistSession:false,autoRefreshToken:false}});
async function rpc<T>(name:string,params:Record<string,unknown>):Promise<T>{const {data,error}=await admin.rpc(name,params);if(error)throw new Error('BACKEND');return data as T;}
type Item={symbol:string;name:string;exchange:string;currency:string;timezone:string;start:string};
function cacheKey(action:'quote'|'history',item:Item){return 'china-public:v3:'+JSON.stringify({action,symbol:item.symbol,exchange:item.exchange,currency:item.currency,...(action==='history'?{start:item.start}:{})});}
Deno.serve(async request=>{
 if(request.method!=='POST')return new Response('Method not allowed',{status:405});
 if(!env('MARKET_WARM_TOKEN')||request.headers.get('Authorization')!=='Bearer '+env('MARKET_WARM_TOKEN'))return new Response('Unauthorized',{status:401});
 try{
  if((env('MARKET_PROVIDER')||'china-public')!=='china-public')return Response.json({skipped:'provider'});
  if(!await rpc('market_rate_limit',{p_key:'market:warm',p_limit:1}))return Response.json({skipped:'running'});
  const items=await rpc<Item[]>('market_warm_instruments',{});
  const unique=Array.from(new Map(items.map(item=>[preparedKey('quote',item),item])).values());
  let quotes=0,histories=0;const errors:string[]=[];
  for(let offset=0;offset<unique.length;offset+=25){
   if(!await rpc('market_rate_limit',{p_key:'upstream:china-public',p_limit:60}))break;
   const batch=unique.slice(offset,offset+25);
   try{
    const result=await fetchChinaQuotes(batch),entries=[];
    for(const row of result.quotes){
     if(!row.quote){errors.push(row.symbol+':quote');continue;}
     const item=batch.find(item=>item.symbol===row.symbol&&item.exchange===row.exchange)!;
     entries.push({key:preparedKey('quote',item),payload:row.quote});quotes++;
     await rpc('market_cache_put',{p_key:cacheKey('quote',item),p_payload:row.quote,p_ttl:300});
    }
    if(entries.length)await rpc('market_prepared_put',{p_entries:entries});
   }catch{errors.push('quote-batch');}
  }
  let position=0;
  await Promise.all(Array.from({length:Math.min(4,items.length)},async()=>{
   while(position<items.length){const item=items[position++];
    try{
     const key=cacheKey('history',item),cached=await rpc<unknown>('market_cache_get',{p_key:key});
     if(cached){await rpc('market_prepared_put',{p_entries:[{key:preparedKey('history',item,item.start),payload:cached}]});continue;}
     if(!await rpc('market_rate_limit',{p_key:'upstream:china-public',p_limit:60}))continue;
     const quote=await rpc<Awaited<ReturnType<typeof fetchChinaQuotes>>['quotes'][number]['quote']>('market_cache_get',{p_key:cacheKey('quote',item)});
     const result=await fetchChinaHistory(item,item.start,quote);
     await rpc('market_prepared_put',{p_entries:[{key:preparedKey('history',item,item.start),payload:result}]});
     await rpc('market_cache_put',{p_key:key,p_payload:result,p_ttl:3600});histories++;
    }catch{errors.push(item.symbol+':history');}
   }
  }));
  for(const name of ['VIX','VXN'] as const){
   try{
    const key='cboe:daily:'+name;let data=await rpc<unknown>('market_cache_get',{p_key:key});
    if(!data){
     if(!await rpc('market_rate_limit',{p_key:'upstream:cboe',p_limit:12}))continue;
     const result=await fetch(`https://cdn.cboe.com/api/global/us_indices/daily_prices/${name}_History.csv`,{signal:AbortSignal.timeout(15000)});
     if(!result.ok)throw new Error('MARKET_UNAVAILABLE');data=officialVolatility(name,await result.text());
     await rpc('market_cache_put',{p_key:key,p_payload:data,p_ttl:3600});
    }
    await rpc('market_prepared_put',{p_entries:[{key:'volatility:'+name,payload:data}]});
   }catch{errors.push(name);}
  }
  console.log(JSON.stringify({event:'market_prepared',quotes,histories,errors}));
  return Response.json({quotes,histories,errors});
 }catch{console.error('market_warm_failed');return Response.json({error:'BACKEND'},{status:503});}
});
