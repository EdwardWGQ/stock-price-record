import {Activity,ChartNoAxesCombined,NotebookPen} from 'lucide-react';
import type {MouseEvent} from 'react';
import {pagePaths,type AppPage} from '../lib/page-navigation';
import type {Language} from '../lib/types';
import {activeMarket} from '../lib/markets';

export function WorkspaceNav({page,language,onNavigate}:{page:AppPage;language:Language;onNavigate:(event:MouseEvent<HTMLAnchorElement>,page:AppPage)=>void}) {
 const zh=language==='zh';
 const links=[{page:'monitor',name:zh?activeMarket.monitorLabel:'U.S. equity monitor',icon:ChartNoAxesCombined},{page:'sentiment',name:zh?activeMarket.analysisLabel:'U.S. market analysis',icon:Activity},{page:'journal',name:zh?'交易日志':'Trading journal',icon:NotebookPen}] as const;
 return <nav className="workspace-nav" aria-label={zh?'页面切换':'Page navigation'}>{links.map(link=><a key={link.page} className={link.page==='journal'?'workspace-nav-journal':undefined} href={pagePaths[link.page]} aria-current={page===link.page?'page':undefined} onClick={event=>onNavigate(event,link.page)}><link.icon size={17} aria-hidden="true"/><span>{link.name}</span></a>)}</nav>;
}
