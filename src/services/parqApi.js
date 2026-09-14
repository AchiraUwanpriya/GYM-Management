import { apiClient, toForm } from './_apiClient';

// Admin: all PAR-Q records
export const getAllParQ = () =>
  apiClient.get('/ParQ/GetAllParQ');

// FIX: ParQRequestAPI has no plain "userId", only p_user_id.
export const getParQByUserId = (userId) =>
  apiClient.get(`/ParQ/GetParQByUserId?p_user_id=${userId}`);

// NOTE (backend gap, not fixable from the frontend alone): ParQRequestAPI has
// no p_trainer_id property at all, so GetByTrainerId has nothing to bind a
// trainer id into no matter what key name is sent here. This needs a
// p_trainer_id property added to ParQRequestAPI.cs (and presumably to the
// GYM_PARQ_PROC ActionType 3 branch) before this call can work.
export const getParQByTrainerId = (trainerId) =>
  apiClient.get(`/ParQ/GetParQByTrainerId?trainerId=${trainerId}`);

// FIX: ParQController has no "Save" action at all — only GetAllParQ,
// GetParQByUserId, GetParQByTrainerId, AddParQ, EditParQ, DeleteParQ. This
// always 404'd. Using AddParQ (ActionType 4) to create a new PAR-Q submission.
export const saveParQ = (userId, answers) => {
  // Convert JS booleans to 1/0 integers for the backend
  const formData = { p_user_id: userId };
  for (const [k, v] of Object.entries(answers)) {
    formData[k] = (typeof v === 'boolean') ? (v ? 1 : 0) : v;
  }
  return apiClient.post('/ParQ/AddParQ', toForm(formData));
};

export const editParQ = (userId, answers) => {
  // Convert JS booleans to 1/0 integers for the backend
  const formData = { p_user_id: userId };
  for (const [k, v] of Object.entries(answers)) {
    formData[k] = (typeof v === 'boolean') ? (v ? 1 : 0) : v;
  }
  return apiClient.post('/ParQ/EditParQ', toForm(formData));
};

// Admin: change record status (active / inactive / deleted) — maps to
// GYM_PARQ_PROC ActionType 6. The controller's "DeleteParQ" action is the
// one that routes to ActionType 6, so we post through /ParQ/DeleteParQ even
// for 'active'/'inactive' — it's really a generic status-change endpoint.
export const updateParQStatus = (userId, status) => {
  const formData = {
    p_user_id: userId,
    p_status: status,
  };
  return apiClient.post('/ParQ/DeleteParQ', toForm(formData));
};