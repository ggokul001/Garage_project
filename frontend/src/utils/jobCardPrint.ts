import toast from 'react-hot-toast';
import { transactionApi } from '../api';
import {companyIdentity,loadCompanyBranding} from './companyPrint';

const escapeHtml = (value: unknown) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const money = (value: unknown) => Number(value ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const label = (value: unknown) => escapeHtml(value || '—');

function documentHtml(data: Record<string, any>,company:Record<string,unknown>) {
  const complaints = Array.isArray(data.complaints) ? data.complaints : [];
  return `<!doctype html><html><head><meta charset="utf-8"><title>Job Card ${escapeHtml(data.job_card_no)}</title><style>
    @page{size:A4;margin:9mm}*{box-sizing:border-box}body{margin:0;color:#12213f;font-family:Arial,sans-serif;font-size:11px}.print-toolbar{position:sticky;top:0;z-index:10;display:flex;justify-content:flex-end;gap:8px;padding:8px;background:#f8fafc;border-bottom:1px solid #cbd5e1}.print-toolbar button{border:1px solid #cbd5e1;border-radius:8px;background:#f45b0b;color:white;padding:8px 14px;font:700 12px Arial;cursor:pointer}.print-toolbar button.secondary{background:white;color:#102747}.sheet{width:100%;border:1.5px solid #f45b0b}.header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:linear-gradient(135deg,#061a38,#082a56 68%,#b94308);color:#fff}.company-identity{display:flex;align-items:center;gap:14px;max-width:72%}.company-identity img{width:110px;max-height:62px;object-fit:contain;background:#fff;padding:3px;border-radius:5px}.company-identity h1{margin:0;font-size:19px}.company-identity p{margin:2px 0;font-size:8px}.doc{text-align:right}.doc h2{margin:0;font-size:18px}.doc p{margin:4px 0 0;color:#fed7aa}.meta{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid #c8a487}.cell{min-height:48px;padding:8px 10px;border-right:1px solid #dcc7b8}.cell:last-child{border-right:0}.cell span,.summary span{display:block;margin-bottom:4px;color:#60708b;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.7px}.cell strong,.summary strong{font-size:11px}.section-title{margin:0;padding:7px 10px;background:#fff3e8;border-top:1px solid #e2a47d;border-bottom:1px solid #e2a47d;color:#a43b08;font-size:10px;text-transform:uppercase;letter-spacing:1px}.grid{display:grid;grid-template-columns:repeat(4,1fr)}table{width:100%;border-collapse:collapse}th{padding:7px;background:#fff3e8;color:#4b3a30;font-size:8px;text-align:left;text-transform:uppercase;letter-spacing:.6px}td{padding:8px 7px;border-top:1px solid #ead9cc;vertical-align:top}th:first-child,td:first-child{width:42px;text-align:center}th:last-child,td:last-child{width:105px;text-align:right}.totals{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid #c8a487}.summary{padding:10px;border-right:1px solid #dcc7b8}.summary:last-child{border-right:0}.summary.balance{background:#fff7ed}.service{display:grid;grid-template-columns:repeat(4,1fr)}.signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;padding:34px 18px 12px}.signature{border-top:1px solid #73839b;padding-top:5px;text-align:center;color:#60708b;font-size:9px}.footer{display:flex;justify-content:space-between;border-top:1px solid #dcc7b8;padding:7px 10px;color:#75839a;font-size:8px}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}.print-toolbar{display:none!important}.sheet{break-inside:avoid}}
	  .summary{text-align:right;font-variant-numeric:tabular-nums}</style></head><body><div class="print-toolbar"><button class="secondary" onclick="window.close()">Close</button><button onclick="window.print()">Print</button></div><div class="sheet">
    <div class="header">${companyIdentity(company)}<div class="doc"><h2>JOB CARD</h2><p>${label(data.status).toUpperCase()}</p></div></div>
    <div class="meta"><div class="cell"><span>Job Card No</span><strong>${label(data.job_card_no)}</strong></div><div class="cell"><span>Entry Date</span><strong>${label(data.entry_date)}</strong></div><div class="cell"><span>Financial Year</span><strong>${label(data.financial_year_name)}</strong></div><div class="cell"><span>Branch</span><strong>${label(data.branch_name)}</strong></div></div>
    <h3 class="section-title">Vehicle & Customer Details</h3><div class="grid"><div class="cell"><span>Vehicle Number</span><strong>${label(data.vehicle_number)}</strong></div><div class="cell"><span>Model</span><strong>${label(data.vehicle_model)}</strong></div><div class="cell"><span>Chassis Number</span><strong>${label(data.vehicle_chassis)}</strong></div><div class="cell"><span>Current KMS / Hours</span><strong>${label(data.current_kms)} / ${label(data.current_hours)}</strong></div><div class="cell"><span>Customer Name</span><strong>${label(data.customer_name)}</strong></div><div class="cell"><span>Customer Contact</span><strong>${label(data.customer_contact || data.customer_mobile)}</strong></div><div class="cell"><span>Driver Contact</span><strong>${label(data.driver_contact)}</strong></div><div class="cell"><span>Work Order</span><strong>${label(data.work_order_no)}</strong></div></div>
    <h3 class="section-title">Customer Complaints</h3><table><thead><tr><th>S.No</th><th>Complaint</th><th>Estimated Cost</th></tr></thead><tbody>${complaints.map((row: any, index: number) => `<tr><td>${index + 1}</td><td>${label(row.complaint)}</td><td>₹ ${money(row.cost)}</td></tr>`).join('') || '<tr><td>1</td><td>—</td><td>₹ 0.00</td></tr>'}</tbody></table>
    <div class="totals"><div class="summary"><span>Complaint Total</span><strong>₹ ${money(data.complaint_total)}</strong></div><div class="summary"><span>Estimate Amount</span><strong>₹ ${money(data.estimate_amount)}</strong></div><div class="summary"><span>Advance Paid</span><strong>₹ ${money(data.advance_paid)}</strong></div><div class="summary balance"><span>Balance</span><strong>₹ ${money(data.balance)}</strong></div></div>
    <h3 class="section-title">Next Service Schedule</h3><div class="service"><div class="cell"><span>Average Daily KMS</span><strong>${label(data.average_daily_kms)}</strong></div><div class="cell"><span>Next Service KMS</span><strong>${label(data.next_service_kms)}</strong></div><div class="cell"><span>Average Daily Hours</span><strong>${label(data.average_daily_hours)}</strong></div><div class="cell"><span>Next Service Hours</span><strong>${label(data.next_service_hours)}</strong></div><div class="cell"><span>Next Service Days</span><strong>${label(data.next_service_days)}</strong></div><div class="cell"><span>Next Service Date</span><strong>${label(data.next_service_date)}</strong></div><div class="cell"><span>Created By</span><strong>${label(data.created_by_name)}</strong></div><div class="cell"><span>Approved By</span><strong>${label(data.approved_by_name)}</strong></div></div>
    <div class="signatures"><div class="signature">Service Advisor</div><div class="signature">Customer Signature</div><div class="signature">Authorized Signatory</div></div><div class="footer"><span>${label(company.name)}</span><span>Printed ${new Date().toLocaleString('en-IN')}</span></div>
  </div></body></html>`;
}

export async function openJobCardPrint(data: Record<string, any>) {
  const printWindow = window.open('', '_blank', 'width=1000,height=800');
  if (!printWindow) return toast.error('Please allow pop-ups to print the Job Card');
  try{const company=await loadCompanyBranding();printWindow.document.open();
  printWindow.document.write(documentHtml(data,company));
  printWindow.document.close();
  }catch(error){printWindow.close();toast.error(error instanceof Error?error.message:'Unable to load company print details')}
}

export async function printJobCardById(id: number) {
  const printWindow = window.open('', '_blank', 'width=1000,height=800');
  if (!printWindow) return toast.error('Please allow pop-ups to print the Job Card');
  printWindow.document.write('<!doctype html><title>Loading Job Card...</title><body style="font-family:Arial;padding:40px">Loading Job Card...</body>');
  try {
    const [data,company] = await Promise.all([transactionApi.jobCard(id),loadCompanyBranding()]);
    printWindow.document.open();
    printWindow.document.write(documentHtml(data,company));
    printWindow.document.close();
  } catch (error) {
    printWindow.close();
    toast.error(error instanceof Error ? error.message : 'Unable to print Job Card');
  }
}
