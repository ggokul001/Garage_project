import {useEffect} from 'react';
import {useLocation,useSearchParams} from 'react-router-dom';

const allowedSizes=[10,15,25,50,100];
const positive=(value:string|null,fallback:number)=>{const parsed=Number(value);return Number.isInteger(parsed)&&parsed>0?parsed:fallback};

export function useListQueryState(defaultPageSize=15){
  const location=useLocation(),storageKey=`ara-garage.list-state:${location.pathname}`;
  const[params,setParams]=useSearchParams();
  let saved:{page?:number;pageSize?:number;search?:string}={};try{saved=JSON.parse(sessionStorage.getItem(storageKey)??'{}')}catch{}
  const page=positive(params.get('page'),saved.page??1),requestedSize=positive(params.get('pageSize'),saved.pageSize??defaultPageSize),pageSize=allowedSizes.includes(requestedSize)?requestedSize:defaultPageSize,search=params.has('search')?(params.get('search')??''):(saved.search??'');
  useEffect(()=>{sessionStorage.setItem(storageKey,JSON.stringify({page,pageSize,search}))},[storageKey,page,pageSize,search]);
  const update=(patch:Record<string,string|number|null>)=>setParams(current=>{const next=new URLSearchParams(current);for(const[key,value]of Object.entries(patch)){if(value===null)next.delete(key);else next.set(key,String(value))}return next},{replace:true});
  return{page,pageSize,search,setPage:(value:number)=>update({page:Math.max(1,value)}),setPageSize:(value:number)=>update({page:1,pageSize:value}),setSearch:(value:string)=>update({page:1,search:value})};
}
