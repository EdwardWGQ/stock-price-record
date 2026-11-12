import type {MouseEvent} from 'react';
import type {Language} from '../lib/types';
import type {AppPage} from '../lib/page-navigation';
import {WorkspaceNav} from './WorkspaceNav';
import {MarketSelector} from './MarketSelector';

export function ProductHeader({page,language,workspace,demo,isAdmin=false,adminMode=false,onAdminToggle,onNavigate}:{page:AppPage;language:Language;workspace:boolean;demo:boolean;isAdmin?:boolean;adminMode?:boolean;onAdminToggle?:()=>void;onNavigate:(event:MouseEvent<HTMLAnchorElement>,page:AppPage)=>void}) {
 const zh=language==='zh';
 return <header className="product-header"><div className="product-header-inner">
  <a className="product-brand" href="/" aria-label={zh?'市场观测，返回美股监测':'Market Atlas, U.S. equities home'} onClick={event=>{if(workspace)onNavigate(event,'monitor');}}><svg className="product-symbol" width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true"><rect x="1" y="1" width="34" height="34" rx="10" fill="currentColor" fillOpacity=".1"/><path d="M10 25V18M18 25V12M26 25V8" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><path d="M9 12L16 7L22 9L27 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg><span><b>{zh?'市场观测':'Market Atlas'}</b><small>MARKET ATLAS</small></span></a>
  <div className="product-market"><MarketSelector language={language}/></div>
  {workspace&&<WorkspaceNav page={page} language={language} onNavigate={onNavigate}/>}
  {workspace&&isAdmin&&<button type="button" className="product-admin-button" aria-pressed={adminMode} onClick={onAdminToggle}>{adminMode?'退出管理员模式':'管理员模式'}</button>}
  <span className={`product-session${demo?' product-demo':''}`}><i aria-hidden="true"/>{demo?(zh?'演示模式':'Demo mode'):workspace?(zh?'我的工作台':'My workspace'):(zh?'欢迎访问':'Welcome')}</span>
 </div></header>;
}
