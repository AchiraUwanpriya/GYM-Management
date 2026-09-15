// ============================================================
//  HealthRecords.jsx — PAR-Q Management (Admin & Trainer)
//  Allows filtering by member name or ID
// ============================================================
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllParQ, fetchTrainerMembersParQ, updateParQStatus } from '../actions/parqAction';
import { fetchMembers } from '../actions/memberAction';
import { fetchUsers } from '../actions/usersAction';
import { ROLES } from '../../index';
import DataTable from '../components/DataTable';
import Badge from '../components/Badge';
import Modal from '../components/Modal';

const isTrue = (v) => String(v) === 'True' || String(v) === 'true' || v === 1 || v === true || v === '1';
const hasRiskFlag = (r) => {
  if (!r) return false;
  const hasYes = isTrue(r.q1_heart_condition) || isTrue(r.q2_chest_pain_activity) ||
                 isTrue(r.q3_chest_pain_rest) || isTrue(r.q4_dizziness) ||
                 isTrue(r.q5_bone_joint) || isTrue(r.q6_blood_pressure_meds) ||
                 isTrue(r.q6_bp_medication) || isTrue(r.q7_other_reason);
  return hasYes && !isTrue(r.physician_clearance);
};

export default function HealthRecords() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const parqState = useSelector((s) => s.parq || {});
  const members = useSelector((s) => s.members?.data || []);
  const users = useSelector((s) => s.users?.data || []);
  
  // Get data based on user role
  const data = user?.roleName === ROLES.ADMIN ? parqState.all : parqState.members;
  const loading = user?.roleName === ROLES.ADMIN ? parqState.allLoading : parqState.membersLoading;
  
  const [search, setSearch] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    dispatch(fetchMembers());
    dispatch(fetchUsers());
    if (user?.roleName === ROLES.ADMIN) {
      dispatch(fetchAllParQ());
    } else if (user?.roleName === ROLES.TRAINER) {
      dispatch(fetchTrainerMembersParQ(user.userId));
    }
  }, [dispatch, user]);

  const resolveMemberName = (row) => {
    const member = members.find((m) =>
      String(m.memberId) === String(row.memberId) ||
      String(m.userId) === String(row.userId)
    );
    const memberUser = users.find((u) => String(u.userId) === String(row.userId || member?.userId));
    return (
      row.memberName ||
      `${row.firstName || member?.firstName || memberUser?.firstName || ''} ${row.lastName || member?.lastName || memberUser?.lastName || ''}`.trim() ||
      (row.memberId ? `Member #${row.memberId}` : row.userId ? `User #${row.userId}` : '—')
    );
  };

  const displayData = (data || []).map((r) => ({ ...r, displayMemberName: resolveMemberName(r) }));

  const filtered = displayData.filter(r =>
    (r.displayMemberName || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.memberId || r.userId || '').toString().includes(search)
  );

  const handleStatusChange = (row, newStatus) => {
    if (newStatus === row.status) return;
    if (newStatus === 'deleted' && !window.confirm(`Mark ${row.displayMemberName || 'this member'}'s PAR-Q as deleted?`)) {
      return;
    }
    dispatch(updateParQStatus(row.userId, newStatus));
  };

  const columns = [
    { key: 'memberId', label: 'Member ID', width: 100, render: (v, row) => <span className="id-chip">#{v || row.userId}</span> },
    { key: 'displayMemberName', label: 'Member Name', render: (v) => <span className="font-bold">{v || '—'}</span> },
    { key: 'submitted_date', label: 'Submitted', render: (v) => v ? v.substring(0, 10) : '—' },
    // Red flag now driven by physician_clearance, which the backend keeps in
    // sync with Q1-Q7 on both Add and Edit (physician_clearance = 0 means at
    // least one "yes" answer, i.e. red flag).
    { key: 'physician_clearance', label: 'Risk Flags', render: (v, row) => (
      hasRiskFlag(row)
        ? <Badge variant="inactive">⚠️ High Risk</Badge>
        : <Badge variant="active">✅ Clear</Badge>
    )},
    { key: 'status', label: 'Status', render: (v, row) => (
      user?.roleName === ROLES.ADMIN ? (
        <select
          className="gym-input"
          style={{ width: 110, padding: '4px 8px', fontSize: '0.8rem' }}
          value={v || 'active'}
          onChange={(e) => handleStatusChange(row, e.target.value)}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="deleted">Deleted</option>
        </select>
      ) : (
        <Badge variant={v === 'deleted' ? 'inactive' : v === 'inactive' ? 'inactive' : 'active'}>
          {(v || 'active').charAt(0).toUpperCase() + (v || 'active').slice(1)}
        </Badge>
      )
    )},
    { key: '_view', label: 'Form', render: (_, row) => (
      <button className="btn btn-secondary btn-sm" onClick={() => setSelectedRecord(row)}>👁️ View Details</button>
    )}
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <div className="page-title">Member Health Records</div>
          <div className="page-sub">Review and filter PAR-Q safety questionnaires</div>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--gym-muted)' }}>🔍</span>
          <input
            className="gym-input pl-8 w-64"
            placeholder="Search by member name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <DataTable columns={columns} data={filtered} loading={loading} rowKey="parqId" />

      {/* Details Modal */}
      <Modal 
        isOpen={!!selectedRecord} 
        onClose={() => setSelectedRecord(null)} 
        title={`PAR-Q Detail: ${selectedRecord?.displayMemberName || ''}`.trim()}
        maxWidth={600}
      >
        <div className="modal-body space-y-4">
          <div className="p-4 rounded-xl" style={{ background: 'var(--gym-surface2)', borderLeft: '4px solid var(--gym-accent)' }}>
            <div className="text-xs uppercase tracking-widest font-bold mb-1" style={{ color: 'var(--gym-muted)' }}>Summary</div>
            <div className="text-sm">Submission Date: {selectedRecord?.submitted_date}</div>
            <div className="text-sm font-bold mt-1" style={{ color: hasRiskFlag(selectedRecord) ? 'var(--gym-accent2)' : 'var(--gym-success)' }}>
              {hasRiskFlag(selectedRecord) ? '⚠️ High Risk - Manual Review Required' : '✅ Clear for Activity'}
            </div>
          </div>
          
          <div className="space-y-3">
             <div className="text-xs font-bold text-muted uppercase">Questionnaire Responses</div>
             <div className="grid gap-2 text-sm">
                {[
                  { q: 'Heart condition?', a: isTrue(selectedRecord?.q1_heart_condition) },
                  { q: 'Chest pain during activity?', a: isTrue(selectedRecord?.q2_chest_pain_activity) },
                  { q: 'Chest pain at rest?', a: isTrue(selectedRecord?.q3_chest_pain_rest) },
                  { q: 'Dizziness/Balance issues?', a: isTrue(selectedRecord?.q4_dizziness) },
                  { q: 'Bone/Joint problems?', a: isTrue(selectedRecord?.q5_bone_joint) },
                  { q: 'BP/Heart medication?', a: isTrue(selectedRecord?.q6_blood_pressure_meds || selectedRecord?.q6_bp_medication) },
                  { q: 'Other medical reason?', a: isTrue(selectedRecord?.q7_other_reason) },
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 rounded bg-opacity-50" style={{ background: item.a ? 'rgba(255,100,100,.1)' : 'rgba(100,255,100,.1)' }}>
                    <span>{item.q}</span>
                    <Badge variant={item.a ? 'inactive' : 'active'}>{item.a ? 'YES' : 'NO'}</Badge>
                  </div>
                ))}
                {selectedRecord?.q7_other_details && (
                  <div className="p-2 border rounded mt-2 border-dashed border-gym">
                    <div className="text-xs uppercase font-bold text-muted mb-1">Details for "Other"</div>
                    <div className="text-sm">{selectedRecord.q7_other_details}</div>
                  </div>
                )}
             </div>
          </div>
        </div>
        {/* <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setSelectedRecord(null)}>Close</button>
        </div> */}
      </Modal>
    </div>
  );
}
