import axios from 'axios';

export type RecordData = Record<string, unknown> & { id: number; status: string };
export type MasterSlug = 'companies'|'branches'|'departments'|'designations'|'employees'|'customers'|'vendors'|'vehicles'|'uoms'|'products'|'work-pending-sub-statuses'|'financial-years'|'shifts';
export type ListResponse = { data: RecordData[]; meta: { page: number; pageSize: number; total: number } };

const client = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL||'/api/v1', timeout: 15000 });
client.interceptors.request.use((config) => {
  const token=localStorage.getItem('ara-garage.token');
  if(token) config.headers.Authorization=`Bearer ${token}`;
  return config;
});
client.interceptors.response.use((r) => r, (error) => {
  const message=String(error.response?.data?.message??'Unable to complete request'),hasSession=Boolean(localStorage.getItem('ara-garage.token'));
  if(hasSession&&(error.response?.status===401||message.includes('company account is inactive')||message.includes('trial period has expired'))){localStorage.removeItem('ara-garage.token');window.location.assign(`${import.meta.env.BASE_URL}login`)}
  return Promise.reject(new Error(message));
});

export const masterApi = {
  list: async (slug: MasterSlug, params: { page: number; pageSize: number; search: string }) => (await client.get<ListResponse>(`/masters/${slug}`, { params })).data,
  options: async (slug: MasterSlug) => (await client.get<{ data: RecordData[] }>(`/masters/${slug}/options`)).data.data,
  create: async (slug: MasterSlug, data: Record<string, unknown>) => (await client.post(`/masters/${slug}`, data)).data,
  update: async (slug: MasterSlug, id: number, data: Record<string, unknown>) => (await client.put(`/masters/${slug}/${id}`, data)).data,
  remove: async (slug: MasterSlug, id: number) => (await client.delete(`/masters/${slug}/${id}`)).data,
  companyBranding:async()=>(await client.get('/masters/company-branding')).data.data as RecordData,
  saveCompanyLogo:async(logo:File)=>{const form=new FormData();form.append('logo',logo);return(await client.put('/masters/company-branding/logo',form)).data},
};

export type Permission={id:number;code:string;name:string;module:string;action:string};
export type Role=RecordData & {code:string;name:string;description?:string;is_system:number;permission_count:number;permission_ids:number[]};
export type User=RecordData & {username:string;email:string;full_name:string;role_id:number;role_name:string;role_code:string;company_id?:number;company_name?:string;account_type?:'TRIAL'|'PAID';trial_ends_at?:string;branch_id?:number;branch_name?:string;permissions?:string[]};
export type NavItem={id:number;parent_id?:number;title:string;route?:string;icon:string;permission_code?:string;children:NavItem[]};
export const accessApi={
  login:async(login:string,password:string)=>(await client.post('/auth/login',{login,password})).data.data as {token:string;user:User},
  me:async()=>(await client.get('/auth/me')).data.data as User,
  navigation:async()=>(await client.get('/navigation')).data.data as NavItem[],
  permissions:async()=>(await client.get('/permissions')).data.data as Permission[],
  roles:async()=>(await client.get('/roles')).data.data as Role[],
  createRole:async(data:Record<string,unknown>)=>(await client.post('/roles',data)).data,
  updateRole:async(id:number,data:Record<string,unknown>)=>(await client.put(`/roles/${id}`,data)).data,
  removeRole:async(id:number)=>(await client.delete(`/roles/${id}`)).data,
  users:async(params:{page:number;search:string})=>(await client.get('/users',{params})).data as {data:User[];meta:{page:number;pageSize:number;total:number}},
  createUser:async(data:Record<string,unknown>)=>(await client.post('/users',data)).data,
  updateUser:async(id:number,data:Record<string,unknown>)=>(await client.put(`/users/${id}`,data)).data,
  removeUser:async(id:number)=>(await client.delete(`/users/${id}`)).data,
  resetPassword:async(id:number,password:string)=>(await client.post(`/users/${id}/reset-password`,{password})).data,
  changePassword:async(currentPassword:string,newPassword:string)=>(await client.post('/auth/change-password',{currentPassword,newPassword})).data,
  userPermissions:async(id:number)=>(await client.get(`/users/${id}/permissions`)).data.data as {user?:User;permissions:Permission[];inherited:string[];effective:string[];overrides:{permission_id:number;allowed:number}[]},
  saveUserPermissions:async(id:number,overrides:{permission_id:number;allowed:boolean}[])=>(await client.put(`/users/${id}/permissions`,{overrides})).data,
  helpDesk:async()=>(await client.get('/help-desk')).data.data as RecordData[],
  createTicket:async(data:Record<string,unknown>)=>(await client.post('/help-desk',data)).data,
  dashboard:async(financial_year_id:number|undefined,view:'operations'|'md')=>(await client.get('/dashboard',{params:{financial_year_id,view}})).data.data as Record<string,any>,
};

