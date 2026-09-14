import { apiClient, toForm } from './_apiClient';

export const getAllComplaints = () =>
  apiClient.get('/Complaint/GetAllComplaint');

// FIX: ComplaintRequestAPI has no plain "id", only p_complaint_id.
export const getComplaintById = (id) =>
  apiClient.get(`/Complaint/GetComplaintById?p_complaint_id=${id}`);

// FIX: needs p_user_id, not userId.
export const getMyComplaints = (userId) =>
  apiClient.get(`/Complaint/GetComplaintByUser?p_user_id=${userId}`);

export const addComplaint = (data) =>
  apiClient.post('/Complaint/AddComplaint', toForm({
    ...data,
    p_user_id: data.p_userId || data.p_user_id,
    p_target_user_id: data.p_targetUserId || data.p_target_user_id
  }));

// FIX: UpdateStatus(requestAPI) reads p_complaint_id, p_status, p_admin_id.
export const updateComplaintStatus = (id, status, adminId) =>
  apiClient.post(
    `/Complaint/UpdateStatusComplaint?p_complaint_id=${id}&p_status=${encodeURIComponent(status)}&p_admin_id=${adminId}`
  );

// FIX: AddRating(requestAPI) reads p_complaint_id, p_rating.
export const addComplaintRating = (id, rating) =>
  apiClient.post(`/Complaint/AddRatingComplaint?p_complaint_id=${id}&p_rating=${rating}`);