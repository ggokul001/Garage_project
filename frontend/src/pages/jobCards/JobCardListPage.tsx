import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Eye, Pencil, Plus, Printer, Search, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { transactionApi } from '../../api';
import { useFy } from '../../fyStore';
import { useAuth } from '../../authStore';
import { AuditActionButton } from '../../components/AuditTimeline';
import { printJobCardById } from '../../utils/jobCardPrint';
import { PageTitle } from '../UsersPage';
import { ListPagination } from '../../components/ListPagination';

export function JobCardListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const has = useAuth((state) => state.has);
  const fy = useFy((state) => state.activeId);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const list = useQuery({ queryKey: ['job-cards', fy, page, search], queryFn: () => transactionApi.jobCards({ financial_year_id: fy, page, search }), enabled: !!fy });
  const remove = useMutation({ mutationFn: transactionApi.deleteJobCard, onSuccess: () => { toast.success('Job Card deleted'); qc.invalidateQueries({ queryKey: ['job-cards'] }); }, onError: (error: Error) => toast.error(error.message) });

  return <div>
    <PageTitle title="Job Cards" subtitle="Service intake, estimates and customer complaints" icon={ClipboardList} action={has('JOB_CARD_CREATE') ? <button className="btn-primary" onClick={() => navigate('/job-cards/new')}><Plus size={16} />New Job Card</button> : null} />
    <div className="panel overflow-hidden">
      <div className="table-toolbar"><div className="relative max-w-sm flex-1"><Search className="search-icon" size={15} /><input className="input pl-9" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Job card, vehicle, customer, contact..." /></div><span>{list.data?.meta.total ?? 0} records</span></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1050px]"><thead><tr><th>Job Card No</th><th>Date</th><th>Vehicle</th><th>Customer</th><th>Contact</th><th className="text-right">Estimate</th><th className="text-right">Balance</th><th>Status</th><th>Work Order</th><th className="text-right">Actions</th></tr></thead><tbody>{list.data?.data.map((row: any) => <tr key={row.id}><td className="font-semibold text-primary">{row.job_card_no}</td><td>{row.entry_date}</td><td>{row.vehicle_number}</td><td>{row.customer_name}</td><td>{row.customer_contact}</td><td className="text-right">₹ {Number(row.estimate_amount).toLocaleString('en-IN')}</td><td className="text-right">₹ {Number(row.balance).toLocaleString('en-IN')}</td><td><span className={row.status === 'completed' ? 'badge-active' : row.status === 'draft' ? 'badge-inactive' : 'badge-info'}>{String(row.status).replace('_', ' ')}</span></td><td>{row.work_order_no ?? '—'}</td><td><div className="flex justify-end gap-1"><button className="action" title="View" onClick={() => navigate(`/job-cards/${row.id}`)}><Eye size={15} /></button><button className="action" title="Print Job Card" onClick={() => printJobCardById(Number(row.id))}><Printer size={15} /></button>{has('AUDIT_VIEW') && <AuditActionButton entityType="job-cards" recordId={row.id} title={String(row.job_card_no)} code={String(row.job_card_no)} />}{row.status === 'draft' && has('JOB_CARD_UPDATE') && <button className="action" title="Edit" onClick={() => navigate(`/job-cards/${row.id}`)}><Pencil size={15} /></button>}{row.status === 'draft' && has('JOB_CARD_DELETE') && <button className="action danger" title="Delete" onClick={() => confirm('Delete this draft Job Card?') && remove.mutate(row.id)}><Trash2 size={15} /></button>}</div></td></tr>)}</tbody></table></div>
      {!list.data?.data.length && !list.isLoading && <div className="empty-state"><ClipboardList size={30} /><span>No Job Cards found</span></div>}
      <ListPagination page={page} pageSize={list.data?.meta.pageSize??15} total={list.data?.meta.total??0} onPageChange={setPage}/>
    </div>
  </div>;
}
