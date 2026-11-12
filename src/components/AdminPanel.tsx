import {useEffect,useState} from 'react';
import {RefreshCw,Search,Users,ShieldCheck} from 'lucide-react';
import {loadAdminOverview,loadAdminUser,type AdminOverview,type AdminUserDetail,type AdminTrade} from '../lib/admin';
import type {Trade,WatchItem} from '../lib/types';
import {formatTime} from '../lib/time';
import './admin.css';

const date=(value:string|null|undefined)=>value?formatTime(value,'Asia/Shanghai','zh'):'—';

function RecordDetails({record}:{record:Trade|WatchItem}){
 return <details className="admin-record-details"><summary>记录详情</summary><dl>
  <dt>公司</dt><dd>{record.name}</dd><dt>记录 ID</dt><dd>{record.id}</dd><dt>用户 ID</dt><dd>{record.user_id}</dd>
  <dt>创建时间</dt><dd>{date(record.created_at)}</dd><dt>修改时间</dt><dd>{date(record.updated_at)}</dd>
  <dt>交易所时区</dt><dd>{record.timezone}</dd><dt>版本</dt><dd>{record.revision}</dd><dt>备注</dt><dd>{record.notes||'—'}</dd>
 </dl></details>;
}

function AdminTrades({trades,onUser}:{trades:(Trade|AdminTrade)[];onUser?:(id:string)=>void}){
 return <div className="table-scroll"><table><thead><tr>{onUser&&<th>用户</th>}<th>股票 / 交易所</th><th>方向</th><th>数量</th><th>每股价格</th><th>手续费</th><th>成交时间 / 时区</th>{onUser&&<th>录入时间</th>}<th>详情</th></tr></thead><tbody>{trades.map(trade=><tr key={trade.id}>
  {onUser&&<td><button className="admin-user-link" onClick={()=>onUser(trade.user_id)}>{'email'in trade?trade.email:trade.user_id}</button></td>}
  <td><strong>{trade.symbol}</strong><small>{trade.exchange}</small></td><td className={trade.side==='buy'?'up':'down'}>{trade.side==='buy'?'买入':'卖出'}</td><td>{trade.quantity}</td><td>{trade.price} {trade.currency}</td><td>{trade.fees} {trade.currency}</td>
  <td>{formatTime(trade.occurred_at,trade.record_timezone,'zh')}<small>{trade.record_timezone}</small></td>{onUser&&<td>{date(trade.created_at)}</td>}<td><RecordDetails record={trade}/></td>
 </tr>)}</tbody></table>{!trades.length&&<p className="admin-empty">暂无交易记录。</p>}</div>;
}

