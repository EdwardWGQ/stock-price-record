import {test,expect,type Page} from '@playwright/test';
import {hoverHistoryPoint} from './helpers/chart';
import {barsFrom,fixtureIndex} from '../fixtures/sentiment';
import {chiefColumns} from '../../src/lib/broker-import';
const user={id:'11111111-1111-4111-8111-111111111111',email:'browser-test@example.com',aud:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-10-29T00:00:00Z'};
const indexData=(name:string)=>({name,bars:[{date:'2026-10-28',close:'20'},{date:'2026-10-29',close:'21'}],value:'21',change_percent:'5',week_change_percent:'5',average20:'20.5',as_of:'2026-10-29',fetched_at:'2026-10-30T00:00:00Z',source:'Cboe official / daily close',stale:false});
const stock={id:'22222222-2222-4222-8222-222222222222',user_id:user.id,symbol:'AAPL',name:'Apple',exchange:'NASDAQ',currency:'USD',timezone:'America/New_York',baseline_date:'2026-06-01',baseline_at:'2026-06-01T04:00:00Z',baseline_timezone:'America/New_York',baseline_price:'200',alert_percent:'-30',notes:'',revision:1,created_at:'2026-10-29T00:00:00Z',updated_at:'2026-10-29T00:00:00Z'};
test('previews Chief template data, requires review and skips server duplicates on retry',async({page})=>{
 await signedIn(page);
 let savedRows:Record<string,unknown>[]=[],insertCalls=0;
 await page.route('https://test-project.supabase.co/rest/v1/trades**',route=>{
  if(route.request().method()==='POST'){
   insertCalls++;
   const inputs=route.request().postDataJSON() as Record<string,unknown>[];
   savedRows=inputs.map(row=>({...row,user_id:user.id,revision:1,created_at:new Date().toISOString(),updated_at:new Date().toISOString()}));
  }
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(savedRows)});
 });
 await page.route('**/functions/v1/market-data',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"MARKET_UNAVAILABLE"}'}));
 await page.goto('/journal');
 await page.getByRole('button',{name:'致富成交导入',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'致富成交记录导入'});
 await expect(dialog).toContainText('非实时同步');
 await dialog.getByLabel('致富成交文件').setInputFiles({name:'chief-statement.pdf',mimeType:'application/pdf',buffer:Buffer.from('not a supported format')});
 await dialog.getByRole('button',{name:'读取并预览',exact:true}).click();
 await expect(dialog.getByRole('alert')).toContainText('原始 PDF／Excel 结单仍需样本适配');
 expect(insertCalls).toBe(0);
 const csv=chiefColumns.join(',')+'\nFILL-001,AAPL,Apple,NASDAQ,USD,买入,10,200.5,1,2026-11-09 10:30:00,Asia/Hong_Kong,长期配置';
 await dialog.getByLabel('致富成交文件').setInputFiles({name:'chief-reviewed.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
 await dialog.getByRole('button',{name:'读取并预览',exact:true}).click();
 await expect(dialog.locator('.broker-import-preview')).toContainText('FILL-001');
 await expect(dialog.getByRole('button',{name:'确认导入 1 条',exact:true})).toBeDisabled();
 await dialog.getByRole('checkbox').check();
 await dialog.getByRole('button',{name:'确认导入 1 条',exact:true}).click();
 await expect(dialog).toContainText('已导入 1 条，跳过 0 条');
 await expect(page.locator('.journal-section tbody')).toContainText('致富导入');
 expect(insertCalls).toBe(1);
 await dialog.getByRole('button',{name:'完成',exact:true}).click();
 await page.getByRole('button',{name:'致富成交导入',exact:true}).click();
 await dialog.getByLabel('致富成交文件').setInputFiles({name:'chief-reviewed.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
 await dialog.getByRole('button',{name:'读取并预览',exact:true}).click();
 await dialog.getByRole('checkbox').check();
 await dialog.getByRole('button',{name:'确认导入 1 条',exact:true}).click();
 await expect(dialog).toContainText('已导入 0 条，跳过 1 条');
 expect(insertCalls).toBe(1);
 await dialog.getByRole('button',{name:'完成',exact:true}).click();
 savedRows=savedRows.map(row=>({...row,quantity:'11'}));
 await page.getByRole('button',{name:'致富成交导入',exact:true}).click();
 await dialog.getByLabel('致富成交文件').setInputFiles({name:'chief-reviewed.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
 await dialog.getByRole('button',{name:'读取并预览',exact:true}).click();
 await dialog.getByRole('checkbox').check();
 await dialog.getByRole('button',{name:'确认导入 1 条',exact:true}).click();
 await expect(dialog.getByRole('alert')).toContainText('该成交编号已存在，但内容不同');
 expect(insertCalls).toBe(1);
 await expect(dialog.getByRole('button',{name:'确认导入 1 条',exact:true})).toBeEnabled();
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 await dialog.screenshot({path:'artifacts/chief-import-preview-mobile.png'});
});
test('manually enters Chief executions, invalidates edited previews and skips a later file duplicate',async({page})=>{
 await signedIn(page);
 let savedRows:Record<string,unknown>[]=[],insertCalls=0;
 await page.route('https://test-project.supabase.co/rest/v1/trades**',route=>{
  if(route.request().method()==='POST'){
   insertCalls++;
   const inputs=route.request().postDataJSON() as Record<string,unknown>[];
   const saved=inputs.map(row=>({...row,user_id:user.id,revision:1,created_at:new Date().toISOString(),updated_at:new Date().toISOString()}));
   savedRows.push(...saved);
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(saved)});
  }
  const ids=new URL(route.request().url()).searchParams.get('id');
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(ids?savedRows.filter(row=>ids.includes(String(row.id))):savedRows)});
 });
 await page.route('**/functions/v1/market-data',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"MARKET_UNAVAILABLE"}'}));
 await page.goto('/journal');
 await page.getByRole('button',{name:'致富成交导入',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'致富成交记录导入'});
 await dialog.getByRole('button',{name:'手动输入',exact:true}).click();
 await dialog.getByRole('button',{name:'预览成交',exact:true}).click();
 await expect(dialog.locator('.broker-import-preview')).toHaveCount(0);
 const first=dialog.getByRole('region',{name:'第 1 笔成交',exact:true});
 await first.getByLabel('成交编号',{exact:true}).fill('FILL-001');
 await first.getByLabel('股票代码',{exact:true}).fill('aapl');
 await first.getByLabel('公司名称',{exact:true}).fill('Apple');
 await first.getByLabel('数量',{exact:true}).fill('10');
 await first.getByLabel('成交价格（USD）',{exact:true}).fill('200.50');
 await first.getByLabel('手续费（USD）',{exact:true}).fill('1');
 await first.getByLabel('成交时间',{exact:true}).fill('2026-11-09T10:30');
 await first.getByLabel('备注（选填）',{exact:true}).fill('长期配置');
 await dialog.getByRole('button',{name:'预览成交',exact:true}).click();
 await expect(dialog.locator('.broker-import-preview')).toContainText('AAPL');
 await expect(dialog.getByRole('button',{name:'确认导入 1 条',exact:true})).toBeDisabled();
 await dialog.getByRole('checkbox').check();
 await first.getByLabel('数量',{exact:true}).fill('11');
 await expect(dialog.locator('.broker-import-preview')).toHaveCount(0);
 await expect(dialog.getByRole('button',{name:'确认导入',exact:true})).toBeDisabled();
 await first.getByLabel('数量',{exact:true}).fill('10');
 await dialog.getByRole('button',{name:'添加一笔成交',exact:true}).click();
 const second=dialog.getByRole('region',{name:'第 2 笔成交',exact:true});
 await second.getByLabel('成交编号',{exact:true}).fill('FILL-002');
 await second.getByLabel('股票代码',{exact:true}).fill('MSFT');
 await second.getByLabel('公司名称',{exact:true}).fill('Microsoft');
 await second.getByLabel('交易方向',{exact:true}).selectOption('sell');
 await second.getByLabel('数量',{exact:true}).fill('2');
 await second.getByLabel('成交价格（USD）',{exact:true}).fill('400');
 await second.getByLabel('手续费（USD）',{exact:true}).fill('0');
 await second.getByLabel('成交时间',{exact:true}).fill('2026-11-09T11:30');
 await dialog.getByRole('button',{name:'添加一笔成交',exact:true}).click();
 await dialog.getByRole('button',{name:'删除第 3 笔成交',exact:true}).click();
 await dialog.getByRole('button',{name:'文件导入',exact:true}).click();
 await dialog.getByRole('button',{name:'手动输入',exact:true}).click();
 await expect(first.getByLabel('成交编号',{exact:true})).toHaveValue('FILL-001');
 await expect(second.getByLabel('成交编号',{exact:true})).toHaveValue('FILL-002');
 await dialog.getByRole('button',{name:'预览成交',exact:true}).click();
 await expect(dialog.locator('.broker-import-preview tbody tr')).toHaveCount(2);
 await dialog.locator('.broker-import-body').evaluate(element=>{element.scrollTop=0;});
 await dialog.screenshot({path:'artifacts/chief-manual-input-desktop.png'});
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 expect(await dialog.locator('.broker-manual-entry').first().evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
 await dialog.locator('.broker-import-body').evaluate(element=>{element.scrollTop=0;});
 await dialog.screenshot({path:'artifacts/chief-manual-input-mobile.png'});
 await dialog.getByRole('checkbox').check();
 await dialog.getByRole('button',{name:'确认导入 2 条',exact:true}).click();
 await expect(dialog).toContainText('已导入 2 条，跳过 0 条');
 expect(insertCalls).toBe(1);
 expect(savedRows).toEqual(expect.arrayContaining([expect.objectContaining({symbol:'AAPL',quantity:'10',occurred_at:'2026-11-09T02:30:00Z'}),expect.objectContaining({symbol:'MSFT',side:'sell',fees:'0'})]));
 await dialog.getByRole('button',{name:'完成',exact:true}).click();
 await page.getByRole('button',{name:'致富成交导入',exact:true}).click();
 const csv=chiefColumns.join(',')+'\nFILL-001,AAPL,Apple,NASDAQ,USD,买入,10,200.5,1,2026-11-09 10:30:00,Asia/Hong_Kong,长期配置';
 await dialog.getByLabel('致富成交文件').setInputFiles({name:'chief-reviewed.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
 await dialog.getByRole('button',{name:'读取并预览',exact:true}).click();
 await dialog.getByRole('checkbox').check();
 await dialog.getByRole('button',{name:'确认导入 1 条',exact:true}).click();
 await expect(dialog).toContainText('已导入 0 条，跳过 1 条');
 expect(insertCalls).toBe(1);
});

async function signedIn(page:Page,watchlist:unknown[]=[]) {
 await page.addInitScript(user=>{
  localStorage.setItem('sb-test-project-auth-token',JSON.stringify({user,access_token:'browser-test-access-token',refresh_token:'browser-test-refresh-token',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',expires_in:3600}));
 },user);
 await page.route('https://test-project.supabase.co/rest/v1/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/monitor_workspace'))return route.fulfill({status:404,contentType:'application/json',body:'{"message":"not available in this fixture"}'});
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(path.endsWith('/watchlist')?watchlist:path.endsWith('/profiles')?{user_id:user.id,baseline_date:'2026-06-01'}:[])});
 });
 await page.route('https://test-project.supabase.co/auth/v1/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(user)}));
}

test('keeps a requested sentiment URL through sign-in and reuses its data across page switches',async({page})=>{
 let volatilityRequests=0;
 await page.route('https://test-project.supabase.co/auth/v1/**',route=>{
  const token=new URL(route.request().url()).pathname.endsWith('/token');
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(token?{user,access_token:'browser-test-access-token',refresh_token:'browser-test-refresh-token',expires_in:3600,token_type:'bearer'}:user)});
 });
 await page.route('https://test-project.supabase.co/rest/v1/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({watchlist:[],trades:[],profile:{user_id:user.id,baseline_date:'2026-06-01'},quotes:{},histories:{},volatility:{}})}));
 await page.route('**/functions/v1/market-data',route=>{
  const body=route.request().postDataJSON();
  if(body.action==='volatility')volatilityRequests++;
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body.action==='volatility'?fixtureIndex(body.symbol):{})});
 });
 await page.goto('/sentiment');
 await expect(page.locator('.auth-card')).toBeVisible();
 await expect(page.locator('#volSection')).toHaveCount(0);
 expect(volatilityRequests).toBe(0);
 await page.locator('.auth-card input[type=email]').fill('browser-test@example.com');
 await page.locator('.auth-card input[type=password]').fill('browser-test-password');
 await page.locator('.auth-card button[type=submit], .auth-card form button').click();
 await expect(page).toHaveURL(/\/sentiment$/);
 await expect(page.locator('#volSection')).toBeVisible();
 await expect(page.locator('.vol-price-line > strong')).toHaveText(['19.92','28.97']);
 const requests=volatilityRequests,navigation=page.getByRole('navigation',{name:'页面切换'});
 await navigation.getByRole('link',{name:'美股监测',exact:true}).click();
 await expect(page.locator('#volSection')).toBeHidden();
 await navigation.getByRole('link',{name:'美股市场分析',exact:true}).click();
 await expect(page.locator('#volSection')).toBeVisible();
 expect(volatilityRequests).toBe(requests);
 await page.reload();
 await expect(page).toHaveURL(/\/sentiment$/);
 await expect(page.locator('#volSection')).toBeVisible();
});

