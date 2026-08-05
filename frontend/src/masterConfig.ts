import type { LucideIcon } from 'lucide-react';
import { Building2, GitBranch, Network, BadgeCheck, Users, Handshake, Truck, Ruler, Package, Clock3, CalendarRange, Clock } from 'lucide-react';
import { MasterSlug, RecordData } from './api';
import type { InputFormat } from './utils/inputValidation';

export type Field = { name: string; label: string; type?: 'text'|'email'|'url'|'date'|'time'|'number'|'textarea'|'select'|'checkbox'; format?: InputFormat; maxLength?: number; required?: boolean; options?: { value: string; label: string }[]; lookup?: MasterSlug; lookupLabel?: (row: RecordData) => string; span?: 2 };
export type Column = { key: string; label: string; render?: (row: RecordData) => string };
export type MasterDefinition = { slug: MasterSlug; title: string; singular: string; subtitle: string; icon: LucideIcon; columns: Column[]; fields: Field[] };

const status: Field = { name: 'status', label: 'Status', type: 'select', options: [{value:'active',label:'Active'},{value:'inactive',label:'Inactive'}], required: true };
const address: Field[] = [
  {name:'address_line1',label:'Address line 1',span:2},{name:'address_line2',label:'Address line 2',span:2},
  {name:'city',label:'City'},{name:'state',label:'State'},{name:'pincode',label:'Pincode',format:'pincode'},
];
const party: Field[] = [
  {name:'code',label:'Code',required:true},{name:'name',label:'Name',required:true},{name:'contact_person',label:'Contact person'},
  {name:'mobile',label:'Mobile',format:'phone'},{name:'alternate_mobile',label:'Alternate mobile',format:'phone'},{name:'email',label:'Email',type:'email'},
  {name:'gstin',label:'GSTIN',format:'gstin'},{name:'pan',label:'PAN',format:'pan'},...address,{name:'remarks',label:'Remarks',type:'textarea',span:2},
];
const codeName = [{key:'code',label:'Code'},{key:'name',label:'Name'}];

