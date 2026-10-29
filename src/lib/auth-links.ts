export type EmailLink = {token_hash:string;type:'signup'|'recovery'};
export function emailLink(url:string):EmailLink|null {
 const parsed=new URL(url);
 if(parsed.pathname!=='/auth/callback')return null;
 const token=parsed.searchParams.get('token_hash');
 const type=parsed.searchParams.get('type');
 if(!token&&parsed.searchParams.has('code'))return null;
 if(!token||!/^\w{20,256}$/.test(token)||(type!=='signup'&&type!=='recovery'))throw new Error('AUTH_LINK_INVALID');
 return {token_hash:token,type};
}
export function cleanAuthAddress(url:string):string {
 const parsed=new URL(url);
 for(const key of ['token_hash','type','code','error','error_code','error_description'])parsed.searchParams.delete(key);
 parsed.hash='';
 return parsed.pathname+parsed.search;
}
let callbackAttempt:Promise<{recovery:boolean}>|null=null;
export function processEmailLink(url:string,verify:(link:EmailLink)=>Promise<unknown>):Promise<{recovery:boolean}> {
 // Email tokens are single-use; React development StrictMode can mount twice.
 if(callbackAttempt)return callbackAttempt;
 callbackAttempt=(async()=>{const link=emailLink(url);if(!link)return {recovery:false};await verify(link);return {recovery:link.type==='recovery'};})();
 return callbackAttempt;
}