test('uses the historical close and currency from prepared data even with gaps and a different latest quote',async({page})=>{
 const hongKong={...stock,symbol:'0700',currency:'HKD',exchange:'HKEX',timezone:'Asia/Hong_Kong',baseline_price:'100'};
 const other={...stock,id:'33333333-3333-4333-8333-333333333333',symbol:'OTHER'};
 await signedIn(page,[hongKong,other]);
 await page.route('https://test-project.supabase.co/rest/v1/rpc/monitor_workspace',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({watchlist:[hongKong,other],trades:[],profile:{user_id:user.id,baseline_date:'2026-06-01'},quotes:{[hongKong.id]:{symbol:hongKong.symbol,exchange:hongKong.exchange,currency:'HKD',price:'999',change_percent:'5',as_of:'2026-10-29T20:00:00Z',fetched_at:new Date().toISOString(),market_open:false,source:'prepared',cached:true,stale:true}},histories:{[hongKong.id]:[{date:'2026-06-01',open:'100',close:'100'},{date:'2026-06-03',open:'120',close:'123.45678'}],[other.id]:[{date:'2026-06-02',open:'200',close:'200'}]},volatility:{VIX:indexData('VIX'),VXN:indexData('VXN')}})}));
 await page.route('**/functions/v1/market-data',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"MARKET_UNAVAILABLE"}'}));
 await page.goto('/');
 await expect(page.locator('.wl-row').first().locator('.price')).toContainText('HKD 999.00');
 await page.locator('.tags').getByRole('button',{name:'0700',exact:true}).click();
 expect(await hoverHistoryPoint(page,'0700','2026-06-03')).toEqual({title:['2026-06-03'],lines:[' 0700 HKD 123.46 (收盘)  +23.46%']});
});

