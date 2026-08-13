import { FormEvent,useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle,ArrowRight,BellRing,Building2,CalendarX2,Check,CheckCircle2,ClipboardList,Eye,EyeOff,IndianRupee,LockKeyhole,Mail,Monitor,Moon,PackageSearch,ShieldCheck,Sparkles,Sun } from 'lucide-react';
import { useAuth } from '../authStore';
import { Theme,useTheme } from '../ThemeProvider';
import { BrandLogo } from '../components/BrandLogo';
import { Modal } from '../components/Modal';

const themeOptions:[Theme,typeof Sun,string][]= [['light',Sun,'Light'],['dark',Moon,'Dark'],['system',Monitor,'System']];
type AccessBlock={code:'TRIAL_EXPIRED'|'COMPANY_INACTIVE';message:string;details?:{trial_ends_at?:string;company_name?:string;inactive_reason?:string}};
const storedAccessBlock=()=>{try{const raw=sessionStorage.getItem('ara-garage.access-blocked');sessionStorage.removeItem('ara-garage.access-blocked');if(!raw)return null;const value=JSON.parse(raw) as AccessBlock;return value.code==='TRIAL_EXPIRED'||value.code==='COMPANY_INACTIVE'?value:null}catch{return null}};

export function LoginPage(){
  const token=useAuth(s=>s.token),loginAction=useAuth(s=>s.login);
  const {theme,setTheme}=useTheme();
  const [login,setLogin]=useState(''),[password,setPassword]=useState(''),[show,setShow]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(''),[accessBlock,setAccessBlock]=useState<AccessBlock|null>(storedAccessBlock);
  if(token)return <Navigate to="/" replace/>;

  const submit=async(e:FormEvent)=>{e.preventDefault();setLoading(true);setError('');try{await loginAction(login,password)}catch(err){const problem=err as Error&{code?:string;details?:AccessBlock['details']};if(problem.code==='TRIAL_EXPIRED'||problem.code==='COMPANY_INACTIVE')setAccessBlock({code:problem.code,message:problem.message,details:problem.details});else setError(problem.message||'Unable to sign in')}finally{setLoading(false)}};

  return <div className="auth-page">
    <div className="auth-aurora auth-aurora-one"/><div className="auth-aurora auth-aurora-two"/><div className="auth-grid-mask"/>
    <div className="auth-theme" aria-label="Theme selector">{themeOptions.map(([value,Icon,label])=><button key={value} className={theme===value?'active':''} title={`${label} theme`} onClick={()=>setTheme(value)}><Icon size={15}/><span>{label}</span></button>)}</div>

    <main className="auth-layout">
      <motion.section className="auth-story" initial={{opacity:0,x:-24}} animate={{opacity:1,x:0}} transition={{duration:.55}}>
        <div className="auth-story-brand"><BrandLogo inverted tagline/></div>
        <div className="auth-story-copy"><span className="auth-kicker"><Sparkles size={13}/> Built for busy Indian workshops</span><h1>Every vehicle. Every job.<br/><em>Fully under control.</em></h1><p>Run the complete garage journey—from customer complaint and estimate to repair, spares, billing, payment and the next service reminder—in one secure workspace.</p><div className="auth-story-proof"><CheckCircle2 size={14}/><span>Customer history</span><i/><span>Multi-branch ready</span><i/><span>Live reports</span></div></div>
        <div className="auth-feature-grid">
          <div><span><ClipboardList size={17}/></span><strong>Job Control</strong><small>Estimate to vehicle delivery</small></div>
          <div><span><PackageSearch size={17}/></span><strong>Spares Tracking</strong><small>Purchase, stock and usage</small></div>
          <div><span><IndianRupee size={17}/></span><strong>Smart Accounts</strong><small>Receipts, dues and payroll</small></div>
          <div><span><BellRing size={17}/></span><strong>Service Follow-up</strong><small>Never miss a due vehicle</small></div>
        </div>
        <div className="auth-story-foot"><span/><p>Made for Ara Garage · India</p></div>
      </motion.section>

      <motion.section className="auth-shell" initial={{opacity:0,y:20,scale:.98}} animate={{opacity:1,y:0,scale:1}} transition={{duration:.5,delay:.08}}>
        <div className="auth-card">
          <div className="auth-card-shine"/>
          <div className="auth-mobile-brand"><BrandLogo tagline/></div>
          <div className="auth-card-head"><span className="auth-badge"><ShieldCheck size={12}/> Protected workspace</span><h2>Welcome back</h2><p>Enter your credentials to access the service console.</p></div>
          <form onSubmit={submit} className="auth-form">
            <div><label className="label" htmlFor="login">Username or email</label><div className="auth-input-wrap"><Mail size={17}/><input id="login" value={login} onChange={e=>setLogin(e.target.value)} placeholder="Enter username or email" autoComplete="username" autoFocus required/></div></div>
            <div><div className="flex items-center justify-between"><label className="label" htmlFor="password">Password</label><span className="auth-forgot">Forgot password?</span></div><div className="auth-input-wrap"><LockKeyhole size={17}/><input id="password" type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" required/><button type="button" aria-label={show?'Hide password':'Show password'} onClick={()=>setShow(!show)}>{show?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></div>
            <label className="auth-remember"><span className="auth-check"><Check size={11}/></span><span>Keep me signed in on this device</span></label>
            {error&&<div className="auth-error">{error}</div>}
            <button className="auth-submit" disabled={loading}><span>{loading?'Signing in…':'Sign in securely'}</span><ArrowRight size={17}/></button>
          </form>
          <div className="auth-security"><LockKeyhole size={12}/> Authorized personnel only · Encrypted access</div>
        </div>
      </motion.section>
    </main>
    <Modal open={!!accessBlock} title={accessBlock?.code==='TRIAL_EXPIRED'?'Trial period expired':'Company access inactive'} onClose={()=>setAccessBlock(null)} footer={<button className="btn-primary" onClick={()=>setAccessBlock(null)}>Okay, understood</button>}>
      {accessBlock&&<AccessBlockedContent block={accessBlock}/>} 
    </Modal>
    <footer className="auth-footer"><span>© {new Date().getFullYear()} Ara Garage</span><i aria-hidden="true"/><span>Developed by <strong>ARA Softwares</strong></span></footer>
  </div>;
}

function AccessBlockedContent({block}:{block:AccessBlock}){
  const trial=block.code==='TRIAL_EXPIRED',Icon=trial?CalendarX2:Building2;
  const end=block.details?.trial_ends_at?new Date(block.details.trial_ends_at).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'}):null;
  return <div className={`access-block-dialog ${trial?'trial':'inactive'}`}>
    <div className="access-block-icon"><Icon size={28}/></div>
    <div><span className="access-block-label">Access not available</span><h3>{trial?'Your free trial has ended':'Your company account is inactive'}</h3><p>{trial?'The trial access period for this company has been completed. Company users cannot sign in until the account is activated.':'Access to this company workspace has been disabled by the Super Administrator. All users under this company are temporarily unable to sign in.'}</p></div>
    {block.details?.company_name&&<div className="access-block-fact"><span>Company</span><strong>{block.details.company_name}</strong></div>}
    {trial&&end&&<div className="access-block-fact"><span>Trial ended on</span><strong>{end}</strong></div>}
    {!trial&&block.details?.inactive_reason&&<div className="access-block-fact"><span>Reason</span><strong>{block.details.inactive_reason}</strong></div>}
    <div className="access-block-help"><AlertTriangle size={17}/><div><strong>What should you do?</strong><p>Contact the Ara Garage administrator to activate the subscription or restore company access.</p></div></div>
  </div>
}
