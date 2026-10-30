import {test,expect,type Page} from '@playwright/test';
const user={id:'11111111-1111-4111-8111-111111111111',email:'browser-test@example.com',aud:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-10-29T00:00:00Z'};
const indexData=(name:string)=>({name,bars:[{date:'2026-10-28',close:'20'},{date:'2026-10-29',close:'21'}],value:'21',change_percent:'5',week_change_percent:'5',average20:'20.5',as_of:'2026-10-29',fetched_at:'2026-10-30T00:00:00Z',source:'Cboe official / daily close',stale:false});
const stock={id:'22222222-2222-4222-8222-222222222222',user_id:user.id,symbol:'AAPL',name:'Apple',exchange:'NASDAQ',currency:'USD',timezone:'America/New_York',baseline_date:'2026-06-01',baseline_at:'2026-06-01T04:00:00Z',baseline_timezone:'America/New_York',baseline_price:'200',alert_percent:'-30',notes:'',revision:1,created_at:'2026-10-29T00:00:00Z',updated_at:'2026-10-29T00:00:00Z'};
async function signedIn(page:Page,watchlist:unknown[]=[]) {
 await page.addInitScript(user=>{
  localStorage.setItem('sb-test-project-auth-token',JSON.stringify({user,access_token:'browser-test-access-token',refresh_token:'browser-test-refresh-token',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',expires_in:3600}));
 },user);
 await page.route('https://test-project.supabase.co/rest/v1/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(path.endsWith('/watchlist')?watchlist:path.endsWith('/profiles')?{user_id:user.id,baseline_date:'2026-06-01'}:[])});
 });
 await page.route('https://test-project.supabase.co/auth/v1/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(user)}));
}
test('loads both indexes before slow equity quotes finish',async({page})=>{
 await signedIn(page,[{id:'22222222-2222-4222-8222-222222222222',user_id:user.id,symbol:'AAPL',name:'Apple',exchange:'NASDAQ',currency:'USD',timezone:'America/New_York',baseline_date:'2026-06-01',baseline_at:'2026-06-01T04:00:00Z',baseline_timezone:'America/New_York',baseline_price:'200',alert_percent:'-30',notes:'',revision:1,created_at:'2026-10-29T00:00:00Z',updated_at:'2026-10-29T00:00:00Z'}]);
 let equityFinished=false;
 await page.route('**/functions/v1/market-data',async route=>{
  const body=route.request().postDataJSON();
  if(body.action==='volatility')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(indexData(body.symbol))});
  await new Promise(resolve=>setTimeout(resolve,8000));equityFinished=true;
  await route.fulfill({status:503,contentType:'application/json',body:'{"error":"MARKET_UNAVAILABLE"}'});
 });
 await page.goto('/');
 await expect(page.locator('#volSection .vol-head strong')).toHaveText(['21.00','21.00']);
 expect(equityFinished).toBe(false);
 await expect(page.getByPlaceholder('搜索股票',{exact:true})).toBeVisible();
});
test('loads indexes for an empty watchlist, retries failures and retains dated data',async({page})=>{
 await signedIn(page);
 let failures=true;
 await page.route('**/functions/v1/market-data',route=>{
  const body=route.request().postDataJSON();
  return route.fulfill({status:failures?503:200,contentType:'application/json',body:JSON.stringify(failures?{error:'MARKET_UNAVAILABLE'}:indexData(body.symbol))});
 });
 await page.goto('/');
 await expect(page.locator('#volSection')).toContainText('官方指数服务暂不可用');
 failures=false;
 await page.getByRole('button',{name:'重新加载 VIX',exact:true}).click();
 await page.getByRole('button',{name:'重新加载 VXN',exact:true}).click();
 await expect(page.locator('#volSection .vol-head strong')).toHaveText(['21.00','21.00']);
 failures=true;
 await page.getByRole('button',{name:'重新加载 VIX',exact:true}).click();
 const vix=page.locator('.vol-card').filter({has:page.locator('b',{hasText:'VIX'})});
 await expect(vix).toContainText('保留上次数据');
 await expect(vix).toContainText('2026-10-29');
 await expect(vix).toContainText('缓存／已过期');
 await expect(vix.locator('strong')).toHaveText('21.00');
});
test('shows independent loading states for a delayed index',async({page})=>{
 await signedIn(page);
 await page.route('**/functions/v1/market-data',async route=>{
  const body=route.request().postDataJSON();
  if(body.symbol==='VXN')await new Promise(resolve=>setTimeout(resolve,1500));
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(indexData(body.symbol))});
 });
 await page.goto('/');
 await expect(page.locator('.vol-card').first().locator('strong')).toHaveText('21.00');
 await expect(page.locator('.vol-card').last()).toContainText('正在加载官方日收盘数据');
 await expect(page.locator('#volSection .vol-head strong')).toHaveText(['21.00','21.00']);
});
test('automatically loads all imported stocks after records arrive',async({page})=>{
 const stocks=Array.from({length:20},(_,index)=>({...stock,id:`22222222-2222-4222-8222-${String(index).padStart(12,'0')}`,symbol:`TEST${index}`}));
 await signedIn(page,stocks);
 const quoted=new Set<string>();
 await page.route('**/functions/v1/market-data',route=>{
  const body=route.request().postDataJSON();
  if(body.action==='volatility')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(indexData(body.symbol))});
  quoted.add(body.instrument.symbol);
  const data=body.action==='quote'?{...body.instrument,price:'210',change_percent:'5',as_of:'2026-10-29T20:00:00Z',fetched_at:'2026-10-30T00:00:00Z',market_open:false,source:'test',stale:false}:{exchange:'NASDAQ',currency:'USD',bars:[{date:'2026-06-01',open:'200',close:'200'},{date:'2026-10-29',open:'209',close:'210'}]};
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.goto('/');
 await expect(page.locator('.wl-row .price')).toHaveText(Array(20).fill('$210.00'));
 expect(quoted.size).toBe(20);
 await expect(page.locator('.chart-empty')).toHaveCount(0);
});
test('keeps a successful quote visible when history fails',async({page})=>{
 await signedIn(page,[stock]);
 await page.route('**/functions/v1/market-data',route=>{
  const body=route.request().postDataJSON();
  const data=body.action==='volatility'?indexData(body.symbol):body.action==='quote'?{...body.instrument,price:'210',change_percent:'5',as_of:'2026-10-29T20:00:00Z',fetched_at:'2026-10-30T00:00:00Z',market_open:false,source:'test',stale:false}:{error:'HISTORY_EMPTY'};
  return route.fulfill({status:body.action==='history'?404:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.goto('/');
 await expect(page.locator('.wl-row .price')).toContainText('$210.00');
 await expect(page.locator('.wl-row .net')).toHaveText('+5.0%');
 await expect(page.locator('.chart-empty')).toHaveCount(1);
});