test('renders the previous complete workspace while record and market requests are still pending',async({page})=>{
 await signedIn(page,[stock]);
 await page.addInitScript(({stock,user,indexes})=>{
  localStorage.setItem(`equity-workspace-v1:${user.id}`,JSON.stringify({watchlist:[stock],quotes:{[stock.id]:{symbol:stock.symbol,exchange:stock.exchange,currency:'USD',price:'210',change_percent:'5',as_of:'2026-10-29T20:00:00Z',fetched_at:'2026-10-30T00:00:00Z',market_open:false,source:'cached test',stale:false}},histories:{[stock.id]:[{date:'2026-06-01',open:'200',close:'200'},{date:'2026-10-29',open:'209',close:'210'}]},volatility:indexes,baselineDate:'2026-06-01'}));
 },{stock,user,indexes:{VIX:indexData('VIX'),VXN:indexData('VXN')}});
 await page.route('https://test-project.supabase.co/rest/v1/**',async route=>{await new Promise(resolve=>setTimeout(resolve,5000));await route.fulfill({status:503,contentType:'application/json',body:'{"message":"slow"}'});});
 await page.route('**/functions/v1/market-data',async route=>{await new Promise(resolve=>setTimeout(resolve,5000));await route.fulfill({status:503,contentType:'application/json',body:'{"error":"MARKET_UNAVAILABLE"}'});});
 await page.goto('/');
 await expect(page.locator('.wl-row .price')).toContainText('$210.00');
 await expect(page.locator('.chart-empty')).toHaveCount(0);
 await expect(page.locator('#volSection .vol-price-line > strong')).toHaveText(['21.00','21.00']);
 await expect(page.locator('.prepared-note')).toContainText('上次行情');
});

