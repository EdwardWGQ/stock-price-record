"""Configure deployment and providers from an ignored local file. Never print credentials."""
from __future__ import annotations
import argparse
import base64
import ctypes
import json
import os
import subprocess
import sys
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
PROJECT = 'lkvvqfhohelebvlzwfcp'
REPO = 'EdwardWGQ/stock-price-record'
ACCOUNT = '1d90b9c72268f9325c5a4c3d2e49196f'
SITE = 'https://stock-atlas.pages.dev'
MARKET_ORIGINS = ','.join([SITE,'https://312901e8.stock-atlas.pages.dev'])

def settings():
    result = dict(os.environ)
    file = ROOT / '.env.operations.local'
    if file.exists():
        for line in file.read_text(encoding='utf-8-sig').splitlines():
            if line.strip() and not line.lstrip().startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                if value.strip():
                    result[key.strip()] = value.strip().strip('"').strip("'")
    return result

def supabase_token(config):
    if config.get('SUPABASE_ACCESS_TOKEN'):
        return config['SUPABASE_ACCESS_TOKEN']
    if sys.platform != 'win32':
        raise RuntimeError('Set SUPABASE_ACCESS_TOKEN or authenticate Supabase CLI on Windows.')
    from ctypes import wintypes
    class Credential(ctypes.Structure):
        _fields_ = [('flags',wintypes.DWORD),('kind',wintypes.DWORD),('target',wintypes.LPWSTR),
            ('comment',wintypes.LPWSTR),('written',wintypes.FILETIME),('size',wintypes.DWORD),
            ('blob',ctypes.POINTER(ctypes.c_ubyte)),('persist',wintypes.DWORD),
            ('attributes_count',wintypes.DWORD),('attributes',ctypes.c_void_p),
            ('alias',wintypes.LPWSTR),('user',wintypes.LPWSTR)]
    api = ctypes.WinDLL('Advapi32.dll')
    api.CredReadW.argtypes = [wintypes.LPCWSTR,wintypes.DWORD,wintypes.DWORD,ctypes.POINTER(ctypes.POINTER(Credential))]
    api.CredReadW.restype = wintypes.BOOL
    api.CredFree.argtypes = [ctypes.c_void_p]
    pointer = ctypes.POINTER(Credential)()
    if not api.CredReadW('Supabase CLI:supabase',1,0,ctypes.byref(pointer)):
        raise RuntimeError('Supabase CLI login is required.')
    try:
        blob = ctypes.string_at(pointer.contents.blob,pointer.contents.size)
    finally:
        api.CredFree(pointer)
    for encoding in ['utf-16-le','utf-8']:
        try:
            value=blob.decode(encoding).strip('\x00')
            if value.startswith('sbp_'): return value
        except UnicodeError:
            continue
    raise RuntimeError('Unsupported Supabase CLI credential format.')

def github_token():
    result = subprocess.run(['git','credential','fill'],input='protocol=https\nhost=github.com\n\n',
        text=True,capture_output=True,check=True,cwd=ROOT)
    fields = dict(line.split('=',1) for line in result.stdout.splitlines() if '=' in line)
    if not fields.get('password'): raise RuntimeError('GitHub login is required.')
    return fields['password']

def request(url, token, method='GET', data=None):
    headers={'Authorization':'Bearer '+token,'Content-Type':'application/json','Accept':'application/json',
        'User-Agent':'US-Equity-Monitor-Setup'}
    req=Request(url,data=json.dumps(data).encode() if data is not None else None,headers=headers,method=method)
    try:
        with urlopen(req,timeout=30) as response:
            body=response.read()
            return json.loads(body) if body else None
    except HTTPError as error:
        # API error bodies can echo submitted values; never write those to stdout.
        parsed=urlparse(url)
        raise RuntimeError(f'{method} {parsed.hostname}{parsed.path} returned HTTP {error.code}') from None

def auth_config(config, custom_templates=False):
    token=supabase_token(config)
    body={'site_url':SITE,'uri_allow_list':','.join([SITE+'/',SITE+'/auth/callback',
        'http://127.0.0.1:5173/','http://127.0.0.1:5173/auth/callback']),
        'password_min_length':6,'password_required_characters':'',
        'mailer_autoconfirm':False,'external_anonymous_users_enabled':False,
        'mailer_secure_email_change_enabled':True}
    if custom_templates:
        body.update({'mailer_templates_confirmation_content':(ROOT/'supabase/templates/confirmation.html').read_text(encoding='utf-8'),
            'mailer_templates_recovery_content':(ROOT/'supabase/templates/recovery.html').read_text(encoding='utf-8'),
            'mailer_subjects_confirmation':'Confirm your account / 验证账户 · US Equity Monitor',
            'mailer_subjects_recovery':'Reset password / 重置密码 · US Equity Monitor'})
    endpoint=f'https://api.supabase.com/v1/projects/{PROJECT}/config/auth'
    request(endpoint,token,'PATCH',body)
    verified=request(endpoint,token)
    for key in ['site_url','uri_allow_list','password_min_length','password_required_characters','mailer_autoconfirm','external_anonymous_users_enabled']:
        if verified.get(key)!=body[key]: raise RuntimeError('Auth config verification failed: '+key)
    if custom_templates and '/auth/callback?token_hash=' not in (verified.get('mailer_templates_recovery_content') or ''):
        raise RuntimeError('Email template verification failed.')
    print('Verified production URL, callback allowlist, password requirements and email confirmation.')

