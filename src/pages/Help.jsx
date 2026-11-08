/**
 * pages/Help.jsx — Help & Support: quick answers + a message form.
 * Messages go to /api/support and are stored for the Invmatics team.
 */

import { useState } from 'react';
import { useApi } from '../lib/api';

const FAQ = [
  ['How do I add products and opening stock?',
   'Open Inventory → Products and choose “Add product”. Enter the SKU, prices and reorder point, and set “Opening stock” to the quantity you have now. You can change stock on hand later by editing the product.'],
  ['How do I create a sales order and an invoice?',
   'Go to Orders → Sales Orders and choose “New sales order”. Pick the customer and add items. Leave “Also create a draft invoice” ticked, or use “Create invoice” on the order afterwards. Invoices appear under Invoices, where you can mark them sent, record payments and download the PDF.'],
  ['What happens when I dispatch an order?',
   'Dispatching reduces stock for each item. If there isn’t enough stock the dispatch is blocked and you’ll see what’s short.'],
  ['How do deliveries work?',
   'Open a confirmed sales order and choose “Create delivery order”. Under Delivery you can assign a driver, vehicle and quantities, mark it out for delivery, and record proof of delivery with photos. Delivery order and confirmation documents download as PDFs.'],
  ['How do I reorder low stock?',
   'Inventory → Low Stock lists everything at or below its reorder point. Select items and create purchase orders — one draft per supplier.'],
  ['Can I sell or buy in another currency?',
   'Yes. Choose a currency on a product, sales order or purchase order. Amounts show in your default currency, with the original in brackets. Live exchange rates are used unless you enter your own rate. Set your default currency and timezone under Settings → Company.'],
  ['How do I add my logo, bank details and invoice defaults?',
   'Settings (admins only) has your company details, logo, bank details, default payment terms and tax rate. They appear on your PDF documents.'],
  ['How do I invite my team?',
   'Team (admins only) lets you invite people by email and choose their role: Admin, Manager, Sales, Warehouse or Finance. Roles decide which pages each person can open.'],
];

const CATEGORIES = [
  ['question', 'Question'],
  ['problem', 'Something isn’t working'],
  ['feature', 'Feature request'],
  ['billing', 'Billing'],
];

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL;

export default function Help() {
  const api = useApi();
  const [open, setOpen] = useState(0);
  const [form, setForm] = useState({ category: 'question', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const send = async () => {
    setSending(true); setError(null);
    try {
      await api.post('/support', form);
      setSent(true);
      setForm({ category: 'question', subject: '', message: '' });
    } catch (e) { setError(e.message); }
    finally { setSending(false); }
  };

  const canSend = form.subject.trim() && form.message.trim() && !sending;

  return (
    <div className="im-page" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="im-page-header">
        <div>
          <h1 className="im-page-title">Help &amp; Support</h1>
          <p className="im-page-sub">Quick answers, and a way to reach us</p>
        </div>
      </div>

      <div className="im-panel">
        <div className="im-detail-section-title" style={{ marginTop: 0 }}>Common questions</div>
        {FAQ.map(([q, a], i) => (
          <div key={q} className="im-faq">
            <button className="im-faq-q" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
              <span>{q}</span><span className="im-faq-sign">{open === i ? '−' : '+'}</span>
            </button>
            {open === i && <div className="im-faq-a">{a}</div>}
          </div>
        ))}
      </div>

      <div className="im-panel" style={{ padding: 20 }}>
        <div className="im-detail-section-title" style={{ padding: 0, marginBottom: 12 }}>Contact support</div>
        {sent ? (
          <div>
            <p style={{ fontSize: 14, marginBottom: 12 }}>Thanks — your message has been sent. We’ll get back to you by email.</p>
            <button className="im-btn-ghost" onClick={() => setSent(false)}>Send another message</button>
          </div>
        ) : (
          <>
            {error && <div className="im-error" style={{ marginBottom: 12 }} onClick={() => setError(null)}>{error} ✕</div>}
            <div className="im-form-grid">
              <div className="im-field">
                <label>Topic</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="im-field">
                <label>Subject *</label>
                <input maxLength={150} value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
              </div>
              <div className="im-field span-2">
                <label>Message *</label>
                <textarea rows={6} maxLength={4000} value={form.message}
                  placeholder="Tell us what you were trying to do and what happened."
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {SUPPORT_EMAIL ? <>Or email <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: 'var(--green)' }}>{SUPPORT_EMAIL}</a></> : 'We reply by email.'}
              </span>
              <button className="im-btn-primary" disabled={!canSend} onClick={send}>
                {sending ? 'Sending…' : 'Send message'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