test('loads the whole prepared workspace in one request on a new browser',async({page})=>{
 await signedIn(page,[stock]);
 await page.route('https://test-project.supabase.co/rest/v1/rpc/monitor_workspace',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({watchlist:[stock],trades:[],profile:{user_id:user.id,baseline_date:'2026-06-01'},quotes:{[stock.id]:{symbol:stock.symbol,exchange:stock.exchange,currency:'USD',price:'210',change_percent:'5',as_of:'2026-10-29T20:00:00Z',fetched_at:'2026-10-30T00:00:00Z',market_open:false,source:'prepared',cached:true,stale:true}},histories:{[stock.id]:[{date:'2026-06-01',close:'200'},{date:'2026-10-29',close:'210'}]},volatility:{VIX:indexData('VIX'),VXN:indexData('VXN')}})}));
 await page.route('**/functions/v1/market-data',async route=>{await new Promise(resolve=>setTimeout(resolve,5000));await route.fulfill({status:503,contentType:'application/json',body:'{"error":"MARKET_UNAVAILABLE"}'});});
 await page.goto('/');
 await expect(page.locator('.wl-row .price')).toContainText('$210.00');
 await expect(page.locator('.chart-empty')).toHaveCount(0);
 await expect(page.locator('#volSection .vol-price-line > strong')).toHaveText(['21.00','21.00']);
});
test('loads both indexes before slow equity quotes finish',async({page})=>{
 await signedIn(page,[{id:'22222222-2222-4222-8222-222222222222',user_id:user.id,symbol:'AAPL',name:'Apple',exchange:'NASDAQ',currency:'USD',timezone:'America/New_York',baseline_date:'2026-06-01',baseline_at:'2026-06-01T04:00:00Z',baseline_timezone:'America/New_York',baseline_price:'200',alert_percent:'-30',notes:'',revision:1,created_at:'2026-10-29T00:00:00Z',updated_at:'2026-10-29T00:00:00Z'}]);
 let equityFinished=false;
 await page.route('**/functions/v1/market-data',async route=>{
  const body=route.request().postDataJSON();
  if(body.action==='quotes')return route.fulfill({status:503,contentType:'application/json',body:'{"error":"MARKET_CONFIG"}'});
  if(body.action==='volatility')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(indexData(body.symbol))});
  await new Promise(resolve=>setTimeout(resolve,8000));equityFinished=true;
  await route.fulfill({status:503,contentType:'application/json',body:'{"error":"MARKET_UNAVAILABLE"}'});
 });
 await page.goto('/sentiment');
 await expect(page.locator('#volSection .vol-price-line > strong')).toHaveText(['21.00','21.00']);
 expect(equityFinished).toBe(false);
 await expect(page.getByRole('navigation',{name:'页面切换'}).getByRole('link',{name:'美股监测',exact:true})).toBeVisible();
});
test('loads indexes for an empty watchlist, retries failures and retains dated data',async({page})=>{
 await signedIn(page);
 let failures=true;
 await page.route('**/functions/v1/market-data',route=>{
  const body=route.request().postDataJSON();
  if(body.action==='quotes')return route.fulfill({status:503,contentType:'application/json',body:'{"error":"MARKET_CONFIG"}'});
  return route.fulfill({status:failures?503:200,contentType:'application/json',body:JSON.stringify(failures?{error:'MARKET_UNAVAILABLE'}:indexData(body.symbol))});
 });
 await page.goto('/sentiment');
 await expect(page.locator('#volSection')).toContainText('官方指数服务暂不可用');
 failures=false;
 await page.getByRole('button',{name:'重新加载 VIX',exact:true}).click();
 await page.getByRole('button',{name:'重新加载 VXN',exact:true}).click();
 await expect(page.locator('#volSection .vol-price-line > strong')).toHaveText(['21.00','21.00']);
 failures=true;
 await page.getByRole('button',{name:'重新加载 VIX',exact:true}).click();
 const vix=page.locator('.vol-card').filter({has:page.locator('b',{hasText:'VIX'})});
 await expect(vix).toContainText('保留上次数据');
 await expect(vix).toContainText('2026-10-29');
 await expect(vix).toContainText('缓存／已过期');
 await expect(vix.locator('.vol-price-line > strong')).toHaveText('21.00');
 await expect(page.locator('.market-sentiment')).toContainText('数据已过期');
 await expect(vix.locator('.index-sentiment')).toContainText('数据已过期');
 await expect(page.locator('.vol-card').last().locator('.index-sentiment')).not.toContainText('数据已过期');
});

