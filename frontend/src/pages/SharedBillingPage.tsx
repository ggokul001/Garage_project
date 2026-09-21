import {useQuery} from '@tanstack/react-query';
import {useParams} from 'react-router-dom';
import {publicShareApi} from '../api';
import {billingDocumentHtml} from '../utils/billingPrint';

export function SharedBillingPage(){
  const {token}=useParams();
  const share=useQuery({queryKey:['public-billing',token],queryFn:()=>publicShareApi.billing(String(token)),enabled:Boolean(token),retry:false});
  if(share.isLoading)return <div className="grid min-h-screen place-items-center bg-slate-100 text-slate-700">Loading Bill...</div>;
  if(share.isError||!share.data)return <div className="grid min-h-screen place-items-center bg-slate-100 p-6 text-center text-slate-700">This billing link is invalid or expired.</div>;
  return <iframe title="Customer Bill" className="h-screen w-full border-0 bg-white" srcDoc={billingDocumentHtml(share.data.billing,share.data.company)}/>;
}
