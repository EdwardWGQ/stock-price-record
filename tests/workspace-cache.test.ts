import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {clearWorkspace,readWorkspace,writeWorkspace,workspaceCacheKey} from '../src/lib/workspace-cache';
import type {WorkspaceSnapshot} from '../src/lib/workspace-cache';
const user='11111111-1111-4111-8111-111111111111';
function data():WorkspaceSnapshot {
 const id='22222222-2222-4222-8222-222222222222';
 return {watchlist:[{id,user_id:user,symbol:'AAPL',name:'Apple',exchange:'NASDAQ',currency:'USD',timezone:'America/New_York',baseline_at:'2026-06-01T04:00:00Z',baseline_timezone:'America/New_York',baseline_price:'200',baseline_date:'2026-06-01',alert_percent:'-30',notes:'',revision:1,created_at:'2026-10-29T00:00:00Z',updated_at:'2026-10-29T00:00:00Z'}],quotes:{[id]:{symbol:'AAPL',exchange:'NASDAQ',currency:'USD',price:'210.12345678',change_percent:'5',as_of:'2026-10-29T20:00:00Z',fetched_at:'2026-10-30T00:00:00Z',market_open:false,source:'test',stale:false}},histories:{[id]:[{date:'2026-06-01',open:'200',close:'210'}]},volatility:{},baselineDate:'2026-06-01'};
}
beforeEach(()=>{const values=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)});});
afterEach(()=>vi.unstubAllGlobals());
describe('account workspace cache',()=>{
 it('preserves decimal strings and marks restored quotes as cached',()=>{writeWorkspace(user,data());expect(Object.values(readWorkspace(user)!.quotes)[0]).toMatchObject({price:'210.12345678',cached:true,stale:true});});
 it('does not restore data belonging to a different account',()=>{const snapshot=data();snapshot.watchlist[0].user_id='33333333-3333-4333-8333-333333333333';localStorage.setItem(workspaceCacheKey(user),JSON.stringify(snapshot));expect(readWorkspace(user)).toBeNull();});
 it('discards mismatched stock quotes and removed records',()=>{const snapshot=data();Object.values(snapshot.quotes)[0].exchange='NYSE';snapshot.histories['removed']=[{date:'2026-06-01',close:'100'}];writeWorkspace(user,snapshot);expect(readWorkspace(user)!.quotes).toEqual({});expect(readWorkspace(user)!.histories).not.toHaveProperty('removed');});
 it('removes the snapshot on sign-out and tolerates corrupt storage',()=>{writeWorkspace(user,data());clearWorkspace(user);expect(readWorkspace(user)).toBeNull();localStorage.setItem(workspaceCacheKey(user),'broken');expect(readWorkspace(user)).toBeNull();});
});