test('renders the sentiment subpage, fits mobile and updates when indexes reload',async({page})=>{
 await signedIn(page);
 let rising=false;
 await page.route('**/functions/v1/market-data',route=>{
  const body=route.request().postDataJSON();
  if(body.action!=='volatility')return route.fulfill({status:503,contentType:'application/json',body:'{"error":"MARKET_CONFIG"}'});
  const data=fixtureIndex(body.symbol,rising?barsFrom(Array.from({length:20},(_,i)=>15+i)):undefined);
  if(!rising)data.bars=[{date:'2026-10-12',close:data.bars[0].close},...data.bars];
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.setViewportSize({width:1440,height:1000});
 await page.goto('/sentiment');
 const sentiment=page.locator('.market-sentiment');
 await expect(sentiment).toContainText('紧张缓解，仍需确认');
 await expect(sentiment).toContainText('+4.49%');
 await expect(sentiment).toContainText('+6.78%');
 await expect(sentiment).toContainText('2026-11-09');
 const vixAnalysis=page.locator('.vol-card').first().locator('.index-sentiment');
 const vxnAnalysis=page.locator('.vol-card').last().locator('.index-sentiment');
 await expect(vixAnalysis).toContainText('美国大盘情绪');
 await expect(vixAnalysis).toContainText('不衡量经济增长');
 await expect(vixAnalysis).toContainText('+4.49%');
 await expect(vxnAnalysis).toContainText('科技权重板块情绪');
 await expect(vxnAnalysis).toContainText('也包含消费、医药等行业');
 await expect(vxnAnalysis).toContainText('+6.78%');
 const chartBounds=await page.locator('.vol-grid').boundingBox(),sentimentBounds=await sentiment.boundingBox();
 expect(sentimentBounds!.y+sentimentBounds!.height).toBeLessThanOrEqual(chartBounds!.y);
 await expect(vixAnalysis.locator('.index-definition')).toBeVisible();
 await expect(vxnAnalysis.locator('.index-definition')).toBeVisible();
 await expect(page.locator('.index-sentiment summary')).toHaveCount(0);
 await sentiment.locator('summary').click();
 await expect(sentiment.locator('.sentiment-evidence')).toBeVisible();
 await sentiment.locator('summary').click();
 const vixCard=page.locator('.vol-card').first();
 const chartLength=()=>vixCard.locator('canvas').evaluate(async canvas=>{
  const path=performance.getEntriesByType('resource').find(entry=>new URL(entry.name).pathname.endsWith('/chart__js_auto.js'))!.name;
  const {default:Chart}=await import(path) as typeof import('chart.js/auto');
  return Chart.getChart(canvas as HTMLCanvasElement)!.data.labels!.length;
 });
 await expect.poll(chartLength).toBe(21);
 const hoverPoint=await vixCard.locator('canvas').evaluate(async canvas=>{
  const path=performance.getEntriesByType('resource').find(entry=>new URL(entry.name).pathname.endsWith('/chart__js_auto.js'))!.name;
  const {default:Chart}=await import(path) as typeof import('chart.js/auto');
  const chart=Chart.getChart(canvas as HTMLCanvasElement)!;
  const index=chart.data.labels!.indexOf('2026-11-09');
  return (chart.getDatasetMeta(0).data[index] as import('chart.js').PointElement).getCenterPoint();
 });
 await vixCard.locator('canvas').hover({position:hoverPoint});
 await expect.poll(()=>vixCard.locator('canvas').evaluate(async canvas=>{
  const path=performance.getEntriesByType('resource').find(entry=>new URL(entry.name).pathname.endsWith('/chart__js_auto.js'))!.name;
  const {default:Chart}=await import(path) as typeof import('chart.js/auto');
  const tooltip=Chart.getChart(canvas as HTMLCanvasElement)!.tooltip!;
  return {title:tooltip.title,lines:tooltip.body?.flatMap(row=>row.lines)};
 })).toEqual({title:['2026-11-09'],lines:['VIX  19.92']});
 await page.mouse.move(0,0);
 const ranges=vixCard.getByRole('group',{name:'VIX 图表范围'});
 await ranges.getByRole('button',{name:'近 20 日',exact:true}).click();
 await expect(ranges.getByRole('button',{name:'近 20 日',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect.poll(chartLength).toBe(20);
 await ranges.getByRole('button',{name:'全部',exact:true}).click();
 await expect.poll(chartLength).toBe(21);
 await page.locator('#volSection').screenshot({path:'artifacts/sentiment-redesign-desktop.png'});
 await page.setViewportSize({width:390,height:844});
 await expect(sentiment.getByRole('heading',{name:'市场情绪分析'})).toBeVisible();
 await expect.poll(async()=>Math.max(...await page.locator('.vol-card').evaluateAll(cards=>cards.map(card=>card.getBoundingClientRect().right)))).toBeLessThanOrEqual(390);
 await expect(page.locator('.vol-price-line > strong').first()).toBeInViewport();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 await page.locator('#volSection').screenshot({path:'artifacts/sentiment-redesign-mobile.png'});
 const mobileTabs=page.getByRole('group',{name:'选择查看的指数'});
 await expect(vxnAnalysis).toBeHidden();
 await mobileTabs.getByRole('button',{name:'VXN 科技权重板块',exact:true}).click();
 await expect(vxnAnalysis).toBeVisible();
 await expect(vixAnalysis).toBeHidden();
 await expect(mobileTabs.getByRole('button',{name:'VXN 科技权重板块',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.locator('#volSection').screenshot({path:'artifacts/sentiment-redesign-mobile-vxn.png'});
 await mobileTabs.getByRole('button',{name:'VIX 美国大盘',exact:true}).click();
 await expect(vixAnalysis).toBeVisible();
 await page.setViewportSize({width:1440,height:1000});
 rising=true;
 await page.getByRole('button',{name:'重新加载 VIX',exact:true}).click();
 await expect(vixAnalysis).toContainText('紧张升温，谨慎观察');
 await expect(vxnAnalysis).toContainText('紧张缓解，仍需确认');
 await expect(sentiment).toContainText('信号分歧，等待确认');
 await page.getByRole('button',{name:'重新加载 VXN',exact:true}).click();
 await expect(vxnAnalysis).toContainText('紧张升温，谨慎观察');
 await expect(sentiment).toContainText('紧张升温，谨慎观察');
 await page.getByRole('button',{name:'刷新两个指数',exact:true}).click();
 await expect(page.getByRole('button',{name:'刷新两个指数',exact:true})).toBeEnabled();
});
test('shows independent loading states for a delayed index',async({page})=>{
 await signedIn(page);
 await page.route('**/functions/v1/market-data',async route=>{
  const body=route.request().postDataJSON();
  if(body.action==='quotes')return route.fulfill({status:503,contentType:'application/json',body:'{"error":"MARKET_CONFIG"}'});
  if(body.symbol==='VXN')await new Promise(resolve=>setTimeout(resolve,1500));
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(indexData(body.symbol))});
 });
 await page.goto('/sentiment');
 await expect(page.locator('.vol-card').first().locator('.vol-price-line > strong')).toHaveText('21.00');
 await expect(page.locator('.vol-card').last()).toContainText('正在加载官方日收盘数据');
 await expect(page.locator('#volSection .vol-price-line > strong')).toHaveText(['21.00','21.00']);
});
test('automatically loads all imported stocks after records arrive',async({page})=>{
 const stocks=Array.from({length:20},(_,index)=>({...stock,id:`22222222-2222-4222-8222-${String(index).padStart(12,'0')}`,symbol:`TEST${index}`}));
 await signedIn(page,stocks);
 const quoted=new Set<string>();
 await page.route('**/functions/v1/market-data',route=>{
  const body=route.request().postDataJSON();
  if(body.action==='quotes')return route.fulfill({status:503,contentType:'application/json',body:'{"error":"MARKET_CONFIG"}'});
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
  if(body.action==='quotes')return route.fulfill({status:503,contentType:'application/json',body:'{"error":"MARKET_CONFIG"}'});
  const data=body.action==='volatility'?indexData(body.symbol):body.action==='quote'?{...body.instrument,price:'210',change_percent:'5',as_of:'2026-10-29T20:00:00Z',fetched_at:'2026-10-30T00:00:00Z',market_open:false,source:'test',stale:false}:{error:'HISTORY_EMPTY'};
  return route.fulfill({status:body.action==='history'?404:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.goto('/');
 await expect(page.locator('.wl-row .price')).toContainText('$210.00');
 await expect(page.locator('.wl-row .net')).toHaveText('+5.0%');
 await expect(page.locator('.chart-empty')).toHaveCount(1);
});

test('deletes a stock during background refresh and keeps it deleted on reload',async({page})=>{
 await signedIn(page,[stock]);
 let records=[stock],deletes=0;
 await page.route('https://test-project.supabase.co/rest/v1/watchlist**',async route=>{
  if(route.request().method()==='DELETE') {
   deletes++;records=[];
   await new Promise(resolve=>setTimeout(resolve,200));
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{id:stock.id}])});
  }
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(records)});
 });
 let releaseQuote!:()=>void;
 const quotePending=new Promise<void>(resolve=>{releaseQuote=resolve;});
 await page.route('**/functions/v1/market-data',async route=>{
  const body=route.request().postDataJSON();
  if(body.action==='quotes')return route.fulfill({status:503,contentType:'application/json',body:'{"error":"MARKET_CONFIG"}'});
  if(body.action==='volatility')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(indexData(body.symbol))});
  await quotePending;
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...stock,price:'210',change_percent:'5',as_of:'2026-10-29T20:00:00Z',fetched_at:'2026-10-30T00:00:00Z',market_open:false,source:'test',stale:false})});
 });
 // Electron may not provide a native window.confirm; deletion must use the app dialog.
 await page.addInitScript(()=>{window.confirm=()=>{throw new Error('Native confirmation unavailable');};});
 await page.goto('/');
 await expect(page.getByRole('button',{name:'刷新美股行情',exact:true})).toBeDisabled();
 const remove=page.getByRole('button',{name:'删除 AAPL',exact:true});
 await expect(remove).toBeEnabled();
 await remove.click();
 await expect(page.getByRole('dialog',{name:'删除自选股票'})).toContainText('AAPL');
 await page.getByRole('button',{name:'取消',exact:true}).click();
 expect(deletes).toBe(0);
 await expect(page.locator('.wl-row')).toHaveCount(1);
 await remove.click();
 await page.getByRole('button',{name:'确认删除',exact:true}).click();
 await expect(page.getByRole('button',{name:'正在删除…',exact:true})).toBeDisabled();
 await expect(page.locator('.wl-row')).toHaveCount(0);
 await expect(page.getByRole('status')).toContainText('AAPL 已从自选列表删除');
 expect(deletes).toBe(1);
 releaseQuote();
 await page.reload();
 await expect(page.locator('.wl-header')).toContainText('0 stocks');
 await expect(page.locator('.wl-row')).toHaveCount(0);
});

