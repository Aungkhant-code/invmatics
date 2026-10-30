/**
 * pages/Staff.jsx — Staff and access control (Admin only)
 * Real data from /api/auth/me and users table
 */

import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../lib/api';

const ROLES = ['admin', 'manager', 'sales', 'warehouse', 'finance'];

const ROLE_CLS = {
  admin: 'info', manager: 'blue', sales: 'ok',
  warehouse: 'warn', finance: 'muted',
};

export default function Staff() {
  const api = useApi();

  const [me,       setMe]       = useState(null);
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'warehouse' });
  const [saving,   setSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/auth/me');
      setMe(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const sendInvite = async () => {
    setSaving(true);
    try {
      // Invite endpoint — creates invitation row, sends email via Clerk
      await api.post('/users/invite', inviteForm);
      setShowInvite(false);
      setInviteForm({ email: '', role: 'warehouse' });
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const isAdmin = me?.role === 'admin';

  return (
    <div className="im-page">
      <div className="im-page-header">
        <div>
          <h1 className="im-page-title">Staff & Access</h1>
          <p className="im-page-sub">Manage team members and roles</p>
        </div>
        {isAdmin && (
          <button className="im-btn-primary" onClick={() => setShowInvite(true)}>
            + Invite staff
          </button>
        )}
      </div>

      {error && <div className="im-error">{error}</div>}

      {/* Current user profile */}
      {me && (
        <div className="im-panel" style={{ padding: 20, marginBottom: 0 }}>
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

      {/* Role permissions reference */}
      <div className="im-panel">
        <div className="im-panel-header">
          <div className="im-panel-title">Role permissions</div>
        </div>
        <div className="im-table-wrap">
          <table className="im-table">
            <thead>
              <tr>
                <th>Permission</th>
                {ROLES.map(r => <th key={r} className="center"><span className={`im-status-badge ${ROLE_CLS[r]}`}>{r}</span></th>)}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'View dashboard',      perms: [true,  true,  true,  true,  true]  },
                { label: 'Manage products',     perms: [true,  true,  false, false, false] },
                { label: 'Create sales orders', perms: [true,  true,  true,  false, false] },
                { label: 'Manage invoices',     perms: [true,  true,  false, false, true]  },
                { label: 'Receive stock',       perms: [true,  true,  false, true,  false] },
                { label: 'Stock adjustments',   perms: [true,  true,  false, true,  false] },
                { label: 'View reports',        perms: [true,  true,  true,  false, true]  },
                { label: 'Manage staff',        perms: [true,  false, false, false, false] },
                { label: 'Organisation settings',perms:[true,  false, false, false, false] },
              ].map(row => (
                <tr key={row.label}>
                  <td style={{ fontSize: 13 }}>{row.label}</td>
                  {row.perms.map((allowed, i) => (
                    <td key={i} className="center">
                      {allowed
                        ? <span style={{ color: 'var(--green)', fontSize: 16 }}>✓</span>
                        : <span style={{ color: 'var(--border)', fontSize: 14 }}>—</span>
                      }
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
                An invitation email will be sent. The link expires in 7 days.
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