export type Company=RecordData&{code:string;name:string;legal_name?:string;account_type:'TRIAL'|'PAID';trial_started_at?:string;trial_ends_at?:string;inactive_reason?:string;inactive_at?:string;phone?:string;email?:string;website?:string;gstin?:string;pan?:string;address_line1?:string;address_line2?:string;city?:string;state?:string;pincode?:string;max_users?:number;max_branches?:number;billing_cycle?:'MONTHLY'|'ONE_TIME';monthly_fee?:number;billing_start_month?:string;billing_due_day?:number;user_count?:number;branch_count?:number;admin_name?:string;admin_username?:string;admin_email?:string;trial_days_remaining?:number};
export const superAdminApi={
  companies:async(params:{page:number;search:string;status?:string})=>(await client.get('/super-admin/companies',{params})).data as {data:Company[];meta:{page:number;pageSize:number;total:number}},
  company:async(id:number)=>(await client.get(`/super-admin/companies/${id}`)).data.data as Company&{admins:RecordData[];history:RecordData[]},
  createCompany:async(data:Record<string,unknown>)=>(await client.post('/super-admin/companies',data)).data,
  updateCompany:async(id:number,data:Record<string,unknown>)=>(await client.put(`/super-admin/companies/${id}`,data)).data,
  saveCompanyAdmin:async(id:number,data:Record<string,unknown>)=>(await client.post(`/super-admin/companies/${id}/admin`,data)).data,
  updateStatus:async(id:number,status:'active'|'inactive',reason:string)=>(await client.post(`/super-admin/companies/${id}/status`,{status,reason})).data,
  extendTrial:async(id:number,days:number)=>(await client.post(`/super-admin/companies/${id}/extend-trial`,{days})).data,
  convertPaid:async(id:number)=>(await client.post(`/super-admin/companies/${id}/convert-paid`)).data,
};

