import {useEffect,useRef,useState} from 'react';
import {errorText} from '../lib/i18n';
import type {Trade,WatchItem} from '../lib/types';

export function DeleteDialog({item,onClose,onDelete}:{item:WatchItem|Trade;onClose:()=>void;onDelete:()=>Promise<void>}) {
 const dialog=useRef<HTMLDialogElement>(null),pending=useRef(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const watch='baseline_at' in item;
 useEffect(()=>{const element=dialog.current;element?.showModal();return()=>element?.close();},[]);
 async function submit() {
  if(pending.current)return;
  pending.current=true;setBusy(true);setError('');
  try {await onDelete();onClose();}
  catch(cause) {setError(errorText(cause,'zh'));}
  finally {pending.current=false;setBusy(false);}
 }
 return <dialog className="record-dialog delete-dialog" ref={dialog} aria-labelledby="delete-title" aria-describedby="delete-description" onCancel={event=>{event.preventDefault();if(!pending.current)onClose();}}>
  <div className="dialog-head"><h2 id="delete-title">{watch?'删除自选股票':'删除交易记录'}</h2><button aria-label="关闭删除确认" disabled={busy} onClick={onClose}>×</button></div>
  <div className="delete-body"><p id="delete-description">{watch?'确认从自选列表删除':'确认删除这条交易记录：'} <strong translate="no" className="notranslate">{item.symbol}</strong>（{item.exchange}）？</p>
   <p className="help">{watch?'删除后将移除该股票的起始记录及收益曲线；交易记录保留。之后可以重新添加股票。':'删除成功后，这条交易记录将不再显示。'}</p>
   {error&&<p className="form-error" role="alert">{error}</p>}
   <div className="dialog-footer"><button className="secondary" disabled={busy} onClick={onClose}>取消</button><button className="primary" disabled={busy} onClick={()=>void submit()}>{busy?'正在删除…':'确认删除'}</button></div>
  </div>
 </dialog>;
}
