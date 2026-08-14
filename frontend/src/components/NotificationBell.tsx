import {useEffect,useMemo,useState} from 'react';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {AlertTriangle,Bell,CheckCheck,Clock3,CreditCard,X} from 'lucide-react';
import toast from 'react-hot-toast';
import {accessApi,AppNotification} from '../api';
import {useAuth} from '../authStore';

const priority={critical:0,warning:1,info:2};
const money=(value:unknown)=>`\u20B9 ${Number(value??0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const date=(value:unknown)=>value?new Date(`${String(value).slice(0,10)}T00:00:00`).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'Never';

export function NotificationBell({enabled}:{enabled:boolean}){
  const user=useAuth(state=>state.user),qc=useQueryClient();
  const[open,setOpen]=useState(false),[expandedKey,setExpandedKey]=useState<string|null>(null);
  const[previewIndex,setPreviewIndex]=useState(0);
  const query=useQuery({queryKey:['notifications',user?.id],queryFn:accessApi.notifications,enabled:enabled&&!!user&&!user?.must_change_password,refetchInterval:60000,refetchIntervalInBackground:true});
  const items=useMemo(()=>[...(query.data?.data??[])].sort((a,b)=>priority[a.severity]-priority[b.severity]),[query.data]);
  const activeCount=items.length;
  const previewItems=useMemo(()=>items.slice(0,3),[items]);
  const previewItem=previewItems.length?previewItems[previewIndex%previewItems.length]:null;
  const urgent=items.some(item=>!item.acknowledged&&(item.severity==='critical'||item.severity==='warning'));
  const update=useMutation({mutationFn:({key,action}:{key:string;action:'READ'|'ACKNOWLEDGE'|'DISMISS_TODAY'})=>accessApi.notificationState(key,action),onSuccess:(response:any,variables)=>{if(variables.action!=='READ'&&response?.message)toast.success(response.message);qc.invalidateQueries({queryKey:['notifications']})},onError:(error:Error)=>toast.error(error.message)});
  useEffect(()=>{setPreviewIndex(0);if(previewItems.length<2)return;const timer=window.setInterval(()=>setPreviewIndex(current=>(current+1)%previewItems.length),4500);return()=>window.clearInterval(timer)},[previewItems.length,previewItems.map(item=>item.key).join('|')]);

  const toggleItem=(item:AppNotification)=>{
    setExpandedKey(current=>current===item.key?null:item.key);
  };
  const close=()=>{setOpen(false);setExpandedKey(null)};
  const openPreview=(item:AppNotification)=>{setOpen(true);setExpandedKey(item.key)};
  if(!enabled)return <button title="Notifications" className="header-icon"><Bell size={17}/></button>;

  return <div className="notification-area relative">
    {previewItem&&<button key={previewItem.key} className={`notification-preview severity-${previewItem.severity}`} title={previewItem.message} onClick={()=>openPreview(previewItem)}><i/><span>{previewItem.title}</span>{previewItems.length>1&&<small>{previewIndex%previewItems.length+1}/{previewItems.length}</small>}</button>}
    <button aria-label="Notifications" aria-expanded={open} title={`${activeCount} active notification${activeCount===1?'':'s'}`} className={`header-icon notification-bell ${urgent?'notification-bell-live':''}`} onClick={()=>{setOpen(value=>!value);setExpandedKey(null)}}><Bell size={17}/>{activeCount>0&&<span className="notification-count">{activeCount>9?'9+':activeCount}</span>}</button>
    {open&&<><button className="fixed inset-0 z-30 cursor-default" aria-label="Close notifications" onClick={close}/><section className="notification-popover" aria-label="Notifications">
      <header><div><strong>Notifications</strong><span>{activeCount?`${activeCount} action required`:'You are up to date'}</span></div><div className="flex items-center gap-1"><button title="Close" onClick={close}><X size={15}/></button></div></header>
      <div className="notification-list">{items.length?items.map(item=><div className={`notification-item ${expandedKey===item.key?'open':''}`} key={item.key}>
        <NotificationRow item={item} onClick={()=>toggleItem(item)}/>
        {expandedKey===item.key&&<NotificationInlineDetail item={item} busy={update.isPending} onAcknowledge={()=>{update.mutate({key:item.key,action:'ACKNOWLEDGE'});setExpandedKey(null)}} onRemind={()=>{update.mutate({key:item.key,action:'DISMISS_TODAY'});setExpandedKey(null)}}/>}
      </div>):<div className="notification-empty"><CheckCheck size={24}/><strong>No active alerts</strong><span>Trial and billing updates will appear here.</span></div>}</div>
    </section></>}
  </div>
}

function NotificationRow({item,onClick}:{item:AppNotification;onClick:()=>void}){const Icon=item.type==='TRIAL'?Clock3:CreditCard;return <button className={`notification-row severity-${item.severity} ${item.is_read?'read':''}`} onClick={onClick}><div className="notification-type-icon"><Icon size={16}/></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><strong className="truncate">{item.title}</strong>{!item.is_read&&<i/>}</div><p className="line-clamp-2">{item.message}</p><small>{item.type==='TRIAL'?'Trial account':'Subscription billing'} · Click for details</small></div></button>}

function NotificationInlineDetail({item,busy,onAcknowledge,onRemind}:{item:AppNotification;busy:boolean;onAcknowledge:()=>void;onRemind:()=>void}){const d=item.details;return <div className={`notification-inline-detail severity-${item.severity}`}>
  <div className="notification-inline-grid">{item.type==='TRIAL'?<><Detail label="Days remaining" value={d.days_remaining}/><Detail label="Trial ends" value={date(d.trial_end_date)}/></>:<><Detail label="Outstanding" value={money(d.outstanding_amount)} important/><Detail label="Pending / Partial" value={`${d.pending_months??0} / ${d.partial_months??0}`}/><Detail label="Oldest pending" value={date(d.oldest_pending_month)}/><Detail label="Last payment" value={date(d.last_payment_date)}/></>}</div>
  <div className="notification-inline-note"><AlertTriangle size={14}/><span>{item.type==='PAYMENT'?'Pending payment does not automatically suspend company access.':'Activate before the trial end date to avoid login interruption.'}</span></div>
  <div className="notification-inline-actions"><button disabled={busy} onClick={onRemind}>Remind tomorrow</button><button disabled={busy} onClick={onAcknowledge}><CheckCheck size={14}/>Acknowledge</button></div>
</div>}

function Detail({label,value,important=false}:{label:string;value:unknown;important?:boolean}){return <div><span>{label}</span><strong className={important?'text-rose-600':''}>{String(value??'—')}</strong></div>}
