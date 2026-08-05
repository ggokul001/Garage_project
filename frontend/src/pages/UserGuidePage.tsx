import { useState } from 'react';
import {
  BadgeCheck,
  BookOpen,
  Building2,
  CalendarCheck,
  CalendarRange,
  ClipboardList,
  Clock3,
  FileSpreadsheet,
  Gauge,
  GitBranch,
  HandCoins,
  Handshake,
  LayoutDashboard,
  LifeBuoy,
  Network,
  Package,
  ReceiptIndianRupee,
  Search,
  Shield,
  Truck,
  UserCog,
  Users,
  WalletCards,
  Warehouse,
  Wrench,
} from 'lucide-react';
import { PageTitle } from './UsersPage';

const guides = [
  {
    title: 'Getting Started & Setup Order',
    icon: BookOpen,
    summary: 'Follow the correct setup sequence before starting daily entries.',
    steps: [
      'Sign in and select Light, Dark or System theme from the header.',
      'Recommended order: Financial Year → Company → Branch → Department → Designation → Employee.',
      'Then create Customers, Vendors, Vehicles, UOM, Products, Pending Sub-status and Shifts.',
      'Finally configure Roles, Users and permissions before starting entries.',
      'Select the correct Financial Year in the header; every operational entry is maintained financial-year wise.',
    ],
  },
  {
    title: 'Financial Year Master',
    icon: CalendarRange,
    summary: 'Maintain the accounting period used by entries and reports.',
    steps: [
      'Create the year with From Date and To Date.',
      'Mark only the currently used year as Current.',
      'Select the required year in the header before creating or reviewing entries.',
    ],
  },
  {
    title: 'Company Master',
    icon: Building2,
    summary: 'Maintain legal entity, tax, contact and registered address details.',
    steps: [
      'Open Masters → Companies and create the company first.',
      'Enter the company code, name, GSTIN, PAN, contact and address details.',
      'Company information is used by branches, departments, documents and dashboards.',
    ],
  },
  {
    title: 'Branch Master',
    icon: GitBranch,
    summary: 'Define head office and service-centre locations.',
    steps: [
      'Select the parent company and enter a unique branch code.',
      'Maintain address, contact and status for each location.',
      'Mark only the primary location as Head Office.',
    ],
  },
  {
    title: 'Department & Designation Masters',
    icon: Network,
    summary: 'Build the organization structure used by employees and mechanics.',
    steps: [
      'Create departments under the relevant company.',
      'Create the required job titles in Designation Master.',
      'Map both values in Employee Master; inactive historical records should not be deleted.',
    ],
  },
  {
    title: 'Employee Master',
    icon: UserCog,
    summary: 'Maintain staff, organization mapping and payroll values.',
    steps: [
      'Select company, branch, department and designation.',
      'Enter employee code, name, contact, joining and emergency details.',
      'For payroll employees, enable Payroll Applicable and enter Monthly Salary and OT Rate.',
      'Mechanics selected in Work Orders are fetched from this master.',
      'Employee records and login users are maintained separately.',
    ],
  },
  {
    title: 'Customer Master',
    icon: Handshake,
    summary: 'Store customer contact, tax, address and credit information.',
    steps: [
      'Create a unique customer code and maintain name and contact number.',
      'Maintain GST/PAN, billing address and approved credit terms where applicable.',
      'A new customer entered from Job Card is automatically available for future autocomplete.',
    ],
  },
  {
    title: 'Vendor Master',
    icon: Truck,
    summary: 'Maintain supplier, GST type, banking and payment information.',
    steps: [
      'Create a unique vendor code and choose With GST or Without GST.',
      'Enter GSTIN, contact, address, payment terms and bank details.',
      'Store Entry applies the vendor GST behaviour from this master.',
    ],
  },
  {
    title: 'Vehicle Master',
    icon: Truck,
    summary: 'Maintain vehicles used in Job Card entries.',
    steps: [
      'Create the vehicle number with customer, model and available vehicle details.',
      'Existing vehicles appear in Job Card autocomplete.',
      'A new number entered in Job Card is created in Vehicle Master for reuse.',
    ],
  },
  {
    title: 'UOM & Product Masters',
    icon: Package,
    summary: 'Configure spare units, product codes and tax-related details.',
    steps: [
      'Create Units of Measure such as NOS, SET, LTR or BOX.',
      'In Product Master, maintain Product Code, Name, Part Number, HSN Code, UOM and rate.',
      'Product Code and Product Name work as linked autocomplete fields in Store and Work Order.',
    ],
  },
  {
    title: 'Pending Sub-status & Shift Masters',
    icon: Clock3,
    summary: 'Maintain complaint waiting reasons and attendance shifts.',
    steps: [
      'Pending Sub-status includes Waiting for Customer Approval and Parts Waiting / Unavailable.',
      'Add further waiting reasons only when operationally required.',
      'Create shift code, timing and allowed working hours for attendance.',
    ],
  },
  {
    title: 'Users, Roles & Permissions',
    icon: Users,
    summary: 'Control menus, dashboards and actions using role and user permissions.',
    steps: [
      'Create a role and enable only the modules and actions required for that role.',
      'Create the login user, assign role and branch, then verify effective permissions.',
      'Use User Overrides only for exceptional user-specific Allow or Deny access.',
      'Dashboard and MD Dashboard have separate access; without dashboard access, only the company welcome view is shown.',
    ],
  },
  {
    title: 'Normal & MD Dashboards',
    icon: LayoutDashboard,
    summary: 'Review live operational information based on assigned access.',
    steps: [
      'Normal Dashboard shows detailed live Job Card, Work Order, Store, payment, attendance and payroll insights.',
      'The Next Service list shows overdue vehicles and services due within the next seven days with customer contact details.',
      'MD Dashboard provides a compact management summary with the same live source data.',
      'All counts, amounts and status values follow the selected Financial Year and user permissions.',
    ],
  },
  {
    title: 'Job Card Entry',
    icon: ClipboardList,
    summary: 'Register a vehicle complaint, estimate, advance and next-service forecast.',
    steps: [
      'Create a Job Card; the Job Card Number is generated automatically and stored with Entry Date and Financial Year.',
      'Enter or select Vehicle Number. Select Customer Name or Contact Number; both linked values are filled automatically.',
      'Enter Driver Contact Number and current running KMS / Hours.',
      'Add complaint rows and complaint-cost rows. Deleted rows are soft-deleted and do not return after refresh.',
      'The cost-row total is shown as Total Amount. Estimate Amount remains editable.',
      'Enter Advance Paid; Balance is calculated as Estimate Amount − Advance Paid.',
      'Enter the KMS/Hours service values to calculate Next Service Days and Next Service Date.',
      'Save, edit, view, print or delete as permitted. Approving the Job Card creates its Work Order.',
    ],
  },
  {
    title: 'Next Service Calculation',
    icon: Gauge,
    summary: 'Predict the earliest service date using both KMS and running-hours limits.',
    steps: [
      'KMS Days = ceiling((Next Service KMS − Current KMS) ÷ Average KMS Per Day).',
      'Hours Days = ceiling((Next Service Hours − Current Hours) ÷ Average Hours Per Day).',
      'When both are available, the smaller day value is used because that service limit will be reached first.',
      'Next Service Date = Job Card Entry Date + Next Service Days in calendar days.',
      'If a target is already reached, the result is 0 days and the vehicle is Service Due. If only one method is entered, that method alone is used.',
    ],
  },
  {
    title: 'Work Order Entry',
    icon: Wrench,
    summary: 'Assign mechanics, update complaint progress and record spares used.',
    steps: [
      'Open the Work Order created from an approved Job Card and select AMC, Warranty or Paid.',
      'Job Card number, customer, contact, vehicle and complaint details are brought automatically.',
      'For each complaint, select a mechanic and set Pending or Completed.',
      'For Pending complaints, select the relevant Pending Sub-status.',
      'Add spare rows using Product Code or Product Name; Part Number, HSN and UOM are fetched from Product Master.',
      'Enter Quantity and Rate; each row total is Quantity × Rate.',
      'Upload the mandatory attachment before approval. Pending complaint rows are allowed when the required sub-status is recorded.',
    ],
  },
  {
    title: 'Accounts & Customer Receipts',
    icon: ReceiptIndianRupee,
    summary: 'Monitor service progress and customer payment position.',
    steps: [
      'Accounts lists Customer, Vehicle, Contact, Job Card, Work Order and overall Job Status.',
      'Payment Status is 100% Pending when paid is zero, Partially Paid when some balance remains, and 100% Paid when balance is zero.',
      'Review Estimate, Advance Paid, receipts and current Balance.',
      'Record simple customer receipts without exceeding the available balance.',
    ],
  },
  {
    title: 'Store Entry',
    icon: Warehouse,
    summary: 'Record CASH or CREDIT spare purchases with GST and discount calculations.',
    steps: [
      'Choose CASH/CREDIT, enter Bill Number and Date, then select the Vendor.',
      'Verify GST behaviour fetched from the Vendor Master.',
      'Add products by Product Code or Product Name; linked product details are filled automatically.',
      'Enter HSN, Quantity, Rate, GST % and Discount %; verify row totals and summary Taxable, GST, Discount and Net Amount.',
      'Save, edit or delete as permitted. Once a Vendor Payment is allocated, the Store Entry becomes view-only.',
    ],
  },
  {
    title: 'Vendor Payment',
    icon: WalletCards,
    summary: 'Allocate full or partial payments against CREDIT Store bills.',
    steps: [
      'Select a vendor; only its CREDIT Store Entries are considered.',
      'Choose Generate Payment and select the required outstanding bills.',
      'Enter payment amount bill-wise; it cannot exceed the bill outstanding value.',
      'A bill may receive multiple partial payments until its net amount is fully settled.',
    ],
  },
  {
    title: 'Vendor Outstanding Report',
    icon: FileSpreadsheet,
    summary: 'Review vendor-wise credit, paid and outstanding values.',
    steps: [
      'Choose custom From/To dates or switch to Daily, Weekly or Monthly period.',
      'Review vendor-wise bill count, credit amount, paid amount and outstanding amount.',
      'Use Excel Download to export the currently filtered report.',
    ],
  },
  {
    title: 'Entry Reports',
    icon: FileSpreadsheet,
    summary: 'Review and export every operational entry from one reporting workspace.',
    steps: [
      'Open Reports → Entry Reports and select Job Card, Work Order, Accounts, Store, Payment, Attendance or Payroll report.',
      'Filter by Financial Year, date range, branch, vendor, status/type and search text.',
      'Use Columns to show, hide and rearrange fields; the selected layout is saved in the browser for each report.',
      'Use Excel Download to export only the currently visible columns and filtered rows.',
    ],
  },
  {
    title: 'Audit Report',
    icon: Shield,
    summary: 'Trace master and entry activity by user, date, module and action.',
    steps: [
      'In any Master or Entry list, click the row Audit Log icon to open that record\'s complete timeline.',
      'Expand an activity to see exact old/new values, changed user, date, time and IP address.',
      'Open Reports → Audit Report with AUDIT_VIEW permission.',
      'Filter by module, Create/Update/Delete/Approve action, user, date range or record search.',
      'Open Details to compare previous values with new or submitted values.',
      'IP address, route, user and exact activity time are retained for traceability.',
      'Master codes are generated automatically on Create and shown as read-only during Edit/View.',
    ],
  },
  {
    title: 'Daily Attendance',
    icon: CalendarCheck,
    summary: 'Record attendance manually or import an Excel-compatible file.',
    steps: [
      'Select Date and Branch, then load eligible employees.',
      'Maintain Present/Absent, Shift, Permission, Half Day, Full Day Leave, OT and Multiple Shift values.',
      'For bulk work, download the template, complete it in Excel and import the CSV file.',
      'Review validation messages and rows before saving attendance.',
      'Biometric punching is reserved for a future phase.',
    ],
  },
  {
    title: 'Salary Advance',
    icon: HandCoins,
    summary: 'Record employee advances for recovery from a selected salary month.',
    steps: [
      'Select employee, advance date and recovery month.',
      'Enter the approved amount and remarks.',
      'The advance is deducted during payroll generation for its recovery month.',
    ],
  },
  {
    title: 'Payroll, Salary Slip & Reports',
    icon: ReceiptIndianRupee,
    summary: 'Generate simple monthly salary without PF or ESI.',
    steps: [
      'Confirm Monthly Salary, OT Rate and Payroll Applicable in Employee Master.',
      'Complete attendance and salary-advance entries for the salary month.',
      'Select month and branch, generate payroll, and verify attendance, OT, gross, advance and net salary.',
      'Finalize the payroll after verification.',
      'Print individual Salary Slips or download the Salary Report in Excel format.',
    ],
  },
  {
    title: 'Help Desk & Security',
    icon: LifeBuoy,
    summary: 'Get support while keeping application access safe and traceable.',
    steps: [
      'Use Help Desk to submit the issue with a clear subject and description.',
      'Never share passwords; reset credentials when compromise is suspected.',
      'Deactivate users who no longer require application access.',
      'Preserve finalized documents and use status changes instead of removing historical business records.',
    ],
  },
];

