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
import { useAuth } from '../authStore';

const superAdminGuides = [
  {
    title: 'Super Administrator Scope & Sidebar',
    icon: Shield,
    summary: 'Understand platform-level access and the two Super Admin menus.',
    steps: [
      'Sign in with the Super Administrator account. This is a platform account and does not belong to any customer company.',
      'Companies opens the complete tenant-management workspace. User Guide opens this platform handbook.',
      'Super Admin can view every company, create tenants, manage trials, edit subscriptions, provision administrators and control company access.',
      'Super Admin does not use customer masters or entries; operational data remains inside the respective company login.',
    ],
  },
  {
    title: 'Companies List — Reading Every Column',
    icon: Building2,
    summary: 'Use the company register to understand account, trial, administrator, usage and access position.',
    steps: [
      'Company shows the tenant name, unique company code and primary email or phone.',
      'Account shows TRIAL or PAID. Trial shows remaining days and the expiry date; paid companies do not have automatic expiry.',
      'Administrator shows the company administrator name and username. “Not created” means login credentials have not yet been provisioned.',
      'Usage shows the current number of users and branches against the company limits.',
      'Status shows Active or Inactive and the recorded reason. Search can find a company by name, code or contact.',
    ],
  },
  {
    title: 'Create a New Company',
    icon: Building2,
    summary: 'Create the tenant, subscription and first company administrator together.',
    steps: [
      'Click New company and enter a unique Company Code, Company Name and available legal/contact details.',
      'Choose TRIAL when the customer needs evaluation access, or PAID for a subscribed customer.',
      'For TRIAL, enter the allowed trial days. The trial starts immediately after company creation.',
      'Optionally set Maximum Users and Maximum Branches; leave them empty for no configured limit.',
      'Enter the initial Company Administrator full name, unique username, email and temporary password.',
      'Click Create company. The system creates the company, head-office branch, default setup masters, current financial year and administrator login.',
    ],
  },
  {
    title: 'Administrator Credentials & First Login',
    icon: UserCog,
    summary: 'Securely hand over the company administrator login.',
    steps: [
      'After company or administrator creation, copy the username and temporary password from the one-time credentials window.',
      'The stored password cannot be viewed later because only its secure hash is retained.',
      'Share credentials through a secure channel. On first login, the administrator is forced to change the temporary password.',
      'After password change, the session closes and the administrator must sign in again using the new password.',
      'Use the Key action when an administrator was not created or when credentials must be reset. The new temporary password is again shown only once.',
    ],
  },
  {
    title: 'Trial Lifecycle & Automatic Expiry',
    icon: Clock3,
    summary: 'Control evaluation access without manually checking expiry dates.',
    steps: [
      'A trial company remains Active until its Trial End date and time.',
      'When the trial period ends, the system automatically changes the company to Inactive with the reason “Trial period expired”.',
      'After expiry, the company administrator, all company users and existing sessions are blocked. Company data is retained.',
      'Click the Clock action and enter additional days to extend a trial. Extension starts from the later of the current expiry or current time and restores Active access.',
      'Click the check action to convert the tenant to PAID. This removes automatic trial expiry and restores Active access.',
    ],
  },
  {
    title: 'View Full Company Details',
    icon: Search,
    summary: 'Inspect profile, limits, administrators and access history before making changes.',
    steps: [
      'Click the Eye action in the company row.',
      'Review legal/contact information, account type, access status, trial expiry and user/branch limits.',
      'Review all company administrators with username, email, status and last-login time.',
      'Review Access History for creation, activation, inactivation, trial extension and paid-conversion reasons.',
    ],
  },
  {
    title: 'Edit Company & Subscription Details',
    icon: BadgeCheck,
    summary: 'Correct company details and manage platform-controlled account fields.',
    steps: [
      'Click the Pencil action to edit company code, name, legal details, contact, website, GSTIN, PAN and registered address.',
      'Change Account Type only when the commercial plan changes. A TRIAL account requires a valid Trial Ends At value.',
      'Set Maximum Users and Maximum Branches to enforce plan limits, or leave them empty for unlimited access.',
      'Access Status and Inactive Reason are platform controls. Use a clear reason whenever access is blocked.',
      'Company administrators can edit only their own profile fields; they cannot change account type, trial, status or plan limits.',
    ],
  },
  {
    title: 'Manual Activate / Inactivate',
    icon: Shield,
    summary: 'Manually control access for payment or administrative reasons.',
    steps: [
      'For a PAID company, non-payment does not automatically suspend access.',
      'Click the red Inactivate action, enter a meaningful reason such as Payment pending, and confirm.',
      'Inactivation immediately blocks the company administrator, all users and existing authenticated requests. No business data is deleted.',
      'To restore access, click Activate, enter the restoration reason and confirm.',
      'Every status change is recorded in the company Access History with the Super Admin user and timestamp.',
    ],
  },
  {
    title: 'Tenant Isolation & Safety Checks',
    icon: Network,
    summary: 'Keep every company’s masters, users and entries fully separated.',
    steps: [
      'Every tenant master and entry is stored with its Company ID and every API request is filtered by the signed-in user’s company.',
      'A Company Administrator sees only its own Company Profile, branches, users, masters, entries, dashboards and reports.',
      'A company user may be assigned one branch or All branches. All branches is stored as unrestricted company-branch access, not as branch number zero.',
      'Never share one company administrator login with another tenant. Create or reset the administrator from the correct company row.',
      'Before inactivation, conversion or credential reset, use the Eye action and confirm the company code and administrator username.',
    ],
  },
  {
    title: 'Recommended Super Admin Operating Checklist',
    icon: ClipboardList,
    summary: 'Follow this sequence for consistent customer onboarding and support.',
    steps: [
      'Create company → choose Trial/Paid → set limits → create initial administrator.',
      'Copy and securely share the one-time credentials; ask the administrator to complete first-login password change.',
      'Verify the Administrator and Usage columns after onboarding.',
      'For trials, monitor remaining days and extend or convert to paid only after approval.',
      'For paid-account issues, manually inactivate with a reason and reactivate after resolution.',
      'Use View Details and Access History during customer support; preserve tenant data instead of deleting company records.',
    ],
  },
];

