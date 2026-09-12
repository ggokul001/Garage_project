import { masterApi } from '../api';

const digits = (value: unknown) => String(value ?? '').replace(/\D/g, '');
const money = (value: unknown) => `Rs ${Number(value ?? 0).toLocaleString('en-IN')}`;
const companyName = async () => String((await masterApi.companyBranding()).name ?? 'Ara Garage');

export function openWhatsApp(phone: unknown, message: string) {
  const mobile = digits(phone);
  if (mobile.length < 10) throw new Error('Customer WhatsApp number is not available');
  const normalized = mobile.length === 10 ? `91${mobile}` : mobile;
  window.open(`https://wa.me/${normalized}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
}

export async function shareJobCardWhatsApp(data: Record<string, any>) {
  const company = await companyName();
  openWhatsApp(data.customer_mobile || data.customer_contact, [
    `Dear ${data.customer_name ?? 'Customer'},`,
    '',
    `Your Job Card has been created at ${company}.`,
    `Job Card: ${data.job_card_no ?? '-'}`,
    `Vehicle: ${data.vehicle_number ?? '-'}`,
    `Estimate: ${money(data.estimate_amount)}`,
    `Advance: ${money(data.advance_paid)}`,
    `Balance: ${money(data.balance)}`,
    '',
    `Thank you,`,
    company,
  ].join('\n'));
}

export async function shareWorkOrderWhatsApp(data: Record<string, any>) {
  const company = await companyName();
  const workTotal = (Array.isArray(data.complaints) ? data.complaints : []).reduce((sum: number, row: any) => sum + Number(row.cost ?? 0), 0);
  const sparesTotal = (Array.isArray(data.spares) ? data.spares : []).reduce((sum: number, row: any) => sum + Number(row.total ?? Number(row.quantity || 0) * Number(row.rate || 0)), 0);
  const finalTotal = workTotal + sparesTotal + Number(data.service_cost ?? 0) + Number(data.labour_cost ?? 0);
  openWhatsApp(data.customer_mobile || data.customer_contact, [
    `Dear ${data.customer_name ?? 'Customer'},`,
    '',
    `Your Work Order update from ${company}:`,
    `Work Order: ${data.work_order_no ?? '-'}`,
    `Job Card: ${data.job_card_no ?? '-'}`,
    `Vehicle: ${data.vehicle_number ?? '-'}`,
    `Status: ${String(data.overall_status ?? 'pending').replaceAll('_', ' ')}`,
    `Work Total: ${money(workTotal)}`,
    `Spares Total: ${money(sparesTotal)}`,
    `Bill Total: ${money(finalTotal)}`,
    '',
    `Thank you,`,
    company,
  ].join('\n'));
}

export async function shareBillWhatsApp(data: Record<string, any>) {
  const company = await companyName();
  const work = data.work_order ?? {};
  const complaints = Array.isArray(data.complaints) ? data.complaints : [];
  const spares = Array.isArray(data.spares) ? data.spares : [];
  const workTotal = complaints.reduce((sum: number, row: any) => sum + Number(row.cost ?? 0), 0);
  const sparesTotal = spares.reduce((sum: number, row: any) => sum + Number(row.total ?? Number(row.quantity || 0) * Number(row.rate || 0)), 0);
  const billTotal = workTotal + sparesTotal + Number(work.service_cost ?? 0) + Number(work.labour_cost ?? 0);
  const paid = Number(data.total_paid ?? 0);
  openWhatsApp(data.customer_mobile || data.customer_contact, [
    `Dear ${data.customer_name ?? 'Customer'},`,
    '',
    `Your service bill is ready at ${company}.`,
    `Job Card: ${data.job_card_no ?? '-'}`,
    `Work Order: ${work.work_order_no ?? '-'}`,
    `Vehicle: ${data.vehicle_number ?? '-'}`,
    `Work Total: ${money(workTotal)}`,
    `Spares Total: ${money(sparesTotal)}`,
    `Bill Total: ${money(billTotal)}`,
    `Paid: ${money(paid)}`,
    `Balance: ${money(Math.max(0, billTotal - paid))}`,
    '',
    `Thank you,`,
    company,
  ].join('\n'));
}
