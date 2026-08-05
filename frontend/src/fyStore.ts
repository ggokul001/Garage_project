import { create } from 'zustand';
import { RecordData } from './api';
type FyState={years:RecordData[];activeId:number|null;setYears:(years:RecordData[])=>void;setActive:(id:number)=>void};
export const useFy=create<FyState>((set)=>({years:[],activeId:Number(localStorage.getItem('accura.fy'))||null,setYears:(years)=>set(state=>{const valid=years.some(y=>y.id===state.activeId);const current=years.find(y=>Boolean(y.is_current))??years[0];const activeId=valid?state.activeId:(current?.id??null);if(activeId)localStorage.setItem('accura.fy',String(activeId));return{years,activeId}}),setActive:(activeId)=>{localStorage.setItem('accura.fy',String(activeId));set({activeId})}}));