def smtp(config):
    names=['SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASS','SMTP_FROM_EMAIL']
    missing=[name for name in names if not config.get(name)]
    if missing: raise RuntimeError('Missing local SMTP values: '+', '.join(missing))
    token=supabase_token(config)
    body={'smtp_host':config['SMTP_HOST'],'smtp_port':str(int(config['SMTP_PORT'])),
        'smtp_user':config['SMTP_USER'],'smtp_pass':config['SMTP_PASS'],
        'smtp_admin_email':config['SMTP_FROM_EMAIL'],'smtp_sender_name':config.get('SMTP_SENDER_NAME','US Equity Monitor'),
        'rate_limit_email_sent':30}
    request(f'https://api.supabase.com/v1/projects/{PROJECT}/config/auth',token,'PATCH',body)
    auth_config(config,custom_templates=True)
    verified=request(f'https://api.supabase.com/v1/projects/{PROJECT}/config/auth',token)
    for key in ['smtp_host','smtp_port','smtp_user','smtp_admin_email','smtp_sender_name','rate_limit_email_sent']:
        if verified.get(key)!=body[key]:raise RuntimeError('SMTP config verification failed: '+key)
    print('SMTP credentials configured server-side. Real delivery still requires a test email.')

def market(config):
    key=config.get('TWELVE_DATA_API_KEY')
    if not key: raise RuntimeError('TWELVE_DATA_API_KEY is missing. Register your provider first.')
    request(f'https://api.supabase.com/v1/projects/{PROJECT}/secrets',supabase_token(config),'POST',
        [{'name':'TWELVE_DATA_API_KEY','value':key},{'name':'MARKET_PROVIDER','value':'twelve-data'},
         {'name':'ALLOWED_ORIGINS','value':MARKET_ORIGINS}])
    print('Market API key saved to Supabase Edge Function secrets; never included in frontend code.')

def china_market(config):
    request(f'https://api.supabase.com/v1/projects/{PROJECT}/secrets',supabase_token(config),'POST',
        [{'name':'MARKET_PROVIDER','value':'china-public'},{'name':'ALLOWED_ORIGINS','value':MARKET_ORIGINS}])
    print('Domestic public web quote adapter selected. No API payment or subscription created.')

def deploy(config):
    cf=config.get('CLOUDFLARE_API_TOKEN')
    if not cf: raise RuntimeError('A scoped Cloudflare Pages API token is required for GitHub Actions.')
    verify=request('https://api.cloudflare.com/client/v4/user/tokens/verify',cf)
    if not verify.get('success') or verify.get('result',{}).get('status')!='active':
        raise RuntimeError('Cloudflare token is not active.')
    page=request(f'https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}/pages/projects/stock-atlas',cf)
    if not page.get('success'):raise RuntimeError('Token cannot access the intended Pages project.')
    gh=github_token()
    endpoint=f'https://api.github.com/repos/{REPO}/actions'
    public=request(endpoint+'/secrets/public-key',gh)
    try:
        from nacl.public import PublicKey,SealedBox
    except ImportError:
        dependency=ROOT/'artifacts/operations-deps'
        if dependency.exists():sys.path.insert(0,str(dependency))
        from nacl.public import PublicKey,SealedBox
    encrypted=base64.b64encode(SealedBox(PublicKey(base64.b64decode(public['key']))).encrypt(cf.encode())).decode()
    request(endpoint+'/secrets/CLOUDFLARE_API_TOKEN',gh,'PUT',{'encrypted_value':encrypted,'key_id':public['key_id']})
    request(endpoint+'/variables/CLOUDFLARE_DEPLOY_ENABLED',gh,'PATCH',{'name':'CLOUDFLARE_DEPLOY_ENABLED','value':'true'})
    print('GitHub secret encrypted and automatic deployment enabled. Trigger a main push to verify.')

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action',choices=['auth','smtp','market','china','deploy'])
    args=parser.parse_args()
    try:
        {'auth':auth_config,'smtp':smtp,'market':market,'china':china_market,'deploy':deploy}[args.action](settings())
    except Exception as error:
        print('Configuration did not complete: '+str(error),file=sys.stderr)
        return 1
    return 0

if __name__=='__main__':sys.exit(main())
