import Decimal from 'decimal.js';
import type {TradeInput} from './types';
import {tradeSchema} from './validation';
import {resolveLocal,validTimezone} from './time';

export const chiefColumns=['成交编号','股票代码','公司名称','交易所','币种','交易方向','数量','成交价格','手续费','成交时间','记录时区','备注'] as const;
const keys=['reference','symbol','name','exchange','currency','side','quantity','price','fees','occurred_at','record_timezone','notes'] as const;
export type ChiefManualEntry=Record<typeof keys[number],string>;
export interface ChiefImport {trades:TradeInput[];references:string[]}
const prefix='[CHIEF-IMPORT-v1]';

/** Parse quoted CSV or pasted TSV; reject malformed quotes rather than shifting columns. */
export function parseDelimited(text:string):string[][] {
 const input=text.replace(/^\uFEFF/,'');
 if(input.length>1024*1024)throw new Error('文件超过 1 MB，请拆分导入。');
 const delimiter=input.split(/\r?\n/,1)[0].includes('\t')?'\t':',';
 const rows:string[][]=[],row:string[]=[];
 let cell='',quoted=false,closed=false;
 function addCell(){row.push(cell.trim());cell='';closed=false;}
 function addRow(){addCell();if(row.some(value=>value!==''))rows.push([...row]);row.length=0;}
 for(let i=0;i<input.length;i++){
  const char=input[i];
  if(quoted){if(char==='"'){if(input[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=char;continue;}
  if(char===delimiter){addCell();continue;}
  if(char==='\n'||char==='\r'){addRow();if(char==='\r'&&input[i+1]==='\n')i++;continue;}
  if(closed){if(char===' '||char==='\t')continue;throw new Error('CSV 引号格式错误，请重新保存文件。');}
  if(char==='"'){if(cell.trim())throw new Error('CSV 引号格式错误。');cell='';quoted=true;}else cell+=char;
 }
 if(quoted)throw new Error('CSV 引号未闭合。');
 if(cell||row.length||closed)addRow();
 if(rows.length>201)throw new Error('每次最多导入 200 条成交记录，请拆分文件。');
 return rows;
}

export async function chiefTradeId(userId:string,accountAlias:string,reference:string) {
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(['chief-v1',userId,accountAlias,reference])));
 const hex=Array.from(new Uint8Array(hash)).slice(0,16).map(value=>value.toString(16).padStart(2,'0')).join('');
 return `${hex.slice(0,8)}-${hex.slice(8,12)}-5${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20)}`;
}

function amount(value:string,zero:boolean):string {
 const clean=value.replace(/,/g,'');
 if(!/^\d+(?:\.\d{1,8})?$/.test(clean))throw new Error('数量、成交价格及手续费须为明确的非负金额；手续费不能留空。');
 const result=new Decimal(clean);
 if(!zero&&result.lte(0))throw new Error('数量与成交价格必须大于零。');
 return result.toFixed();
}

export async function parseChiefTemplate(text:string,userId:string,accountAlias:string):Promise<ChiefImport> {
 const rows=parseDelimited(text),headers=rows.shift();
 return parseChiefRows(headers,rows,userId,accountAlias,'file');
}

/** Manual entry and file imports share validation and execution IDs. */
export async function parseChiefManualEntries(entries:ChiefManualEntry[],userId:string,accountAlias:string):Promise<ChiefImport> {
 const rows=entries.map(entry=>keys.map(key=>entry[key].trim()));
 return parseChiefRows([...keys],rows,userId,accountAlias,'manual');
}

async function parseChiefRows(headers:string[]|undefined,rows:string[][],userId:string,accountAlias:string,source:'file'|'manual'):Promise<ChiefImport> {
 if(!/^[\p{L}\p{N} _.-]{1,40}$/u.test(accountAlias))throw new Error('请填写 1–40 字的账户别名，例如“致富美股”；不要填写真实账号。');
 if(!headers||!rows.length)throw new Error(source==='manual'?'请至少填写一笔实际成交。':'文件中没有成交记录，请按模板填入实际成交数据。');
 if(rows.length>200)throw new Error('每次最多导入 200 条成交记录，请分批保存。');
 const mapped=headers.map(header=>{const n=chiefColumns.indexOf(header as typeof chiefColumns[number]);return n<0?header:keys[n];});
 if(new Set(mapped).size!==mapped.length)throw new Error('表头有重复字段。');
 const missing=keys.filter(key=>key!=='notes'&&!mapped.includes(key));
 if(missing.length)throw new Error(`缺少模板字段：${missing.map(key=>chiefColumns[keys.indexOf(key)]).join('、')}。原始结单尚未适配，请先按模板整理。`);
 const trades:TradeInput[]=[],references:string[]=[],seen=new Set<string>();
 for(let index=0;index<rows.length;index++){
  try{
   const row=rows[index];if(row.length!==headers.length)throw new Error('列数与表头不一致。');
   const values=Object.fromEntries(mapped.map((key,i)=>[key,row[i]]));
   const reference=values.reference;
   if(!/^[A-Za-z0-9_.:/-]{1,100}$/.test(reference))throw new Error('成交编号须为 1–100 位字母、数字或 . _ : / -；请使用每笔实际成交的独立编号。');
   if(seen.has(reference))throw new Error('成交编号重复；分笔成交请填写各自独立编号，不要使用相同订单号。');
   seen.add(reference);
   if(values.currency.toUpperCase()!=='USD')throw new Error('当前仅支持美元美股成交；港股、期权、期货与持仓快照尚未适配。');
   const side={buy:'buy',sell:'sell',b:'buy',s:'sell','买入':'buy','卖出':'sell','買入':'buy','賣出':'sell'}[values.side.toLowerCase()] as 'buy'|'sell'|undefined;
   if(!side)throw new Error('交易方向只能为买入或卖出，不能导入委托、撤单、转账等记录。');
   if(!validTimezone(values.record_timezone))throw new Error('记录时区无效；请使用 Asia/Hong_Kong 或 America/New_York 等 IANA 时区。');
   const time=values.occurred_at;
   let instant:string;
   if(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?$/.test(time))instant=resolveLocal(time.replace(' ','T'),values.record_timezone,'reject');
   else if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(time))instant=time;
   else throw new Error('成交时间必须包含真实日期与时间，例如 2026-11-09 10:30:00；不自动猜测缺失时间。');
   const notes=`${prefix}${JSON.stringify({account:accountAlias,reference})}\n${values.notes??''}`;
   const input={id:await chiefTradeId(userId,accountAlias,reference),symbol:values.symbol.toUpperCase(),name:values.name,exchange:values.exchange.toUpperCase(),currency:'USD',timezone:'America/New_York',side,quantity:amount(values.quantity,false),price:amount(values.price,false),fees:amount(values.fees,true),occurred_at:instant,record_timezone:values.record_timezone,notes};
   const parsed=tradeSchema.safeParse(input);
   if(!parsed.success)throw new Error('股票信息、金额或日期格式无效；金额最多 12 位整数和 8 位小数，备注最多约 1800 字。');
   trades.push(parsed.data);references.push(reference);
  }catch(error){throw new Error(`${source==='manual'?`第 ${index+1} 笔成交`:`第 ${index+2} 行`}：${error instanceof Error?error.message:'无法解析。'}`);}
 }
 return {trades,references};
}

/** Identical broker execution IDs may be skipped; different economics require review. */
export function sameImportedTrade(a:TradeInput,b:TradeInput):boolean {
 return keys.filter(key=>key!=='reference').every(key=>{
  if(key==='occurred_at')return new Date(a.occurred_at).getTime()===new Date(b.occurred_at).getTime();
  if(key==='quantity'||key==='price'||key==='fees')return new Decimal(a[key]).eq(b[key]);
  return a[key as keyof TradeInput]===b[key as keyof TradeInput];
 });
}
