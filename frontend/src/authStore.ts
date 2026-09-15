import { create } from 'zustand';
import { accessApi, User } from './api';

type AuthState={user:User|null;token:string|null;ready:boolean;login:(login:string,password:string)=>Promise<void>;restore:()=>Promise<void>;logout:()=>void;has:(permission:string)=>boolean};
export const useAuth=create<AuthState>((set,get)=>({
  user:null,token:localStorage.getItem('ara-garage.token'),ready:false,
  login:async(login,password)=>{const result=await accessApi.login(login,password);localStorage.setItem('ara-garage.token',result.token);localStorage.setItem('ara-garage.refresh-token',result.refreshToken);set({token:result.token,user:result.user,ready:true});},
  restore:async()=>{if(!get().token){set({ready:true});return;}try{set({user:await accessApi.me(),ready:true})}catch{localStorage.removeItem('ara-garage.token');set({token:null,user:null,ready:true})}},
  logout:()=>{localStorage.removeItem('ara-garage.token');localStorage.removeItem('ara-garage.refresh-token');set({token:null,user:null})},
  has:(permission)=>Boolean(get().user?.permissions?.includes(permission)),
}));
