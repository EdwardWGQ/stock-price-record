import {describe,it,expect} from 'vitest';
import {emailLink,cleanAuthAddress,processEmailLink} from '../src/lib/auth-links';
describe('confirmation and recovery links',()=>{
 it('accepts supported types with token hashes from email on any browser',()=>{
  expect(emailLink('https://stock-atlas.pages.dev/auth/callback?token_hash='+'a'.repeat(64)+'&type=recovery')).toEqual({token_hash:'a'.repeat(64),type:'recovery'});
 });
 it('rejects malformed tokens and unsupported verification types',()=>{
  expect(()=>emailLink('https://stock-atlas.pages.dev/auth/callback?token_hash=short&type=signup')).toThrow();
  expect(()=>emailLink('https://stock-atlas.pages.dev/auth/callback?token_hash='+'a'.repeat(64)+'&type=invite')).toThrow();
 });
 it('removes secrets and error fragments from the visible address after processing',()=>{
  expect(cleanAuthAddress('https://stock-atlas.pages.dev/auth/callback?token_hash=secret&type=recovery#access_token=secret')).toBe('/auth/callback');
 });
 it('ignores normal monitor routes',()=>{expect(emailLink('https://stock-atlas.pages.dev/')).toBeNull();});
 it('allows the default Supabase PKCE callback when custom SMTP templates are unavailable',()=>{expect(emailLink('https://stock-atlas.pages.dev/auth/callback?code=code')).toBeNull();});
 it('verifies a one-time email link once during concurrent component mounts',async()=>{let calls=0;const verify=async()=>{calls++;};const url='https://stock-atlas.pages.dev/auth/callback?token_hash='+'a'.repeat(64)+'&type=recovery';const result=await Promise.all([processEmailLink(url,verify),processEmailLink(url,verify)]);expect(calls).toBe(1);expect(result).toEqual([{recovery:true},{recovery:true}]);});
});
