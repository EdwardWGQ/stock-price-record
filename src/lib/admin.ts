import {supabase} from './client';
import type {Trade,WatchItem,Profile} from './types';

export interface AdminUser {
 id:string;email:string|null;phone:string|null;display_name:string;created_at:string;updated_at?:string;last_sign_in_at:string|null;
 email_confirmed_at:string|null;banned_until:string|null;is_admin:boolean;watch_count:number;trade_count:number;
}
export interface AdminTrade extends Trade {email:string|null}
export interface AdminOverview {fetched_at:string;user_count:number;watch_count:number;trade_count:number;filtered_count:number;users:AdminUser[];recent_trades:AdminTrade[]}
export interface AdminPosition {symbol:string;exchange:string;currency:string;name:string;bought_quantity:string;sold_quantity:string;quantity:string;trade_count:number;last_trade_at:string}
export interface AdminUserDetail {fetched_at:string;user:AdminUser;profile:Profile|null;watchlist:WatchItem[];trades:Trade[];trade_count:number;positions:AdminPosition[]}

async function adminRpc<T>(name:string,args:Record<string,unknown>={},signal?:AbortSignal):Promise<T> {
 if(!supabase)throw new Error('CONFIG');
 let request=supabase.rpc(name,args);
 if(signal)request=request.abortSignal(signal);
 const result=await request;
 if(result.error){
  if(result.error.code==='42501'||result.status===401||result.status===403)throw new Error('ADMIN_FORBIDDEN');
  if(result.error.code==='P0002')throw new Error('USER_NOT_FOUND');
  throw new Error('ADMIN_UNAVAILABLE');
 }
 return result.data as T;
}
export async function loadAdminStatus(signal?:AbortSignal):Promise<boolean> {return await adminRpc('admin_status',{},signal)===true;}
export function loadAdminOverview(search='',offset=0,signal?:AbortSignal){return adminRpc<AdminOverview>('admin_overview',{p_search:search,p_offset:offset},signal);}
export function loadAdminUser(userId:string,tradeOffset=0,signal?:AbortSignal){return adminRpc<AdminUserDetail>('admin_user_detail',{p_user_id:userId,p_trade_offset:tradeOffset},signal);}