test('keeps the stock visible when deletion fails and lets the user retry',async({page})=>{
 await signedIn(page,[stock]);
 await page.route('**/functions/v1/market-data',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:route.request().postDataJSON().action==='quotes'?'MARKET_CONFIG':'MARKET_UNAVAILABLE'})}));
 let failed=true,deletes=0;
 await page.route('https://test-project.supabase.co/rest/v1/watchlist**',route=>{
  if(route.request().method()!=='DELETE')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([stock])});
  deletes++;
  return route.fulfill({status:failed?503:200,contentType:'application/json',body:JSON.stringify(failed?{message:'unavailable'}:[{id:stock.id}])});
 });
 await page.goto('/');
 await page.getByRole('button',{name:'删除 AAPL detail',exact:true}).click();
 await page.getByRole('button',{name:'确认删除',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('请求未完成');
 await expect(page.locator('.wl-row')).toHaveCount(1);
 failed=false;
 await page.getByRole('button',{name:'确认删除',exact:true}).click();
 await expect(page.locator('.wl-row')).toHaveCount(0);
 expect(deletes).toBe(2);
});

test('shows a full quote batch before slow histories and reuses curves on refresh',async({page})=>{
 const stocks=Array.from({length:20},(_,index)=>({...stock,id:`22222222-2222-4222-8222-${String(index).padStart(12,'0')}`,symbol:`FAST${index}`}));
 await signedIn(page,stocks);
 let batches=0,histories=0,activeHistories=0,maximumHistories=0;
 let releaseHistories!:()=>void;
 const pending=new Promise<void>(resolve=>{releaseHistories=resolve;});
 await page.route('**/functions/v1/market-data',async route=>{
  const body=route.request().postDataJSON();
  if(body.action==='volatility')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(indexData(body.symbol))});
  if(body.action==='quotes'){
   batches++;
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({quotes:[...body.instruments].reverse().map((item:typeof stock)=>({symbol:item.symbol,exchange:item.exchange,quote:{...item,price:'210',change_percent:'5',as_of:'2026-10-29T20:00:00Z',fetched_at:'2026-10-30T00:00:00Z',source:'test',stale:false,market_open:false}}))})});
  }
  expect(body.action).toBe('history');histories++;activeHistories++;maximumHistories=Math.max(maximumHistories,activeHistories);
  await pending;activeHistories--;
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({currency:'USD',exchange:'NASDAQ',bars:[{date:'2026-06-01',open:'200',close:'200'},{date:'2026-10-29',open:'209',close:'210'}]})});
 });
 await page.goto('/');
 await expect(page.locator('.wl-row .price')).toHaveText(Array(20).fill('$210.00'));
 expect(batches).toBe(1);
 await expect.poll(()=>histories).toBe(6);
 expect(maximumHistories).toBe(6);
 releaseHistories();
 await expect(page.getByRole('button',{name:'刷新美股行情',exact:true})).toBeEnabled();
 expect(histories).toBe(20);
 await page.locator('.top-info button').first().click();
 await expect.poll(()=>batches).toBe(2);
 await expect(page.getByRole('button',{name:'刷新美股行情',exact:true})).toBeEnabled();
 expect(histories).toBe(20);
 await expect(page.locator('.chart-empty')).toHaveCount(0);
});