export function AdminPanel({onRevoked}:{onRevoked:()=>void}){
 const [query,setQuery]=useState(''),[search,setSearch]=useState(''),[offset,setOffset]=useState(0),[selectedId,setSelectedId]=useState<string|null>(null),[tradeOffset,setTradeOffset]=useState(0);
 const [overview,setOverview]=useState<AdminOverview|null>(null),[detail,setDetail]=useState<AdminUserDetail|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[refresh,setRefresh]=useState(0),[auto,setAuto]=useState(true);
 useEffect(()=>{
  const controller=new AbortController();let running=false;
  async function fetchData(){
   if(running||controller.signal.aborted)return;
   running=true;setBusy(true);
   try{
    const [nextOverview,nextDetail]=await Promise.all([loadAdminOverview(search,offset,controller.signal),selectedId?loadAdminUser(selectedId,tradeOffset,controller.signal):Promise.resolve(null)]);
    if(controller.signal.aborted)return;
    setOverview(nextOverview);setDetail(nextDetail);setError('');
   }catch(cause){
    if(controller.signal.aborted)return;
    if(cause instanceof Error&&cause.message==='ADMIN_FORBIDDEN'){setOverview(null);setDetail(null);onRevoked();return;}
    if(cause instanceof Error&&cause.message==='USER_NOT_FOUND'){setSelectedId(null);setDetail(null);setError('该用户已不存在，请重新选择。');}
    else setError('管理员数据暂时无法更新，请点击刷新重试。');
   }finally{running=false;if(!controller.signal.aborted)setBusy(false);}
  }
  void fetchData();
  const tick=()=>{if(document.visibilityState==='visible')void fetchData();};
  const timer=auto?window.setInterval(tick,10000):undefined;
  if(auto)document.addEventListener('visibilitychange',tick);
  return()=>{controller.abort();if(timer!==undefined)clearInterval(timer);document.removeEventListener('visibilitychange',tick);};
 },[search,offset,selectedId,tradeOffset,refresh,auto,onRevoked]);
 function selectUser(id:string){setSelectedId(id);setTradeOffset(0);setDetail(null);}
 const current=detail?.user.id===selectedId?detail:null;
 return <main className="admin-panel" aria-label="管理员模式">
  <header className="admin-heading"><div><span className="eyebrow">ADMIN WORKSPACE</span><h1><ShieldCheck size={22} aria-hidden="true"/>管理员模式</h1><p>查看注册用户的账号资料、自选股、持仓统计和交易记录。</p></div><div className="admin-refresh"><label><input type="checkbox" checked={auto} onChange={event=>setAuto(event.target.checked)}/>每 10 秒自动更新</label><button className="secondary" disabled={busy} onClick={()=>setRefresh(value=>value+1)}><RefreshCw size={15} className={busy?'spin':''}/>{busy?'更新中…':'刷新数据'}</button></div></header>
  <p className="admin-update" role="status">{overview?`最近更新：${date(overview.fetched_at)}`:'正在读取管理员数据…'} · 站内记录</p>
  {error&&<p className="form-error" role="alert">{error}</p>}
  {overview&&<>
   <div className="admin-metrics"><div><span>注册用户</span><strong>{overview.user_count}</strong></div><div><span>自选股记录</span><strong>{overview.watch_count}</strong></div><div><span>交易记录</span><strong>{overview.trade_count}</strong></div></div>
   <section className="admin-section" aria-label="注册用户"><div className="admin-section-head"><h2><Users size={17}/>注册用户</h2><form onSubmit={event=>{event.preventDefault();setSearch(query.trim());setOffset(0);}}><input aria-label="搜索用户邮箱" placeholder="搜索用户邮箱" maxLength={200} value={query} onChange={event=>setQuery(event.target.value)}/><button className="secondary" type="submit"><Search size={14}/>查询</button></form></div>
    <div className="table-scroll"><table><thead><tr><th>邮箱 / 名称</th><th>注册时间</th><th>最近登录</th><th>自选股</th><th>交易</th><th>状态</th><th/></tr></thead><tbody>{overview.users.map(user=><tr key={user.id} className={selectedId===user.id?'admin-user-selected':''}><td>{user.email||'未设置邮箱'}{user.display_name&&<small>{user.display_name}</small>}</td><td>{date(user.created_at)}</td><td>{date(user.last_sign_in_at)}</td><td>{user.watch_count}</td><td>{user.trade_count}</td><td>{user.is_admin?'管理员':user.email_confirmed_at?'已验证':'待验证'}</td><td><button className="secondary" aria-label={`查看 ${user.email??user.id} 数据`} onClick={()=>selectUser(user.id)}>查看数据</button></td></tr>)}</tbody></table></div>
    {!overview.users.length&&<p className="admin-empty">没有匹配的用户。</p>}
    <div className="admin-pagination"><span>共 {overview.filtered_count} 位 · 第 {Math.floor(offset/50)+1} 页</span><button className="secondary" disabled={!offset||busy} onClick={()=>setOffset(value=>Math.max(0,value-50))}>上一页用户</button><button className="secondary" disabled={offset+50>=overview.filtered_count||busy} onClick={()=>setOffset(value=>value+50)}>下一页用户</button></div>
   </section>
   <section className="admin-section" aria-label="最近录入交易"><div className="admin-section-head"><h2>最近录入的买卖记录</h2><span>最新 30 笔 · 按录入时间排列</span></div><AdminTrades trades={overview.recent_trades} onUser={selectUser}/></section>
  </>}
  {selectedId&&!current&&<p className="admin-empty">正在读取所选用户的数据…</p>}
  {current&&<section className="admin-section admin-user-detail" aria-label="用户数据详情"><div className="admin-section-head"><h2>{current.user.email} 的数据</h2><button className="secondary" onClick={()=>{setSelectedId(null);setDetail(null);}}>收起用户详情</button></div>
   <dl className="admin-account"><dt>用户 ID</dt><dd>{current.user.id}</dd><dt>名称</dt><dd>{current.user.display_name||'—'}</dd><dt>邮箱</dt><dd>{current.user.email}</dd><dt>手机号</dt><dd>{current.user.phone||'未提供'}</dd><dt>注册时间</dt><dd>{date(current.user.created_at)}</dd><dt>最近登录</dt><dd>{date(current.user.last_sign_in_at)}</dd><dt>邮箱验证时间</dt><dd>{date(current.user.email_confirmed_at)}</dd><dt>账号更新</dt><dd>{date(current.user.updated_at)}</dd><dt>冻结至</dt><dd>{date(current.user.banned_until)}</dd><dt>界面语言</dt><dd>{current.profile?.language??'未设置'}</dd><dt>显示时区</dt><dd>{current.profile?.timezone??'未设置'}</dd><dt>默认比较日期</dt><dd>{current.profile?.baseline_date??'未设置'}</dd></dl>
   <h3>持仓统计</h3><p className="help">根据该用户全部站内买卖记录计算剩余股数，未连接券商持仓；记录不完整时可能与实际持仓不同。</p>
   <div className="table-scroll"><table><thead><tr><th>股票</th><th>交易所</th><th>币种</th><th>累计买入股数</th><th>累计卖出股数</th><th>剩余股数</th><th>交易笔数</th><th>最近成交</th></tr></thead><tbody>{current.positions.map(position=><tr key={JSON.stringify([position.symbol,position.exchange,position.currency])}><td>{position.symbol}</td><td>{position.exchange}</td><td>{position.currency}</td><td>{position.bought_quantity}</td><td>{position.sold_quantity}</td><td>{position.quantity}{position.quantity.startsWith('-')&&<small>买入记录可能不完整</small>}</td><td>{position.trade_count}</td><td>{date(position.last_trade_at)}</td></tr>)}</tbody></table></div>{!current.positions.length&&<p className="admin-empty">尚未记录买卖。</p>}
   <h3>自选股 · {current.watchlist.length} 只</h3><div className="table-scroll"><table><thead><tr><th>股票 / 公司</th><th>交易所</th><th>币种</th><th>比较起始日期</th><th>实际起始交易日</th><th>起始价</th><th>提醒阈值</th><th>起始时间 / 时区</th><th>详情</th></tr></thead><tbody>{current.watchlist.map(stock=><tr key={stock.id}><td>{stock.symbol}<small>{stock.name}</small></td><td>{stock.exchange}</td><td>{stock.currency}</td><td>{stock.baseline_date}</td><td>{stock.baseline_session??'—'}</td><td>{stock.baseline_price??'未设置'}</td><td>{stock.alert_percent}%</td><td>{formatTime(stock.baseline_at,stock.baseline_timezone,'zh')}<small>{stock.baseline_timezone}</small></td><td><RecordDetails record={stock}/></td></tr>)}</tbody></table></div>
   <h3>交易记录 · 共 {current.trade_count} 笔</h3><AdminTrades trades={current.trades}/><div className="admin-pagination"><span>第 {Math.floor(tradeOffset/100)+1} 页 · 每页 100 笔</span><button className="secondary" disabled={!tradeOffset||busy} onClick={()=>setTradeOffset(value=>Math.max(0,value-100))}>上一页交易</button><button className="secondary" disabled={tradeOffset+100>=current.trade_count||busy} onClick={()=>setTradeOffset(value=>value+100)}>下一页交易</button></div>
  </section>}
 </main>;
}