export const superAdminPaymentApi={
  platformProfile:async()=>(await client.get('/super-admin/platform-profile')).data.data as RecordData,
  savePlatformProfile:async(data:Record<string,unknown>,logo?:File|null)=>{const form=new FormData();form.append('data',JSON.stringify(data));if(logo)form.append('logo',logo);return(await client.put('/super-admin/platform-profile',form)).data},
  billingCompanies:async()=>(await client.get('/super-admin/billing/companies')).data.data as RecordData[],
  saveBilling:async(id:number,data:Record<string,unknown>)=>(await client.put(`/super-admin/billing/companies/${id}`,data)).data,
  companyDues:async(id:number)=>(await client.get(`/super-admin/billing/companies/${id}/dues`)).data.data as {company:RecordData;dues:RecordData[];rates:RecordData[]},
  updateDue:async(companyId:number,id:number,data:Record<string,unknown>)=>(await client.put(`/super-admin/billing/companies/${companyId}/dues/${id}`,data)).data,
  payments:async(params:Record<string,unknown>)=>(await client.get('/super-admin/payments',{params})).data as {data:RecordData[];meta:{page:number;pageSize:number;total:number}},
  payment:async(id:number)=>(await client.get(`/super-admin/payments/${id}`)).data.data as RecordData&{allocations:RecordData[];attachments:RecordData[]},
  createPayment:async(data:Record<string,unknown>,files:File[])=>{const form=new FormData();form.append('data',JSON.stringify(data));files.forEach(file=>form.append('files',file));return(await client.post('/super-admin/payments',form)).data},
  updatePayment:async(id:number,data:Record<string,unknown>)=>(await client.put(`/super-admin/payments/${id}`,data)).data,
  removePayment:async(id:number)=>(await client.delete(`/super-admin/payments/${id}`)).data,
  addAttachments:async(id:number,files:File[])=>{const form=new FormData();files.forEach(file=>form.append('files',file));return(await client.post(`/super-admin/payments/${id}/attachments`,form)).data},
  removeAttachment:async(paymentId:number,id:number)=>(await client.delete(`/super-admin/payments/${paymentId}/attachments/${id}`)).data,
  downloadAttachment:async(paymentId:number,id:number,name:string)=>{const response=await client.get(`/super-admin/payments/${paymentId}/attachments/${id}/download`,{responseType:'blob'});const url=URL.createObjectURL(response.data),anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();URL.revokeObjectURL(url)},
  report:async(params:Record<string,unknown>)=>(await client.get('/super-admin/payment-report',{params})).data.data as {payments:RecordData[];companies:RecordData[];summary:{payment_count:number;received_amount:number;outstanding_amount:number;pending_months:number}},
};

export const transactionApi={
  financialYears:async()=>(await client.get('/financial-years')).data.data as RecordData[],
  autocomplete:async(type:'vehicles'|'customers'|'vendors'|'employees'|'products'|'pending-statuses',search:string)=>(await client.get(`/lookups/${type}`,{params:{search}})).data.data as RecordData[],
  jobCards:async(params:Record<string,unknown>)=>(await client.get('/job-cards',{params})).data,
  jobCard:async(id:number)=>(await client.get(`/job-cards/${id}`)).data.data,
  createJobCard:async(data:Record<string,unknown>)=>(await client.post('/job-cards',data)).data,
  updateJobCard:async(id:number,data:Record<string,unknown>)=>(await client.put(`/job-cards/${id}`,data)).data,
  deleteJobCard:async(id:number)=>(await client.delete(`/job-cards/${id}`)).data,
  approveJobCard:async(id:number)=>(await client.post(`/job-cards/${id}/approve`)).data,
  workOrders:async(params:Record<string,unknown>)=>(await client.get('/work-orders',{params})).data,
  workOrder:async(id:number)=>(await client.get(`/work-orders/${id}`)).data.data,
  updateWorkOrder:async(id:number,data:Record<string,unknown>)=>(await client.put(`/work-orders/${id}`,data)).data,
  deleteWorkOrder:async(id:number)=>(await client.delete(`/work-orders/${id}`)).data,
  approveWorkOrder:async(id:number)=>(await client.post(`/work-orders/${id}/approve`)).data,
  uploadAttachments:async(id:number,files:File[])=>{const form=new FormData();files.forEach(file=>form.append('files',file));return(await client.post(`/work-orders/${id}/attachments`,form,{headers:{'Content-Type':'multipart/form-data'}})).data},
  deleteAttachment:async(workOrderId:number,id:number)=>(await client.delete(`/work-orders/${workOrderId}/attachments/${id}`)).data,
  accounts:async(params:Record<string,unknown>)=>(await client.get('/accounts',{params})).data,
  receipts:async(jobCardId:number)=>(await client.get(`/accounts/${jobCardId}/receipts`)).data.data as RecordData[],
  receivePayment:async(jobCardId:number,data:Record<string,unknown>)=>(await client.post(`/accounts/${jobCardId}/receipts`,data)).data,
  deleteReceipt:async(id:number)=>(await client.delete(`/accounts/receipts/${id}`)).data,
  stores:async(params:Record<string,unknown>)=>(await client.get('/stores',{params})).data,
  store:async(id:number)=>(await client.get(`/stores/${id}`)).data.data,
  createStore:async(data:Record<string,unknown>)=>(await client.post('/stores',data)).data,
  updateStore:async(id:number,data:Record<string,unknown>)=>(await client.put(`/stores/${id}`,data)).data,
  deleteStore:async(id:number)=>(await client.delete(`/stores/${id}`)).data,
  vendorPayments:async(params:Record<string,unknown>)=>(await client.get('/vendor-payments',{params})).data.data as RecordData[],
  creditStores:async(params:Record<string,unknown>)=>(await client.get('/vendor-payments/credit-stores',{params})).data.data as RecordData[],
  createVendorPayment:async(data:Record<string,unknown>)=>(await client.post('/vendor-payments',data)).data,
  deleteVendorPayment:async(id:number)=>(await client.delete(`/vendor-payments/${id}`)).data,
  vendorOutstanding:async(params:Record<string,unknown>)=>(await client.get('/reports/vendor-outstanding',{params})).data as {data:RecordData[];summary:{credit_amount:number;paid_amount:number;outstanding_amount:number}},
};

