import { z } from 'zod';

const optionalText = z.string().trim().max(255).nullish().transform((v) => v || null);
const requiredText = (label: string, max = 150) => z.string().trim().min(2, `${label} is required`).max(max);
const status = z.enum(['active', 'inactive']).default('active');
const id = z.coerce.number().int().positive();
const email = z.union([z.string().trim().email(), z.literal(''), z.null()]).optional().transform((v) => v || null);
const amount = z.coerce.number().min(0).default(0);
const optionalYear = z.preprocess(v=>v===''||v===null||v===undefined?null:v,z.coerce.number().int().min(0).max(2100).nullable()).optional();
const optionalPattern = (pattern: RegExp, message: string, max: number) => z.union([
  z.string().trim().max(max).regex(pattern, message), z.literal(''), z.null(),
]).optional().transform((v) => v || null);
const phone = optionalPattern(/^\d{10}$/, 'Contact number must be exactly 10 digits', 10);
const pincode = optionalPattern(/^\d{6}$/, 'Pincode must be exactly 6 digits', 6);
const gstin = optionalPattern(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'Enter a valid 15-character GSTIN', 15);
const pan = optionalPattern(/^[A-Z]{5}\d{4}[A-Z]$/, 'Enter a valid PAN', 10);
const ifsc = optionalPattern(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Enter a valid IFSC code', 11);
const website = z.union([z.string().trim().url('Enter a valid website URL'), z.literal(''), z.null()]).optional().transform((v) => v || null);

export type MasterName = keyof typeof masterConfigs;
export type MasterConfig = {
  table: string;
  schema: z.ZodTypeAny;
  columns: string[];
  search: string[];
  select: string;
  joins?: string;
  orderBy?: string;
};

const addressFields = {
  address_line1: optionalText, address_line2: optionalText, city: optionalText,
  state: optionalText, pincode,
};
const partyFields = {
  code: requiredText('Code', 20), name: requiredText('Name'), contact_person: optionalText,
  mobile: phone, alternate_mobile: phone, email, gstin, pan,
  ...addressFields, remarks: optionalText, status,
};

const configs = {
  companies: {
    table: 'companies',
    schema: z.object({ code: requiredText('Code', 20), name: requiredText('Name'), legal_name: optionalText,
      gstin, pan, phone, email, website, ...addressFields, status }),
    columns: ['code','name','legal_name','gstin','pan','phone','email','website','address_line1','address_line2','city','state','pincode','status'],
    search: ['m.code','m.name','m.legal_name','m.gstin'],
    select: 'm.*', orderBy: 'm.name',
  },
  branches: {
    table: 'branches',
    schema: z.object({ company_id: id, code: requiredText('Code', 20), name: requiredText('Name'),
      is_head_office: z.coerce.boolean().default(false), gstin, phone, email,
      ...addressFields, status }),
    columns: ['company_id','code','name','is_head_office','gstin','phone','email','address_line1','address_line2','city','state','pincode','status'],
    search: ['m.code','m.name','m.city','m.gstin'], select: 'm.*, c.name AS company_name',
    joins: 'LEFT JOIN companies c ON c.id=m.company_id', orderBy: 'm.name',
  },
  departments: {
    table: 'departments',
    schema: z.object({ company_id: id, code: requiredText('Code', 20), name: requiredText('Name', 100), description: optionalText, status }),
    columns: ['company_id','code','name','description','status'], search: ['m.code','m.name'],
    select: 'm.*, c.name AS company_name', joins: 'LEFT JOIN companies c ON c.id=m.company_id', orderBy: 'm.name',
  },
  designations: {
    table: 'designations',
    schema: z.object({ code: requiredText('Code', 20), name: requiredText('Name', 100), description: optionalText, status }),
    columns: ['code','name','description','status'], search: ['m.code','m.name'], select: 'm.*', orderBy: 'm.name',
  },
  employees: {
    table: 'employees',
    schema: z.object({ branch_id: id, department_id: id, designation_id: id, code: requiredText('Code', 20),
      first_name: requiredText('First name', 80), last_name: optionalText,
      gender: z.union([z.enum(['male','female','other']), z.literal(''), z.null()]).optional().transform((v) => v || null),
      date_of_birth: optionalText, date_of_joining: optionalText, mobile: phone, alternate_mobile: phone,
      email, address: optionalText, city: optionalText, state: optionalText, pincode,
      emergency_contact_name: optionalText, emergency_contact_phone: phone, monthly_salary:amount, ot_rate_per_hour:amount, payroll_applicable:z.coerce.boolean().default(true), status }),
    columns: ['branch_id','department_id','designation_id','code','first_name','last_name','gender','date_of_birth','date_of_joining','mobile','alternate_mobile','email','address','city','state','pincode','emergency_contact_name','emergency_contact_phone','monthly_salary','ot_rate_per_hour','payroll_applicable','status'],
    search: ['m.code','m.first_name','m.last_name','m.mobile','m.email'],
    select: "m.*, CONCAT_WS(' ',m.first_name,m.last_name) AS full_name, b.name AS branch_name, d.name AS department_name, g.name AS designation_name",
    joins: 'LEFT JOIN branches b ON b.id=m.branch_id LEFT JOIN departments d ON d.id=m.department_id LEFT JOIN designations g ON g.id=m.designation_id',
    orderBy: 'm.first_name',
  },
  customers: {
    table: 'customers', schema: z.object({ branch_id: id, ...partyFields, credit_limit: amount, credit_days: z.coerce.number().int().min(0).default(0) }),
    columns: ['branch_id','code','name','contact_person','mobile','alternate_mobile','email','gstin','pan','address_line1','address_line2','city','state','pincode','credit_limit','credit_days','remarks','status'],
    search: ['m.code','m.name','m.contact_person','m.mobile','m.gstin'], select: 'm.*', orderBy: 'm.name',
  },
  vendors: {
    table: 'vendors', schema: z.object({ ...partyFields, payment_terms: optionalText, bank_name: optionalText,
      gst_type: z.enum(['WITH_GST','WITHOUT_GST']).default('WITH_GST'), account_number: z.union([z.string().trim().max(18),z.literal(''),z.null()]).optional().transform(v=>v||null), ifsc_code: ifsc }),
    columns: ['code','name','contact_person','mobile','alternate_mobile','email','gstin','gst_type','pan','address_line1','address_line2','city','state','pincode','payment_terms','bank_name','account_number','ifsc_code','remarks','status'],
    search: ['m.code','m.name','m.contact_person','m.mobile','m.gstin'], select: 'm.*', orderBy: 'm.name',
  },
  vehicles: {
    table: 'vehicles', schema: z.object({ branch_id: id, vehicle_number: requiredText('Vehicle number',14).regex(/^[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{1,4}$/i,'Enter a valid vehicle number like TN 31 CM 0000').transform(value=>value.toUpperCase().replace(/\s+/g,' ').trim()), customer_id: id,
      vehicle_name: optionalText, model: optionalText, manufacturing_year: optionalYear,
      fuel_type: optionalText, engine_number: optionalText, chassis_number: optionalText, sale_date: optionalText, status }),
    columns: ['branch_id','vehicle_number','customer_id','vehicle_name','model','manufacturing_year','fuel_type','engine_number','chassis_number','sale_date','status'],
    search: ['m.vehicle_number','m.vehicle_name','m.model','m.engine_number','m.chassis_number','c.name'], select: 'm.*, c.name AS customer_name, c.mobile AS customer_mobile',
    joins: 'LEFT JOIN customers c ON c.id=m.customer_id', orderBy: 'm.vehicle_number',
  },
  uoms: {
    table: 'uoms', schema: z.object({ code: requiredText('Code',20), name: requiredText('Name',80), description: optionalText, status }),
    columns: ['code','name','description','status'], search: ['m.code','m.name'], select: 'm.*', orderBy: 'm.name',
  },
  products: {
    table: 'products', schema: z.object({ code: requiredText('Code',30), name: requiredText('Name'), part_number: optionalText,
      hsn_code: requiredText('HSN code',20), uom_id: id, default_rate: amount, reorder_level: amount, status }),
    columns: ['code','name','part_number','hsn_code','uom_id','default_rate','reorder_level','status'], search: ['m.code','m.name','m.part_number','m.hsn_code'],
    select: 'm.*, u.code AS uom_code, u.name AS uom_name, COALESCE((SELECT SUM(ib.quantity) FROM inventory_balances ib WHERE ib.company_id=m.company_id AND ib.product_id=m.id),0) AS current_stock', joins: 'LEFT JOIN uoms u ON u.id=m.uom_id', orderBy: 'm.name',
  },
  'work-pending-sub-statuses': {
    table: 'work_pending_sub_statuses', schema: z.object({ code: requiredText('Code',40), name: requiredText('Name',120), description: optionalText, status }),
    columns: ['code','name','description','status'], search: ['m.code','m.name'], select: 'm.*', orderBy: 'm.name',
  },
  'financial-years': {
    table: 'financial_years', schema: z.object({ code: requiredText('Code',20), name: requiredText('Name',40), start_date: z.string().date(),
      end_date: z.string().date(), is_current: z.coerce.boolean().default(false), status }).refine(value=>value.end_date>=value.start_date,{message:'End date must be on or after Start date',path:['end_date']}),
    columns: ['code','name','start_date','end_date','is_current','status'], search: ['m.code','m.name'], select: 'm.*', orderBy: 'm.start_date DESC',
  },
  shifts: {
    table:'shifts',schema:z.object({code:requiredText('Code',20),name:requiredText('Name',80),in_time:z.string().min(1),out_time:z.string().min(1),working_hours:z.coerce.number().positive(),description:optionalText,status}),
    columns:['code','name','in_time','out_time','working_hours','description','status'],search:['m.code','m.name'],select:'m.*',orderBy:'m.name',
  },
} satisfies Record<string, MasterConfig>;

export const masterConfigs: Record<keyof typeof configs, MasterConfig> = configs;
