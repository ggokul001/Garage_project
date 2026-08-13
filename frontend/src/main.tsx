import React,{useEffect} from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter,Navigate,Route,Routes } from 'react-router-dom';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import toast,{ Toaster } from 'react-hot-toast';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { MasterPage } from './pages/MasterPage';
import { LoginPage } from './pages/LoginPage';
import { UsersPage } from './pages/UsersPage';
import { RolesPage } from './pages/RolesPage';
import { UserPermissionsPage } from './pages/UserPermissionsPage';
import { HelpDeskPage } from './pages/HelpDeskPage';
import { UserGuidePage } from './pages/UserGuidePage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { JobCardListPage } from './pages/jobCards/JobCardListPage';
import { JobCardFormPage } from './pages/jobCards/JobCardFormPage';
import { WorkOrderListPage } from './pages/workOrders/WorkOrderListPage';
import { WorkOrderFormPage } from './pages/workOrders/WorkOrderFormPage';
import { AccountsPage } from './pages/accounts/AccountsPage';
import { StoreListPage } from './pages/stores/StoreListPage';
import { StoreFormPage } from './pages/stores/StoreFormPage';
import { VendorPaymentPage } from './pages/payments/VendorPaymentPage';
import { VendorOutstandingPage } from './pages/reports/VendorOutstandingPage';
import { EntryReportsPage } from './pages/reports/EntryReportsPage';
import { AuditReportPage } from './pages/reports/AuditReportPage';
import { AttendancePage } from './pages/payroll/AttendancePage';
import { SalaryAdvancePage } from './pages/payroll/SalaryAdvancePage';
import { PayrollPage } from './pages/payroll/PayrollPage';
import { ThemeProvider } from './ThemeProvider';
import { useAuth } from './authStore';
import { enableNumericTextInputs } from './numericTextInputs';
import { BrandMark } from './components/BrandLogo';
import { CompaniesPage } from './pages/superAdmin/CompaniesPage';
import { PaymentEntryPage } from './pages/superAdmin/PaymentEntryPage';
import { PaymentReportPage } from './pages/superAdmin/PaymentReportPage';
import { PlatformProfilePage } from './pages/superAdmin/PlatformProfilePage';
import { SuperAdminDashboardPage } from './pages/superAdmin/SuperAdminDashboardPage';
import { SuperAdminAuditPage } from './pages/superAdmin/SuperAdminAuditPage';
import {transactionApi} from './api';
import {printSalarySlip,printWorkOrder} from './utils/companyPrint';
import './styles.css';

enableNumericTextInputs();
const client=new QueryClient({defaultOptions:{queries:{retry:1,refetchOnWindowFocus:false}}});

function Protected(){const token=useAuth(s=>s.token),ready=useAuth(s=>s.ready),restore=useAuth(s=>s.restore);useEffect(()=>{restore()},[restore]);if(!ready)return <div className="app-loading"><BrandMark/><span>Loading Ara Garage workspace…</span></div>;return token?<Layout/>:<Navigate to="/login" replace/>}
function PermissionRoute({permission,children}:{permission:string;children:React.ReactNode}){const has=useAuth(s=>s.has);return has(permission)?<>{children}</>:<Navigate to="/" replace/>}
function Home(){const user=useAuth(s=>s.user);return user?.role_code==='SUPER_ADMIN'?<Navigate to="/super-admin/dashboard" replace/>:<Dashboard view="operations"/>}

function TenantPrintBridge(){
  useEffect(()=>{
    const handle=(event:MouseEvent)=>{
      const button=(event.target as Element|null)?.closest('button');
      if(!button||!button.textContent?.trim().toLowerCase().includes('print')||window.location.pathname.includes('/super-admin/'))return;
      const workOrder=window.location.pathname.match(/\/work-orders\/(\d+)/);
      if(workOrder){event.preventDefault();event.stopPropagation();transactionApi.workOrder(Number(workOrder[1])).then(printWorkOrder).catch(error=>toast.error(error.message));return}
      if(window.location.pathname.endsWith('/payroll')&&document.querySelector('.salary-slip')){
        const text=document.querySelector('.salary-slip')?.textContent??'',queries=client.getQueriesData<any>({queryKey:['payroll']});
        const row=queries.flatMap(([,data])=>data?.data??[]).find(item=>text.includes(String(item.employee_code))&&text.includes(String(item.employee_name)));
        if(row){event.preventDefault();event.stopPropagation();printSalarySlip(row).catch(error=>toast.error(error.message))}
      }
    };
    document.addEventListener('click',handle,true);return()=>document.removeEventListener('click',handle,true);
  },[]);
  return null;
}

