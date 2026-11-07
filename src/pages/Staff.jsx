/**
 * pages/Staff.jsx — Team & roles (admin only)
 * Real data from /api/staff: members, pending invitations, role changes, deactivation.
 */

import { useState, useEffect } from 'react';
import { useApi } from '../lib/api';

const ROLES = ['admin', 'manager', 'sales', 'warehouse', 'finance'];

const ROLE_CLS = { admin: 'info', manager: 'blue', sales: 'ok', warehouse: 'warn', finance: 'muted' };

const ROLE_DESC = {
  admin:     'Everything, including settings and team',
  manager:   'Everything except settings and team',
  sales:     'Customers, quotations, sales orders, invoices',
  warehouse: 'Products, inventory, suppliers, purchase orders, dispatch',
  finance:   'Invoices, payments, receipts and reports',
};

// What each role can do — mirrors backend/permissions.py. Columns follow ROLES.
const MATRIX = [
  ['View dashboard, stock and orders',        [1, 1, 1, 1, 1]],
  ['Products, suppliers, stock adjustments',  [1, 1, 0, 1, 0]],
  ['Receive stock & purchase orders',         [1, 1, 0, 1, 0]],
  ['Dispatch sales orders',                   [1, 1, 0, 1, 0]],
  ['Customers, quotations, sales orders',     [1, 1, 1, 0, 0]],
  ['Invoices, receipts and payments',         [1, 1, 1, 0, 1]],
  ['Reports and analytics',                   [1, 1, 0, 0, 1]],
  ['Company settings',                        [1, 0, 0, 0, 0]],
  ['Team and roles',                          [1, 0, 0, 0, 0]],
];

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const when = (iso) => iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never';

