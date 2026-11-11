import {useEffect,useState,type MouseEvent} from 'react';

export type AppPage='monitor'|'sentiment'|'journal';
export const pagePaths:Record<AppPage,string>={monitor:'/',sentiment:'/sentiment',journal:'/journal'};

export function pageFromAddress(pathname:string,hash=''):AppPage {
 const path=pathname.replace(/\/+$/,'')||'/';
 if(path==='/sentiment'||path==='/'&&hash==='#volSection')return 'sentiment';
 return path==='/journal'?'journal':'monitor';
}

export function usePageNavigation() {
 const [page,setPage]=useState<AppPage>(()=>pageFromAddress(location.pathname,location.hash));
 useEffect(()=>{
  const synchronize=()=>{
   const next=pageFromAddress(location.pathname,location.hash);
   if(next==='sentiment'&&location.pathname==='/'&&location.hash==='#volSection')history.replaceState(null,'',pagePaths.sentiment);
   setPage(next);
  };
  synchronize();
  addEventListener('popstate',synchronize);
  addEventListener('hashchange',synchronize);
  return()=>{removeEventListener('popstate',synchronize);removeEventListener('hashchange',synchronize);};
 },[]);
 function navigate(next:AppPage) {
  if(location.pathname!==pagePaths[next]||location.search||location.hash)history.pushState(null,'',pagePaths[next]);
  setPage(next);
  scrollTo({top:0,left:0,behavior:'instant'});
 }
 function followLink(event:MouseEvent<HTMLAnchorElement>,next:AppPage) {
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();navigate(next);
 }
 return {page,navigate,followLink};
}
