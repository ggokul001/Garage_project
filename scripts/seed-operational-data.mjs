const base=process.env.SEED_API_URL||'http://localhost:4010/api/v1';
const companyPassword='CompanyAdmin@2026',superPassword='ProductAdmin@2026';
let token='';

async function api(path,{method='GET',body,auth=true}={}){
  const response=await fetch(base+path,{method,headers:{...(auth&&token?{Authorization:`Bearer ${token}`}:{Authorization:''}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  let result={};try{result=await response.json()}catch{}
  if(!response.ok)throw new Error(`${method} ${path}: ${result.message||response.statusText}`);
  return result;
}
async function multipart(path,data){const form=new FormData();form.append('data',JSON.stringify(data));const response=await fetch(base+path,{method:'POST',headers:{Authorization:`Bearer ${token}`},body:form});let result={};try{result=await response.json()}catch{}if(!response.ok)throw new Error(`POST ${path}: ${result.message||response.statusText}`);return result}
async function login(loginName,password){const result=await api('/auth/login',{method:'POST',body:{login:loginName,password},auth:false});token=result.data.token;return result.data.user}
async function options(slug){return(await api(`/masters/${slug}/options`)).data}
async function pages(path){const first=await api(`${path}${path.includes('?')?'&':'?'}page=1`),all=[...first.data],count=Math.ceil(Number(first.meta.total)/Number(first.meta.pageSize));for(let page=2;page<=count;page++)all.push(...(await api(`${path}${path.includes('?')?'&':'?'}page=${page}`)).data);return all}

const payrollMonths=['2026-04','2026-05','2026-06','2026-07','2026-08'];
const attendanceDates=['2026-04-15','2026-05-18','2026-06-16','2026-07-20','2026-08-12'];

async function seedWorkOrders(fy,employees,products,pending){
  const jobs=await pages(`/job-cards?financial_year_id=${fy.id}&search=`);
  for(const [index,job] of jobs.entries()){if(!job.work_order_id)await api(`/job-cards/${job.id}/approve`,{method:'POST'});if((index+1)%50===0)console.log(`  Work Order headers ${index+1}/${jobs.length}`)}
  const orders=await pages(`/work-orders?financial_year_id=${fy.id}&search=`);
  for(const [index,header] of orders.entries()){
    if(header.work_order_type)continue;
    const order=(await api(`/work-orders/${header.id}`)).data,partial=index%3===1;
    const complaints=order.complaints.map((row,complaintIndex)=>{const completed=partial&&complaintIndex===0;return{id:row.id,mechanic_employee_id:employees[(index+complaintIndex)%employees.length].id,status:completed?'completed':'pending',pending_sub_status_id:completed?null:pending[(index+complaintIndex)%pending.length].id}});
    const spares=[products[index%products.length],products[(index+7)%products.length]].map((product,spareIndex)=>({product_id:product.id,uom_id:product.uom_id,product_code:product.code,product_name:product.name,part_number:product.part_number,hsn_code:product.hsn_code,uom_code:product.uom_code,quantity:1+(index+spareIndex)%4,rate:Number(product.default_rate)}));
    await api(`/work-orders/${header.id}`,{method:'PUT',body:{work_order_type:['AMC','WARRANTY','PAID'][index%3],complaints,spares}});
    if((index+1)%50===0)console.log(`  Work Order details ${index+1}/${orders.length}`);
  }
  return pages(`/work-orders?financial_year_id=${fy.id}&search=`);
}

async function seedAttendance(fy,branches,shifts){
  let saved=0;
  for(const [dateIndex,date] of attendanceDates.entries())for(const [branchIndex,branch] of branches.entries()){
    const rows=(await api(`/attendance?date=${date}&branch_id=${branch.id}`)).data;
    if(!rows.length)continue;
    await api('/attendance/bulk',{method:'POST',body:{financial_year_id:fy.id,attendance_date:date,branch_id:branch.id,source:'MANUAL',rows:rows.map((row,index)=>{const type=['PRESENT','PRESENT','PERMISSION','HALF_DAY_LEAVE','FULL_DAY_LEAVE','ABSENT'][(dateIndex+branchIndex+index)%6];return{employee_id:row.employee_id,shift_id:shifts[(dateIndex+index)%shifts.length].id,additional_shift_id:null,attendance_type:type,in_time:type==='ABSENT'||type==='FULL_DAY_LEAVE'?null:'09:00',out_time:type==='ABSENT'||type==='FULL_DAY_LEAVE'?null:'18:00',permission_hours:type==='PERMISSION'?1:0,ot_hours:type==='PRESENT'?(index%3):0,remarks:type==='PRESENT'?'Regular workshop duty':type.replaceAll('_',' ').toLowerCase()}})}});
    saved+=rows.length;
  }
  return saved;
}

async function seedSalaryAdvances(fy,employees){
  let rows=(await api(`/salary-advances?financial_year_id=${fy.id}&search=`)).data;
  for(let index=rows.length;index<100;index++)await api('/salary-advances',{method:'POST',body:{financial_year_id:fy.id,advance_date:attendanceDates[index%attendanceDates.length],employee_id:employees[index%employees.length].id,amount:500+(index%10)*250,recovery_month:payrollMonths[index%payrollMonths.length],remarks:['Medical expense support','Festival advance','Family travel assistance','Education expense support','Emergency household requirement'][index%5]}});
  rows=(await api(`/salary-advances?financial_year_id=${fy.id}&search=`)).data;
  return rows.length;
}

async function seedPayroll(fy,branches){let details=0;for(const month of payrollMonths)for(const branch of branches){await api('/payroll/generate',{method:'POST',body:{financial_year_id:fy.id,salary_month:month,branch_id:branch.id}});details+=(await api(`/payroll?month=${month}&branch_id=${branch.id}`)).data.length}return details}

async function seedCompany(index){
  await login(`com${String(index+1).padStart(3,'0')}.admin`,companyPassword);
  const financialYears=(await api('/financial-years')).data,fy=financialYears.find(row=>row.is_current)||financialYears[0],branches=await options('branches'),employees=await options('employees'),products=await api('/lookups/products?search='),pending=await api('/lookups/pending-statuses?search='),shifts=await options('shifts');
  const workOrders=await seedWorkOrders(fy,employees,products.data,pending.data),attendance=await seedAttendance(fy,branches,shifts),advances=await seedSalaryAdvances(fy,employees),payroll=await seedPayroll(fy,branches);
  if(workOrders.length!==150||attendance!==100||advances!==100||payroll!==100)throw new Error(`Company ${index+1} verification failed: ${JSON.stringify({workOrders:workOrders.length,attendance,advances,payroll})}`);
  console.log(`[${index+1}/10] verified: 150 work orders; attendance, advances and payroll 100 each`);
  return{company:`COM-${String(index+1).padStart(3,'0')}`,workOrders:workOrders.length,attendance,advances,payroll};
}

async function seedSuperPayments(){
  await login('superadmin',superPassword);const companies=(await api('/super-admin/billing/companies')).data;
  for(const company of companies){const marker=`SEED-${company.code}`,existing=await api(`/super-admin/payments?company_id=${company.id}&search=${encodeURIComponent(marker)}&page=1`);for(let index=Number(existing.meta.total);index<3;index++){const detail=(await api(`/super-admin/billing/companies/${company.id}/dues`)).data,due=detail.dues.find(row=>Number(row.balance)>0);if(!due)break;const balance=Number(due.balance),amount=Number((index%2===0?balance*.45:balance).toFixed(2));await multipart('/super-admin/payments',{company_id:company.id,payment_date:attendanceDates[(index+2)%attendanceDates.length],amount,payment_mode:['BANK_TRANSFER','UPI','CHEQUE'][index%3],reference_number:`${marker}-${String(index+1).padStart(2,'0')}`,remarks:`Subscription collection received and allocated for ${company.name}`,due_ids:[due.id]})}}
  const payments=await api('/super-admin/payments?page=1');console.log(`Super Admin payments ready: ${payments.meta.total}`);return payments.meta.total;
}

async function main(){console.log(`Operational seed starting at ${base}`);const summary=[];for(let index=0;index<10;index++)summary.push(await seedCompany(index));const superPayments=await seedSuperPayments();console.table(summary);console.log(`Verified Super Admin payments: ${superPayments}`);console.log('Operational seed completed through authenticated application APIs only.')}
main().catch(error=>{console.error('\nOPERATIONAL SEED FAILED:',error.message);process.exit(1)});
