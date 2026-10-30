import {z} from 'zod';
import {watchSchema} from './validation';
import type {WatchItem,Quote,Bar,Volatility} from './types';
export interface WorkspaceSnapshot {watchlist:WatchItem[];quotes:Record<string,Quote>;histories:Record<string,Bar[]>;volatility:Record<string,Volatility>;baselineDate:string}
const decimal=z.string().regex(/^\d+(\.\d+)?$/).refine(value=>Number.isFinite(Number(value))&&Number(value)>0);
const bars=z.array(z.object({date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),close:decimal,open:decimal.optional()})).max(5000);
const quote=z.object({symbol:z.string(),exchange:z.string(),currency:z.string(),price:decimal,change_percent:z.string().regex(/^-?\d+(\.\d+)?$/),as_of:z.string().datetime(),fetched_at:z.string().datetime(),market_open:z.boolean().nullable(),source:z.string(),stale:z.boolean(),cached:z.boolean().optional()});
const volatility=z.object({name:z.string(),bars,value:decimal,change_percent:z.string(),week_change_percent:z.string(),average20:z.string(),as_of:z.string(),fetched_at:z.string(),source:z.string(),stale:z.boolean(),cached:z.boolean().optional()});
const schema=z.object({watchlist:z.array(watchSchema.extend({user_id:z.string().uuid(),revision:z.number().int().positive(),created_at:z.string(),updated_at:z.string()})).max(100),quotes:z.record(z.string(),quote),histories:z.record(z.string(),bars),volatility:z.record(z.string(),volatility),baselineDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)});
export function workspaceCacheKey(userId:string){return `equity-workspace-v1:${userId}`;}
export function readWorkspace(userId:string):WorkspaceSnapshot|null {
 try{
  const raw=localStorage.getItem(workspaceCacheKey(userId));if(!raw||raw.length>4_000_000)return null;
  const data=schema.parse(JSON.parse(raw));
  if(data.watchlist.some(item=>item.user_id!==userId))return null;
  const ids=new Set(data.watchlist.map(item=>item.id));
  data.quotes=Object.fromEntries(data.watchlist.flatMap(item=>{const q=data.quotes[item.id];return q&&q.symbol===item.symbol&&q.exchange===item.exchange&&q.currency===item.currency?[[item.id,{...q,stale:true,cached:true}]]:[];}));
  data.histories=Object.fromEntries(Object.entries(data.histories).filter(([id])=>ids.has(id)));
  data.volatility=Object.fromEntries(Object.entries(data.volatility).map(([name,data])=>[name,{...data,cached:true}]));
  return data;
 }catch{return null;}
}
export function writeWorkspace(userId:string,data:WorkspaceSnapshot){try{localStorage.setItem(workspaceCacheKey(userId),JSON.stringify(data));}catch{/* Storage limits never prevent live use. */}}
export function clearWorkspace(userId:string){try{localStorage.removeItem(workspaceCacheKey(userId));}catch{/* Storage can be disabled. */}}
