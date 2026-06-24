import { get, getBlob } from './client.js';

export const getInvoices = (filters) => get('/invoices' + (filters ? '?' + new URLSearchParams(filters) : ''));
export const getInvoice  = (id)      => get(`/invoices/${id}`);

export async function downloadInvoicePDF(invoiceId) {
  const blob = await getBlob(`/invoices/${invoiceId}/pdf`);
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${invoiceId}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