export const masters: MasterDefinition[] = [
  { slug:'companies', title:'Companies', singular:'Company', subtitle:'Manage legal entity and company profile', icon:Building2,
    columns:[...codeName,{key:'legal_name',label:'Legal name'},{key:'gstin',label:'GSTIN'},{key:'city',label:'City'}],
    fields:[{name:'code',label:'Code',required:true},{name:'name',label:'Company name',required:true},{name:'legal_name',label:'Legal name'},
      {name:'gstin',label:'GSTIN',format:'gstin'},{name:'pan',label:'PAN',format:'pan'},{name:'phone',label:'Phone',format:'phone'},{name:'email',label:'Email',type:'email'},
      {name:'website',label:'Website',type:'url'},...address,status] },
  { slug:'branches', title:'Branches', singular:'Branch', subtitle:'Manage head office and operating branches', icon:GitBranch,
    columns:[...codeName,{key:'company_name',label:'Company'},{key:'city',label:'City'},{key:'is_head_office',label:'Type',render:r=>r.is_head_office?'Head office':'Branch'}],
    fields:[{name:'company_id',label:'Company',type:'select',lookup:'companies',required:true},{name:'code',label:'Code',required:true},
      {name:'name',label:'Branch name',required:true},{name:'is_head_office',label:'Head office',type:'checkbox'},
      {name:'gstin',label:'GSTIN',format:'gstin'},{name:'phone',label:'Phone',format:'phone'},{name:'email',label:'Email',type:'email'},...address,status] },
  { slug:'departments', title:'Departments', singular:'Department', subtitle:'Organizational departments', icon:Network,
    columns:[...codeName,{key:'company_name',label:'Company'},{key:'description',label:'Description'}],
    fields:[{name:'company_id',label:'Company',type:'select',lookup:'companies',required:true},{name:'code',label:'Code',required:true},
      {name:'name',label:'Department name',required:true},{name:'description',label:'Description',type:'textarea',span:2},status] },
  { slug:'designations', title:'Designations', singular:'Designation', subtitle:'Employee job titles and roles', icon:BadgeCheck,
    columns:[...codeName,{key:'description',label:'Description'}],
    fields:[{name:'code',label:'Code',required:true},{name:'name',label:'Designation name',required:true},{name:'description',label:'Description',type:'textarea',span:2},status] },
  { slug:'employees', title:'Employees', singular:'Employee', subtitle:'Staff, department and designation details', icon:Users,
    columns:[{key:'code',label:'Code'},{key:'full_name',label:'Employee'},{key:'department_name',label:'Department'},{key:'designation_name',label:'Designation'},{key:'mobile',label:'Mobile'}],
    fields:[{name:'branch_id',label:'Branch',type:'select',lookup:'branches',required:true},{name:'department_id',label:'Department',type:'select',lookup:'departments',required:true},
      {name:'designation_id',label:'Designation',type:'select',lookup:'designations',required:true},{name:'code',label:'Employee code',required:true},
      {name:'first_name',label:'First name',required:true},{name:'last_name',label:'Last name'},
      {name:'gender',label:'Gender',type:'select',options:[{value:'male',label:'Male'},{value:'female',label:'Female'},{value:'other',label:'Other'}]},
      {name:'date_of_birth',label:'Date of birth',type:'date'},{name:'date_of_joining',label:'Date of joining',type:'date'},
      {name:'mobile',label:'Mobile',format:'phone'},{name:'alternate_mobile',label:'Alternate mobile',format:'phone'},{name:'email',label:'Email',type:'email'},
      {name:'address',label:'Address',type:'textarea',span:2},{name:'city',label:'City'},{name:'state',label:'State'},{name:'pincode',label:'Pincode',format:'pincode'},
      {name:'emergency_contact_name',label:'Emergency contact name'},{name:'emergency_contact_phone',label:'Emergency contact phone',format:'phone'},
      {name:'monthly_salary',label:'Monthly salary',type:'number',format:'decimal'},{name:'ot_rate_per_hour',label:'OT rate / hour',type:'number',format:'decimal'},{name:'payroll_applicable',label:'Payroll applicable',type:'checkbox'},status] },
  { slug:'customers', title:'Customers', singular:'Customer', subtitle:'Customer contact, tax and credit details', icon:Handshake,
    columns:[...codeName,{key:'contact_person',label:'Contact person'},{key:'mobile',label:'Mobile'},{key:'gstin',label:'GSTIN'},{key:'city',label:'City'}],
    fields:[...party,{name:'credit_limit',label:'Credit limit',type:'number',format:'decimal'},{name:'credit_days',label:'Credit days',type:'number',format:'integer'},status] },
  { slug:'vendors', title:'Vendors', singular:'Vendor', subtitle:'Supplier contact, tax and payment details', icon:Truck,
    columns:[...codeName,{key:'contact_person',label:'Contact person'},{key:'mobile',label:'Mobile'},{key:'gst_type',label:'GST Type'},{key:'gstin',label:'GSTIN'},{key:'city',label:'City'}],
    fields:[...party,{name:'gst_type',label:'GST Type',type:'select',required:true,options:[{value:'WITH_GST',label:'With GST'},{value:'WITHOUT_GST',label:'Without GST'}]},{name:'payment_terms',label:'Payment terms'},{name:'bank_name',label:'Bank name'},
      {name:'account_number',label:'Account number',maxLength:18},{name:'ifsc_code',label:'IFSC code',format:'ifsc'},status] },
  { slug:'vehicles',title:'Vehicles',singular:'Vehicle',subtitle:'Service vehicle and customer mapping',icon:Truck,
    columns:[{key:'vehicle_number',label:'Vehicle number'},{key:'customer_name',label:'Customer'},{key:'model',label:'Model'},{key:'chassis_number',label:'Chassis number'}],
    fields:[{name:'vehicle_number',label:'Vehicle number',required:true,format:'uppercase',maxLength:30},{name:'customer_id',label:'Customer',type:'select',lookup:'customers'},{name:'model',label:'Model'},{name:'chassis_number',label:'Chassis number',format:'uppercase'},{name:'sale_date',label:'Sale date',type:'date'},status] },
  { slug:'uoms',title:'UOM',singular:'UOM',subtitle:'Units of measurement for spares',icon:Ruler,columns:[...codeName,{key:'description',label:'Description'}],
    fields:[{name:'code',label:'Code',required:true},{name:'name',label:'Name',required:true},{name:'description',label:'Description',type:'textarea',span:2},status] },
  { slug:'products',title:'Products',singular:'Product',subtitle:'Spare parts used in service work',icon:Package,
    columns:[...codeName,{key:'part_number',label:'Part number'},{key:'hsn_code',label:'HSN code'},{key:'uom_code',label:'UOM'},{key:'default_rate',label:'Rate'}],
    fields:[{name:'code',label:'Spare code',required:true},{name:'name',label:'Product name',required:true},{name:'part_number',label:'Part number'},{name:'hsn_code',label:'HSN code',required:true,format:'integer',maxLength:8},{name:'uom_id',label:'UOM',type:'select',lookup:'uoms',required:true},{name:'default_rate',label:'Default rate',type:'number',format:'decimal'},status] },
  { slug:'work-pending-sub-statuses',title:'Pending Sub-status',singular:'Pending sub-status',subtitle:'Reasons for pending complaint work',icon:Clock3,
    columns:[...codeName,{key:'description',label:'Description'}],fields:[{name:'code',label:'Code',required:true},{name:'name',label:'Name',required:true},{name:'description',label:'Description',type:'textarea',span:2},status] },
  { slug:'financial-years',title:'Financial Years',singular:'Financial year',subtitle:'Entry periods and document sequences',icon:CalendarRange,
    columns:[...codeName,{key:'start_date',label:'Start date'},{key:'end_date',label:'End date'},{key:'is_current',label:'Current',render:r=>r.is_current?'Yes':'No'}],
    fields:[{name:'code',label:'Code',required:true},{name:'name',label:'Name',required:true},{name:'start_date',label:'Start date',type:'date',required:true},{name:'end_date',label:'End date',type:'date',required:true},{name:'is_current',label:'Current financial year',type:'checkbox'},status] },
  { slug:'shifts',title:'Shift Master',singular:'Shift',subtitle:'Simple attendance shift timings',icon:Clock,
    columns:[...codeName,{key:'in_time',label:'In time'},{key:'out_time',label:'Out time'},{key:'working_hours',label:'Hours'}],
    fields:[{name:'code',label:'Shift code',required:true},{name:'name',label:'Shift name',required:true},{name:'in_time',label:'In time',type:'time',required:true},{name:'out_time',label:'Out time',type:'time',required:true},{name:'working_hours',label:'Working hours',type:'number',format:'decimal',required:true},{name:'description',label:'Description',type:'textarea',span:2},status] },
];

export const masterBySlug = Object.fromEntries(masters.map((m) => [m.slug, m])) as Record<MasterSlug, MasterDefinition>;
