/**
 * pages/Staff.jsx — Staff and access control
 * Data from /api/auth/me and /api/users (admin/manager can view; admin can change)
 */

import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../lib/api';

const ROLES = ['admin', 'manager', 'sales', 'warehouse', 'finance'];

const ROLE_CLS = {
  admin: 'info', manager: 'blue', sales: 'ok',
  warehouse: 'warn', finance: 'muted',
};

const PERMISSIONS = [
  { label: 'View dashboard',        perms: [true,  true,  true,  true,  true]  },
  { label: 'Manage products',       perms: [true,  true,  false, false, false] },
  { label: 'Create sales orders',   perms: [true,  true,  true,  false, false] },
  { label: 'Manage invoices',       perms: [true,  true,  false, false, true]  },
  { label: 'Receive stock',         perms: [true,  true,  false, true,  false] },
  { label: 'Stock adjustments',     perms: [true,  true,  false, true,  false] },
  { label: 'View reports',          perms: [true,  true,  true,  false, true]  },
  { label: 'Manage staff',          perms: [true,  false, false, false, false] },
  { label: 'Organisation settings', perms: [true,  false, false, false, false] },
];

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

export default function Staff() {
  const api = useApi();

  const [me,         setMe]         = useState(null);
  const [staff,      setStaff]      = useState([]);
  const [invites,    setInvites]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [notice,     setNotice]     = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'warehouse' });
  const [saving,     setSaving]     = useState(false);

  const load = useCallback(async () => {
    try {
      const meData = await api.get('/auth/me');
      setMe(meData);
      if (meData.role === 'admin' || meData.role === 'manager') {
        const data = await api.get('/users');
        setStaff(data.users || []);
        setInvites(data.invitations || []);
      }
      setError(null);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [api]);

  useEffect(() => {
    // load() only sets state after the network await, never synchronously
    (async () => { await load(); })();
  }, [load]);

  const isAdmin = me?.role === 'admin';
  const canSeeTeam = isAdmin || me?.role === 'manager';

  const sendInvite = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await api.post('/users/invite', {
        email: inviteForm.email.trim(),
        role:  inviteForm.role,
      });
      setNotice(res.message || 'Invitation sent');
      setShowInvite(false);
      setInviteForm({ email: '', role: 'warehouse' });
      load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const changeRole = async (userId, role) => {
    setError(null);
    try {
      await api.put(`/users/${userId}/role`, { role });
      setStaff(list => list.map(s => (s.id === userId ? { ...s, role } : s)));
    } catch (e) { setError(e.message); }
  };

  const deactivate = async (member) => {
    if (!confirm(`Deactivate ${member.full_name}? They will lose access to Invmatics.`)) return;
    setError(null);
    try {
      await api.delete(`/users/${member.id}`);
      setStaff(list => list.map(s => (s.id === member.id ? { ...s, is_active: false } : s)));
    } catch (e) { setError(e.message); }
  };

  const cancelInvite = async (id) => {
    setError(null);
    try {
      await api.delete(`/users/invitations/${id}`);
      setInvites(list => list.filter(i => i.id !== id));
    } catch (e) { setError(e.message); }
  };

  return (
    <div className="im-page">
      <div className="im-page-header">
        <div>
          <h1 className="im-page-title">Staff &amp; Access</h1>
          <p className="im-page-sub">Manage team members and roles</p>
        </div>
        {isAdmin && (
          <button className="im-btn-primary" onClick={() => setShowInvite(true)}>
            + Invite staff
          </button>
        )}
      </div>

      {error  && <div className="im-error" onClick={() => setError(null)}>{error} ✕</div>}
      {notice && (
        <div className="im-error"
          style={{ background: 'var(--green-light)', color: 'var(--green)', borderColor: 'var(--green)' }}
          onClick={() => setNotice(null)}>
          {notice} ✕
        </div>
      )}

      {/* Current user */}
      {me && (
        <div className="im-panel" style={{ padding: 20 }}>
          <div className="im-panel-header" style={{ padding: 0, marginBottom: 16, border: 'none' }}>
            <div className="im-panel-title">Your account</div>
          </div>
          <div className="im-detail-grid">
            <div className="im-detail-field"><span>Name</span><strong>{me.user?.full_name}</strong></div>
            <div className="im-detail-field"><span>Email</span><strong>{me.user?.email}</strong></div>
            <div className="im-detail-field">
              <span>Role</span>
              <span className={`im-status-badge ${ROLE_CLS[me.role] || 'muted'}`}>{me.role}</span>
            </div>
            <div className="im-detail-field"><span>Organisation</span><strong>{me.org?.name}</strong></div>
            <div className="im-detail-field"><span>Plan</span>
              <span className="im-status-badge info">{me.org?.plan}</span>
            </div>
            <div className="im-detail-field"><span>Currency</span><strong>{me.org?.currency}</strong></div>
          </div>
        </div>
      )}

      {/* Team */}
      {canSeeTeam && (
        <div className="im-panel">
          <div className="im-panel-header">
            <div className="im-panel-title">Team ({staff.filter(s => s.is_active).length} active)</div>
          </div>
          <div className="im-table-wrap">
            <table className="im-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Last login</th>
                  <th>Status</th>
                  {isAdmin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(3).fill(0).map((_, i) => (
                    <tr key={i}>{Array(isAdmin ? 6 : 5).fill(0).map((_, j) => (
                      <td key={j}><div className="im-skeleton" style={{ height: 13, width: '75%' }} /></td>
                    ))}</tr>
                  ))
                ) : staff.map(s => {
                  const isMe = s.id === me?.user?.id;
                  return (
                    <tr key={s.id} style={{ opacity: s.is_active ? 1 : 0.5 }}>
                      <td><div className="im-td-primary">{s.full_name}{isMe && ' (you)'}</div></td>
                      <td>{s.email}</td>
                      <td>
                        {isAdmin && !isMe && s.is_active ? (
                          <select value={s.role} onChange={e => changeRole(s.id, e.target.value)}
                            style={{ padding: '4px 8px', background: 'var(--bg)', color: 'var(--text-primary)',
                                     border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}>
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        ) : (
                          <span className={`im-status-badge ${ROLE_CLS[s.role] || 'muted'}`}>{s.role}</span>
                        )}
                      </td>
                      <td>{fmtDate(s.last_login_at)}</td>
                      <td>
                        <span className={`im-status-badge ${s.is_active ? 'ok' : 'muted'}`}>
                          {s.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td>
                          {!isMe && s.is_active && (
                            <button className="im-btn-ghost red" onClick={() => deactivate(s)}>Deactivate</button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pending invitations */}
      {canSeeTeam && invites.length > 0 && (
        <div className="im-panel">
          <div className="im-panel-header">
            <div className="im-panel-title">Pending invitations ({invites.length})</div>
          </div>
          <div className="im-table-wrap">
            <table className="im-table">
              <thead>
                <tr><th>Email</th><th>Role</th><th>Expires</th><th>Status</th>{isAdmin && <th></th>}</tr>
              </thead>
              <tbody>
                {invites.map(i => {
                  const expired = new Date(i.expires_at) < new Date();
                  return (
                    <tr key={i.id}>
                      <td>{i.email}</td>
                      <td><span className={`im-status-badge ${ROLE_CLS[i.role] || 'muted'}`}>{i.role}</span></td>
                      <td>{fmtDate(i.expires_at)}</td>
                      <td><span className={`im-status-badge ${expired ? 'out' : 'warn'}`}>
                        {expired ? 'Expired' : 'Pending'}
                      </span></td>
                      {isAdmin && (
                        <td><button className="im-btn-ghost red" onClick={() => cancelInvite(i.id)}>Cancel</button></td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Permission reference */}
      <div className="im-panel">
        <div className="im-panel-header">
          <div className="im-panel-title">Role permissions</div>
        </div>
        <div className="im-table-wrap">
          <table className="im-table">
            <thead>
              <tr>
                <th>Permission</th>
                {ROLES.map(r => (
                  <th key={r} className="center">
                    <span className={`im-status-badge ${ROLE_CLS[r]}`}>{r}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map(row => (
                <tr key={row.label}>
                  <td style={{ fontSize: 13 }}>{row.label}</td>
                  {row.perms.map((allowed, i) => (
                    <td key={i} className="center">
                      {allowed
                        ? <span style={{ color: 'var(--green)', fontSize: 16 }}>✓</span>
                        : <span style={{ color: 'var(--border)', fontSize: 14 }}>—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite modal */}
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
                  <input type="email" value={inviteForm.email} placeholder="staff@company.com"
                    onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="im-field span-2">
                  <label>Role *</label>
                  <select value={inviteForm.role}
                    onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}>
                    {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
                They'll get an email with a sign-up link that expires in 7 days.
              </p>
            </div>
            <div className="im-modal-footer">
              <button className="im-btn-ghost" onClick={() => setShowInvite(false)}>Cancel</button>
              <button className="im-btn-primary" onClick={sendInvite} disabled={saving || !inviteForm.email}>
                {saving ? 'Sending…' : 'Send invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
