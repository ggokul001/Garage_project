import {useQuery} from '@tanstack/react-query';
import {useParams} from 'react-router-dom';
import {publicShareApi} from '../api';
import {workOrderDocumentHtml} from '../utils/companyPrint';

export function SharedWorkOrderPage(){
  const {token}=useParams();
  const share=useQuery({queryKey:['public-work-order',token],queryFn:()=>publicShareApi.workOrder(String(token)),enabled:Boolean(token),retry:false});
  if(share.isLoading)return <div className="grid min-h-screen place-items-center bg-slate-100 text-slate-700">Loading Work Order...</div>;
  if(share.isError||!share.data)return <div className="grid min-h-screen place-items-center bg-slate-100 p-6 text-center text-slate-700">This Work Order link is invalid or expired.</div>;
  return <iframe title="Work Order" className="h-screen w-full border-0 bg-white" srcDoc={workOrderDocumentHtml(share.data.work_order,share.data.company)}/>;
}