export default function Staff() {
  const api = useApi();

  const [data,      setData]      = useState(null);   // { members, invites, me }
  const [error,     setError]     = useState(null);
  const [notice,    setNotice]    = useState(null);
  const [busy,      setBusy]      = useState(null);   // id of the row being changed
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey(k => k + 1);

  const [showInvite, setShowInvite] = useState(false);
  const [form,       setForm]       = useState({ email: '', role: 'warehouse' });
  const [sending,    setSending]    = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await api.get('/staff');
        if (!cancelled) { setData(d); setError(null); }
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [api, reloadKey]);

  const update = async (member, patch, okMsg) => {
    setBusy(member.id); setNotice(null);
    try {
      await api.put(`/staff/${member.id}`, patch);
      setNotice(okMsg);
      reload();
    } catch (e) { setError(e.message); }
    finally { setBusy(null); }
  };

  const changeRole = (m, role) => {
    if (role === m.role) return;
    update(m, { role }, `${m.full_name} is now ${role}.`);
  };

  const toggleActive = (m) => {
    if (m.is_active && !confirm(`Deactivate ${m.full_name}? They'll be signed out of Invmatics straight away.`)) return;
    update(m, { is_active: !m.is_active }, m.is_active ? `${m.full_name} deactivated.` : `${m.full_name} reactivated.`);
  };

  const sendInvite = async () => {
    setSending(true); setNotice(null);
    try {
      const r = await api.post('/staff/invite', form);
      setShowInvite(false);
      setForm({ email: '', role: 'warehouse' });
      setNotice(`Invitation sent to ${r.email}.`);
      reload();
    } catch (e) { setError(e.message); }
    finally { setSending(false); }
  };

  const revoke = async (inv) => {
    setBusy(inv.id); setNotice(null);
    try {
      await api.delete(`/staff/invites/${inv.id}`);
      setNotice(`Invitation to ${inv.email} cancelled.`);
      reload();
    } catch (e) { setError(e.message); }
    finally { setBusy(null); }
  };

  const members = data?.members || [];
  const invites = data?.invites || [];

  return (
    <div className="im-page">
      <div className="im-page-header">
        <div>
          <h1 className="im-page-title">Team & Roles</h1>
          <p className="im-page-sub">
            {data === null ? 'Loading…' : `${members.filter(m => m.is_active).length} active members`}
          </p>
        </div>
        <button className="im-btn-primary" onClick={() => setShowInvite(true)}>+ Invite team member</button>
      </div>

      {error  && <div className="im-error" onClick={() => setError(null)}>{error} ✕</div>}
      {notice && (
        <div className="im-error" style={{ background: 'var(--green-light, #ECFDF5)', color: 'var(--green)', borderColor: 'var(--green)' }}
          onClick={() => setNotice(null)}>{notice} ✕</div>
      )}

      {/* Members */}
      <div className="im-panel">
        <div className="im-table-wrap">
          <table className="im-table">
            <thead>
              <tr><th>Member</th><th>Role</th><th>Status</th><th>Last sign-in</th><th></th></tr>
            </thead>
            <tbody>
              {data === null ? (
                Array(3).fill(0).map((_, i) => (
                  <tr key={i}>{Array(5).fill(0).map((_, j) => (
                    <td key={j}><div className="im-skeleton" style={{ height: 13, width: '70%' }} /></td>
                  ))}</tr>
                ))
              ) : members.map(m => {
                const isMe = m.id === data.me;
                return (
                  <tr key={m.id} style={{ opacity: m.is_active ? 1 : 0.55 }}>
                    <td>
                      <div className="im-td-primary">{m.full_name}{isMe && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> (you)</span>}</div>
                      <div className="im-td-sub">{m.email}</div>
                    </td>
                    <td>
                      <select value={m.role} disabled={busy === m.id}
                        onChange={e => changeRole(m, e.target.value)}
                        style={{ padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)', color: 'var(--text-primary)', fontSize: 13 }}>
                        {ROLES.map(r => <option key={r} value={r}>{cap(r)}</option>)}
                      </select>
                    </td>
                    <td>
                      <span className={`im-status-badge ${m.is_active ? 'ok' : 'muted'}`}>
                        {m.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{when(m.last_login_at)}</td>
                    <td>
                      {!isMe && (
                        <button className={`im-btn-ghost ${m.is_active ? 'red' : ''}`} disabled={busy === m.id}
                          onClick={() => toggleActive(m)}>
                          {m.is_active ? 'Deactivate' : 'Reactivate'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending invitations */}
      {invites.length > 0 && (
        <>
          <div className="im-detail-section-title">Pending invitations</div>
          <div className="im-panel">
            <div className="im-table-wrap">
              <table className="im-table">
                <thead><tr><th>Email</th><th>Role</th><th>Sent</th><th></th></tr></thead>
                <tbody>
                  {invites.map(i => (
                    <tr key={i.id}>
                      <td>{i.email}</td>
                      <td><span className={`im-status-badge ${ROLE_CLS[i.role] || 'muted'}`}>{i.role}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {i.created_at ? when(new Date(i.created_at).toISOString()) : '—'}
                      </td>
                      <td>
                        <button className="im-btn-ghost red" disabled={busy === i.id} onClick={() => revoke(i)}>
                          Cancel invite
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* What each role can do */}
      <div className="im-detail-section-title">What each role can do</div>
      <div className="im-panel">
        <div className="im-table-wrap">
          <table className="im-table">
            <thead>
              <tr>
                <th>Access</th>
                {ROLES.map(r => (
                  <th key={r} className="center" title={ROLE_DESC[r]}>
                    <span className={`im-status-badge ${ROLE_CLS[r]}`}>{r}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX.map(([label, perms]) => (
                <tr key={label}>
                  <td style={{ fontSize: 13 }}>{label}</td>
                  {perms.map((ok, i) => (
                    <td key={i} className="center">
                      {ok ? <span style={{ color: 'var(--green)', fontSize: 16 }}>✓</span>
                          : <span style={{ color: 'var(--border)', fontSize: 14 }}>—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showInvite && (
        <div className="im-modal-overlay" onClick={() => setShowInvite(false)}>
          <div className="im-modal" onClick={e => e.stopPropagation()}>
            <div className="im-modal-header">
              <h2>Invite team member</h2>
              <button className="im-modal-close" onClick={() => setShowInvite(false)}>✕</button>
            </div>
            <div className="im-modal-body">
              <div className="im-form-grid">
                <div className="im-field span-2">
                  <label>Email address *</label>
                  <input type="email" value={form.email} placeholder="name@company.com" autoFocus
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="im-field span-2">
                  <label>Role *</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    {ROLES.map(r => <option key={r} value={r}>{cap(r)} — {ROLE_DESC[r]}</option>)}
                  </select>
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
                They'll get an email with a link to create their account and join your organisation with this role.
              </p>
            </div>
            <div className="im-modal-footer">
              <button className="im-btn-ghost" onClick={() => setShowInvite(false)}>Cancel</button>
              <button className="im-btn-primary" onClick={sendInvite} disabled={sending || !form.email.trim()}>
                {sending ? 'Sending…' : 'Send invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