export const payrollApi={
  options:async()=>(await client.get('/attendance/options')).data.data as {branches:RecordData[];shifts:RecordData[]},
  attendance:async(params:{date:string;branch_id:number})=>(await client.get('/attendance',{params})).data.data as RecordData[],
  saveAttendance:async(data:Record<string,unknown>)=>(await client.post('/attendance/bulk',data)).data,
  advances:async(params:Record<string,unknown>)=>(await client.get('/salary-advances',{params})).data.data as RecordData[],
  createAdvance:async(data:Record<string,unknown>)=>(await client.post('/salary-advances',data)).data,
  deleteAdvance:async(id:number)=>(await client.delete(`/salary-advances/${id}`)).data,
  payrollOptions:async()=>(await client.get('/payroll/options')).data.data as RecordData[],
  payroll:async(params:{month:string;branch_id:number})=>(await client.get('/payroll',{params})).data as {data:RecordData[];run:RecordData|null},
  generate:async(data:Record<string,unknown>)=>(await client.post('/payroll/generate',data)).data,
  adjust:async(id:number,data:Record<string,unknown>)=>(await client.put(`/payroll/details/${id}`,data)).data,
  finalize:async(id:number)=>(await client.post(`/payroll/${id}/finalize`)).data,
  slip:async(id:number)=>(await client.get(`/payroll/slip/${id}`)).data.data as RecordData,
};

export type AuditRow=RecordData&{module_name:string;entity_type:string;record_id?:string;record_display_name?:string;action:string;route:string;old_values?:Record<string,unknown>|string;new_values?:Record<string,unknown>|string;user_id:number;user_name:string;username:string;ip_address?:string;created_at:string};
export const reportApi={
  entryOptions:async()=>(await client.get('/reports/entries/options')).data.data as {reports:{key:string;label:string}[];branches:RecordData[];vendors:RecordData[]},
  entryReport:async(type:string,params:Record<string,unknown>)=>(await client.get(`/reports/entries/${type}`,{params})).data as {data:Record<string,unknown>[];meta:{type:string;label:string;total:number}},
  auditOptions:async()=>(await client.get('/reports/audit/options')).data.data as {modules:string[];users:RecordData[]},
  audit:async(params:Record<string,unknown>)=>(await client.get('/reports/audit',{params})).data as {data:AuditRow[];meta:{page:number;pageSize:number;total:number}},
  auditTimeline:async(entity_type:string,record_id:string|number,display_name?:string)=>(await client.get('/audit/timeline',{params:{entity_type,record_id,display_name}})).data.data as AuditRow[],
};
