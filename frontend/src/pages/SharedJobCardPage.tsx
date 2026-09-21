import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { publicShareApi } from '../api';
import { jobCardDocumentHtml } from '../utils/jobCardPrint';

export function SharedJobCardPage(){
  const {token}=useParams();
  const share=useQuery({queryKey:['public-job-card',token],queryFn:()=>publicShareApi.jobCard(String(token)),enabled:Boolean(token),retry:false});
  if(share.isLoading)return <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-700">Loading Job Card...</div>;
  if(share.isError||!share.data)return <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-center text-slate-700">This Job Card link is invalid or expired.</div>;
  return <iframe title="Job Card" className="h-screen w-full border-0 bg-white" srcDoc={jobCardDocumentHtml(share.data.job_card,share.data.company)}/>;
}
