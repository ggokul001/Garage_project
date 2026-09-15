import { FormEvent, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, Printer, ReceiptText, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { masterApi, transactionApi } from '../../api';
import { useFy } from '../../fyStore';
import { useListQueryState } from '../../hooks/useListQueryState';
import { ListPagination } from '../../components/ListPagination';
import { PageTitle } from '../UsersPage';
import { printCustomerBill } from '../../utils/billingPrint';
import { shareBillWhatsApp } from '../../utils/whatsappShare';

export function BillingPage() {
  const fy = useFy((s) => s.activeId);
  const [branchId,setBranchId] = useState(0);
  const branches = useQuery({ queryKey: ['options','branches'], queryFn: () => masterApi.options('branches') });
  const { page, pageSize, search, setPage, setPageSize, setSearch } = useListQueryState();
  const [searchText, setSearchText] = useState(search);
  const list = useQuery({
    queryKey: ['billing-accounts', fy, page, pageSize, search, branchId],
    queryFn: () => transactionApi.accounts({ financial_year_id: fy, page, pageSize, search, branch_id: branchId || undefined }),
    enabled: !!fy,
  });

  useEffect(() => setSearchText(search), [search]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setSearch(searchText.trim());
  };

  const printBill = async (jobCardId: number) => {
    try {
      const bill = await transactionApi.billing(jobCardId);
      await printCustomerBill(bill);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to print bill');
    }
  };

  const shareBill = async (jobCardId: number) => {
    try {
      const bill = await transactionApi.billing(jobCardId);
      await shareBillWhatsApp(bill);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to share bill');
    }
  };

  return (
    <div>
      <PageTitle title="Billing" subtitle="Generate and print customer bills from approved Job Cards" icon={ReceiptText} />
      <div className="panel overflow-hidden">
        <div className="table-toolbar">
          <form className="flex max-w-xl flex-1 gap-2" onSubmit={submitSearch}>
            <div className="relative flex-1">
              <Search className="search-icon" size={15} />
              <input
                className="input pl-9"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Customer, vehicle, contact, Job Card, Work Order..."
              />
            </div>
            <button type="submit" className="btn-secondary h-10 px-3 text-xs">
              <Search size={14} />
              Search
            </button>
          </form>
          <select className="input max-w-xs" value={branchId} onChange={event=>{setBranchId(Number(event.target.value));setPage(1)}}><option value={0}>All branches</option>{branches.data?.map(branch=><option key={branch.id} value={branch.id}>{String(branch.name)}</option>)}</select>
          <span>{list.data?.meta.total ?? 0} bills</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1750px]">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Vehicle</th>
                <th>Contact</th>
                <th>Job Card No</th>
                <th>Work Order No</th>
                <th>Status</th>
                <th className="text-right">Estimate</th>
                <th className="text-right">Work Total</th>
                <th className="text-right">Spare Amount</th>
                <th className="text-right">Service</th>
                <th className="text-right">Labour</th>
                <th className="text-right">Bill Total</th>
                <th className="text-right">Paid</th>
                <th className="text-right">Balance</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.data?.data.map((row: any) => (
                <tr key={row.job_card_id}>
                  <td className="font-medium text-fg">{row.customer_name}</td>
                  <td>{row.vehicle_number}</td>
                  <td>{row.contact_number}</td>
                  <td className="text-primary">{row.job_card_no}</td>
                  <td>{row.work_order_no ?? '-'}</td>
                  <td>
                    <span className={row.job_status === 'completed' ? 'badge-active' : row.job_status === 'pending' ? 'badge-warn' : 'badge-info'}>
                      {String(row.job_status).replaceAll('_', ' ')}
                    </span>
                  </td>
                  <Money value={row.estimate_amount} />
                  <Money value={row.work_total} />
                  <Money value={row.spare_total} />
                  <Money value={row.service_cost} />
                  <Money value={row.labour_cost} />
                  <Money value={row.bill_total} strong />
                  <Money value={row.total_paid} />
                  <Money value={row.balance} strong />
                  <td>
                    <div className="flex justify-end gap-2">
                      <button type="button" className="btn-secondary h-8 px-3 text-xs" onClick={() => shareBill(Number(row.job_card_id))}>
                        <MessageCircle size={13} />
                        WhatsApp
                      </button>
                      <button type="button" className="btn-primary h-8 px-3 text-xs" onClick={() => printBill(Number(row.job_card_id))}>
                        <Printer size={13} />
                        Print Bill
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!list.data?.data.length && !list.isLoading && (
          <div className="empty-state">
            <ReceiptText size={30} />
            <span>No approved Job Cards available for billing.</span>
          </div>
        )}
        <ListPagination page={page} pageSize={pageSize} total={list.data?.meta.total ?? 0} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>
    </div>
  );
}

function Money({ value, strong = false }: { value: unknown; strong?: boolean }) {
  return <td className={`text-right ${strong ? 'font-bold text-fg' : ''}`}>Rs {Number(value ?? 0).toLocaleString('en-IN')}</td>;
}