export function UserGuidePage() {
  const [search, setSearch] = useState('');
  const normalizedSearch = search.trim().toLowerCase();
  const list = guides.filter((guide) =>
    `${guide.title} ${guide.summary} ${guide.steps.join(' ')}`.toLowerCase().includes(normalizedSearch),
  );

  return (
    <div>
      <PageTitle title="User Guide" subtitle="Complete Accura Trucking Services application handbook" icon={BookOpen} />
      <div className="guide-hero">
        <div>
          <span>KNOWLEDGE BASE</span>
          <h2>How can we help you?</h2>
          <p>Search every master, entry, calculation, report and access flow.</p>
        </div>
        <div className="relative mt-6 max-w-xl">
          <Search className="absolute left-4 top-3.5 text-slate-400" size={17} />
          <input
            className="h-11 w-full rounded-xl border border-white/20 bg-white/10 pl-11 pr-4 text-sm text-white outline-none placeholder:text-blue-200 focus:bg-white/15"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search the guide..."
          />
        </div>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {list.map(({ title, icon: Icon, summary, steps }) => (
          <details className="guide-card group" key={title}>
            <summary>
              <div className="page-title-icon"><Icon size={18} /></div>
              <div>
                <h3>{title}</h3>
                <p>{summary}</p>
              </div>
              <BadgeCheck size={17} className="ml-auto text-primary" />
            </summary>
            <ol>
              {steps.map((step, index) => (
                <li key={step}><span>{index + 1}</span>{step}</li>
              ))}
            </ol>
          </details>
        ))}
      </div>
    </div>
  );
}