function App(){return <><TenantPrintBridge/><Routes>
  <Route path="/login" element={<LoginPage/>}/>
  <Route element={<Protected/>}>
    <Route index element={<Home/>}/>
    <Route path="super-admin/dashboard" element={<SuperAdminDashboardPage/>}/>
    <Route path="super-admin/companies" element={<CompaniesPage/>}/>
    <Route path="super-admin/platform-profile" element={<PlatformProfilePage/>}/>
    <Route path="super-admin/payments" element={<PaymentEntryPage/>}/>
    <Route path="super-admin/payment-report" element={<PaymentReportPage/>}/>
    <Route path="super-admin/audit" element={<SuperAdminAuditPage/>}/>
    <Route path="md-dashboard" element={<PermissionRoute permission="MD_DASHBOARD_VIEW"><Dashboard view="md"/></PermissionRoute>}/>
    <Route path="user-guide" element={<UserGuidePage/>}/><Route path="help-desk" element={<HelpDeskPage/>}/><Route path="change-password" element={<ChangePasswordPage/>}/>
    <Route path="users" element={<PermissionRoute permission="USER_VIEW"><UsersPage/></PermissionRoute>}/><Route path="users/:id/permissions" element={<PermissionRoute permission="PERMISSION_ASSIGN"><UserPermissionsPage/></PermissionRoute>}/><Route path="roles" element={<PermissionRoute permission="ROLE_VIEW"><RolesPage/></PermissionRoute>}/>
    <Route path="masters/:slug" element={<MasterPage/>}/>
    <Route path="job-cards" element={<PermissionRoute permission="JOB_CARD_VIEW"><JobCardListPage/></PermissionRoute>}/><Route path="job-cards/new" element={<PermissionRoute permission="JOB_CARD_CREATE"><JobCardFormPage/></PermissionRoute>}/><Route path="job-cards/:id" element={<PermissionRoute permission="JOB_CARD_VIEW"><JobCardFormPage/></PermissionRoute>}/>
    <Route path="work-orders" element={<PermissionRoute permission="WORK_ORDER_VIEW"><WorkOrderListPage/></PermissionRoute>}/><Route path="work-orders/:id" element={<PermissionRoute permission="WORK_ORDER_VIEW"><WorkOrderFormPage/></PermissionRoute>}/>
    <Route path="accounts" element={<PermissionRoute permission="ACCOUNTS_VIEW"><AccountsPage/></PermissionRoute>}/><Route path="stores" element={<PermissionRoute permission="STORE_VIEW"><StoreListPage/></PermissionRoute>}/><Route path="stores/new" element={<PermissionRoute permission="STORE_CREATE"><StoreFormPage/></PermissionRoute>}/><Route path="stores/:id" element={<PermissionRoute permission="STORE_VIEW"><StoreFormPage/></PermissionRoute>}/>
    <Route path="vendor-payments" element={<PermissionRoute permission="VENDOR_PAYMENT_VIEW"><VendorPaymentPage/></PermissionRoute>}/><Route path="reports/vendor-outstanding" element={<PermissionRoute permission="OUTSTANDING_VIEW"><VendorOutstandingPage/></PermissionRoute>}/>
    <Route path="reports/entries" element={<PermissionRoute permission="ENTRY_REPORT_VIEW"><EntryReportsPage/></PermissionRoute>}/><Route path="reports/audit" element={<PermissionRoute permission="AUDIT_VIEW"><AuditReportPage/></PermissionRoute>}/>
    <Route path="attendance" element={<PermissionRoute permission="ATTENDANCE_VIEW"><AttendancePage/></PermissionRoute>}/><Route path="salary-advances" element={<PermissionRoute permission="SALARY_ADVANCE_VIEW"><SalaryAdvancePage/></PermissionRoute>}/><Route path="payroll" element={<PermissionRoute permission="PAYROLL_VIEW"><PayrollPage/></PermissionRoute>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Route>
</Routes></>}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><QueryClientProvider client={client}><ThemeProvider><BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/,'')}><App/><Toaster position="top-right" toastOptions={{duration:3000}}/></BrowserRouter></ThemeProvider></QueryClientProvider></React.StrictMode>);