const guides = [
  {
    title: 'Getting Started & Setup Order',
    icon: BookOpen,
    summary: 'Follow the correct setup sequence before starting daily entries.',
    steps: [
      'Sign in and select Light, Dark or System theme from the header.',
      'Recommended order: review Company Profile → Financial Year → Branch → Department → Designation → Employee.',
      'Then create Customers, Vendors, Vehicles, UOM, Products, Pending Sub-status and Shifts.',
      'Finally configure Roles, Users, branch access and permissions before starting entries.',
      'A first-time user must change the temporary password and then sign in again with the new password.',
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
    title: 'Company Profile',
    icon: Building2,
    summary: 'Maintain legal entity, tax, contact and registered address details.',
    steps: [
      'Open Masters → Company Profile to view the company assigned to your login.',
      'Use Edit to maintain name, legal name, GSTIN, PAN, contact, website and registered address details.',
      'Company Code is system-controlled. Account type, trial period, access status and plan limits can be changed only by Super Admin.',
      'Company information is used by branches, documents and dashboards; another company’s profile is never visible.',
    ],
  },
  {
    title: 'Branch Master',
    icon: GitBranch,
    summary: 'Define head office and service-centre locations.',
    steps: [
      'Create each operating location under your company; the branch code is generated automatically.',
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
      'Select branch, department and designation within your company.',
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
      'Create the login user and assign a role. Select one branch for branch-specific access or All branches for company-wide branch access.',
      'A temporary password is mandatory for a new user. The user must change it on first login and then sign in again.',
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
  const superAdmin = useAuth((state) => state.user?.role_code === 'SUPER_ADMIN');
  const [search, setSearch] = useState('');
  const normalizedSearch = search.trim().toLowerCase();
  const handbook = superAdmin ? superAdminGuides : guides;
  const list = handbook.filter((guide) =>
    `${guide.title} ${guide.summary} ${guide.steps.join(' ')}`.toLowerCase().includes(normalizedSearch),
  );

  return (
    <div>
      <PageTitle title={superAdmin?'Super Admin User Guide':'User Guide'} subtitle={superAdmin?'Complete company, trial and access-management handbook':'Complete Ara Garage company workspace handbook'} icon={BookOpen} />
      <div className="guide-hero">
        <div>
          <span>{superAdmin?'PLATFORM ADMINISTRATION':'KNOWLEDGE BASE'}</span>
          <h2>{superAdmin?'Manage every company with confidence':'How can we help you?'}</h2>
          <p>{superAdmin?'Search company onboarding, trials, credentials, limits and access controls.':'Search every master, entry, calculation, report and access flow.'}</p>
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
