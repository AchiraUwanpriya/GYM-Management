// ============================================================
//  Workouts.jsx — Exercise Catalog & Live Library
//  Displays exercise library from GYM_EXERCISE_PROC with status
// ============================================================
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchExercises, addExercise, editExercise, deleteExercise } from '../actions/exercisesAction';
import { fetchWorkouts, updateNonEquipmentStatus, approveExercise } from '../actions/nonEquipmentExerciseAction';
import { ROLES } from '../../index';
import Badge from '../components/Badge';
import Modal from '../components/Modal';

export default function Workouts() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const { data, loading } = useSelector((s) => s.exercises);
  const assignedWorkouts = useSelector((s) => s.workouts?.data || []);

  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedEx, setSelectedEx] = useState(null);

  // Manage state
  const [showForm, setShowForm] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    p_exercise_name: '',
    p_muscle_group: '',
    p_description: '',
  });

  const canManage = user?.roleName === ROLES.ADMIN || user?.roleName === ROLES.TRAINER;
  const isMember = user?.roleName === ROLES.MEMBER;

  useEffect(() => {
    dispatch(fetchExercises());
    dispatch(fetchWorkouts());
  }, [dispatch]);

  // Resolve workout status for an exercise
  const getWorkoutStatus = (exId) => {
    const assigned = assignedWorkouts.find(
      (w) => String(w.exercise_Id || w.exerciseId) === String(exId)
    );
    if (!assigned) {
      return { label: 'Active', variant: 'active', assigned: null };
    }
    const sub = (assigned.sub_status ?? assigned.subStatus ?? '').toLowerCase();
    const appr = (assigned.approval_status ?? assigned.approvalStatus ?? '').toLowerCase();

    if (sub !== 'completed') {
      return { label: 'Pending', variant: 'pending', assigned };
    }
    if (appr === 'approved') {
      return { label: 'Completed', variant: 'active', assigned };
    }
    if (appr === 'rejected') {
      return { label: 'Rejected', variant: 'inactive', assigned };
    }
    return { label: 'Awaiting Approval', variant: 'pending', assigned };
  };

  const muscleGroups = ['All', ...new Set(data.map(ex => ex.MuscleGroup || ex.muscleGroup).filter(Boolean))];
  const statuses = ['All', 'Pending', 'Awaiting Approval', 'Completed', 'Rejected', 'Active'];

  const filtered = data.filter(ex => {
    const name = ex.ExerciseName || ex.exerciseName || '';
    const desc = ex.description || '';
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase()) ||
                          desc.toLowerCase().includes(search.toLowerCase());
    const mGroup = ex.MuscleGroup || ex.muscleGroup;
    const matchesMuscle = muscleFilter === 'All' || mGroup === muscleFilter;

    const st = getWorkoutStatus(ex.exerciseId);
    const matchesStatus = statusFilter === 'All' || st.label.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesMuscle && matchesStatus;
  });

  const openAdd = () => {
    setForm({ p_exercise_name: '', p_muscle_group: '', p_description: '' });
    setIsEdit(false);
    setShowForm(true);
  };

  const openEdit = (ex) => {
    setForm({
      p_exercise_id: ex.exerciseId,
      p_exercise_name: ex.ExerciseName || ex.exerciseName,
      p_muscle_group: ex.MuscleGroup || ex.muscleGroup,
      p_description: ex.description || '',
    });
    setIsEdit(true);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this exercise?')) {
      dispatch(deleteExercise(id, user.userId));
    }
  };

  const handleSubmit = async () => {
    if (!form.p_exercise_name || !form.p_muscle_group) return;
    setSaving(true);
    const ok = isEdit 
      ? await dispatch(editExercise(form, user.userId))
      : await dispatch(addExercise(form, user.userId));
    setSaving(false);
    if (ok) setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <div className="page-title">Exercise Catalog & Workouts</div>
          <div className="page-sub">Browse {data.length} expert-curated exercises and track their live status</div>
        </div>
        <div className="flex gap-3 flex-wrap">
          {canManage && (
            <button className="btn btn-primary" onClick={openAdd}>+ Add Exercise</button>
          )}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--gym-muted)' }}>🔍</span>
            <input
              className="gym-input pl-8 w-52"
              placeholder="Search exercises..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="gym-input"
            value={muscleFilter}
            onChange={(e) => setMuscleFilter(e.target.value)}
          >
            <option value="All">All Muscles</option>
            {muscleGroups.filter(m => m !== 'All').map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <select
            className="gym-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {statuses.map(s => (
              <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent rounded-full" style={{ color: 'var(--gym-accent)' }}></div>
          <div className="mt-4 text-sm" style={{ color: 'var(--gym-muted)' }}>Loading catalog...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center gym-card">
          <div className="text-4xl mb-4">🏋️</div>
          <div className="text-sm" style={{ color: 'var(--gym-muted)' }}>No exercises found matching your search.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((ex) => {
            const mGroup = ex.MuscleGroup || ex.muscleGroup;
            const name = ex.ExerciseName || ex.exerciseName;
            const st = getWorkoutStatus(ex.exerciseId);
            return (
              <div key={ex.exerciseId} className="gym-card group hover:scale-[1.02] transition-all duration-200" style={{ border: '1px solid var(--gym-border)' }}>
                {/* Header: Icon, Muscle Group Tag & Workout Status */}
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: 'rgba(180,127,255,0.15)', color: 'var(--gym-accent)' }}>
                      {mGroup === 'Chest' ? '👕' : mGroup === 'Legs' ? '🦵' : mGroup === 'Back' ? '🎒' : '💪'}
                    </div>
                    <Badge variant="active">{mGroup || 'Full Body'}</Badge>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* WORKOUT STATUS BADGE */}
                    <Badge variant={st.variant}>
                      {st.label}
                    </Badge>

                    {canManage && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(ex)} className="p-1.5 rounded-lg hover:bg-white/10" title="Edit">✏️</button>
                        <button onClick={() => handleDelete(ex.exerciseId)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400" title="Delete">🗑️</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Workout Title */}
                <div className="text-lg font-bold mb-1" style={{ color: 'var(--gym-text)', fontFamily: "'Bebas Neue', cursive", letterSpacing: '0.05em' }}>
                  {name}
                </div>

                {/* Assigned Sets & Reps Subtitle (if assigned) */}
                {st.assigned && (
                  <div className="text-xs font-mono mb-2" style={{ color: 'var(--gym-accent3)' }}>
                    🎯 {st.assigned.sets || '3'} sets × {st.assigned.reps || '10'} reps
                  </div>
                )}

                {/* Workout Description */}
                <div className="text-xs leading-relaxed" style={{ color: 'var(--gym-muted)', height: 48, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                  {ex.description || 'Focus on proper form and controlled movements for maximum effectiveness.'}
                </div>

                {/* Card Footer: Difficulty & Actions */}
                <div className="mt-4 pt-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--gym-border)' }}>
                  <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--gym-accent)' }}>
                    Difficulty: Intermediate
                  </span>

                  <div className="flex items-center gap-2">
                    {isMember && st.assigned && st.label === 'Pending' && (
                      <button className="btn btn-sm btn-secondary" style={{ fontSize: '10px', padding: '2px 8px', color: 'var(--gym-success)' }} onClick={() => dispatch(updateNonEquipmentStatus(st.assigned.use_Id || st.assigned.wse_id, 'completed'))}>
                        ✓ Mark Done
                      </button>
                    )}
                    {canManage && st.assigned && st.label === 'Awaiting Approval' && (
                      <button className="btn btn-sm btn-secondary" style={{ fontSize: '10px', padding: '2px 8px', color: 'var(--gym-success)' }} onClick={() => dispatch(approveExercise(st.assigned.use_Id || st.assigned.wse_id, 'approved', user.userId))}>
                        ✓ Approve
                      </button>
                    )}
                    <button className="text-xs font-bold hover:underline" style={{ color: 'var(--gym-accent3)' }} onClick={() => setSelectedEx(ex)}>
                      Details →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <Modal isOpen onClose={() => setShowForm(false)} title={isEdit ? 'Edit Exercise' : 'Add New Exercise'} maxWidth={500}>
          <div className="modal-body space-y-4">
            <div>
              <label className="gym-label">Exercise Name</label>
              <input 
                className="gym-input w-full"
                value={form.p_exercise_name}
                onChange={(e) => setForm({...form, p_exercise_name: e.target.value})}
                placeholder="e.g. Bench Press"
              />
            </div>
            <div>
              <label className="gym-label">Muscle Group</label>
              <input 
                className="gym-input w-full"
                value={form.p_muscle_group}
                onChange={(e) => setForm({...form, p_muscle_group: e.target.value})}
                placeholder="e.g. Chest"
              />
            </div>
            <div>
              <label className="gym-label">Description / Instructions</label>
              <textarea 
                className="gym-input w-full"
                rows={4}
                value={form.p_description}
                onChange={(e) => setForm({...form, p_description: e.target.value})}
                placeholder="How to perform this exercise..."
              />
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Update Exercise' : 'Create Exercise'}
            </button>
          </div>
        </Modal>
      )}

      {selectedEx && (() => {
        const st = getWorkoutStatus(selectedEx.exerciseId);
        return (
          <Modal isOpen onClose={() => setSelectedEx(null)} title={selectedEx.ExerciseName || selectedEx.exerciseName} maxWidth={500}>
            <div className="modal-body space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(180,127,255,0.1)', border: '1px solid rgba(180,127,255,0.2)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: 'rgba(180,127,255,0.2)', color: 'var(--gym-accent)' }}>
                    {(selectedEx.MuscleGroup || selectedEx.muscleGroup) === 'Chest' ? '👕' : (selectedEx.MuscleGroup || selectedEx.muscleGroup) === 'Legs' ? '🦵' : (selectedEx.MuscleGroup || selectedEx.muscleGroup) === 'Back' ? '🎒' : '💪'}
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-widest" style={{ color: 'var(--gym-muted)' }}>Target Muscle</div>
                    <div className="font-bold" style={{ color: 'var(--gym-text)' }}>{selectedEx.MuscleGroup || selectedEx.muscleGroup || 'Full Body'}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--gym-muted)' }}>Status</span>
                  <Badge variant={st.variant}>{st.label}</Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-widest" style={{ color: 'var(--gym-muted)' }}>Description & Instructions</div>
                <div className="p-4 rounded-xl leading-relaxed text-sm" style={{ background: 'var(--gym-surface2)', border: '1px solid var(--gym-border)', color: 'var(--gym-text2)' }}>
                  {selectedEx.description || 'No detailed instructions provided for this exercise.'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl" style={{ background: 'var(--gym-surface2)', border: '1px solid var(--gym-border)' }}>
                  <div className="text-[10px] uppercase tracking-tighter" style={{ color: 'var(--gym-muted)' }}>Typical Sets</div>
                  <div className="font-bold" style={{ color: 'var(--gym-accent3)' }}>{st.assigned?.sets ? `${st.assigned.sets} Sets` : '3 - 4 Sets'}</div>
                </div>
                <div className="p-3 rounded-xl" style={{ background: 'var(--gym-surface2)', border: '1px solid var(--gym-border)' }}>
                  <div className="text-[10px] uppercase tracking-tighter" style={{ color: 'var(--gym-muted)' }}>Typical Reps</div>
                  <div className="font-bold" style={{ color: 'var(--gym-accent3)' }}>{st.assigned?.reps ? `${st.assigned.reps} Reps` : '8 - 12 Reps'}</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setSelectedEx(null)}>Got it</button>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}
