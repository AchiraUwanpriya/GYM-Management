import { apiClient, toForm } from './_apiClient';

export const getAllUsers = () => apiClient.get('/User/GetAllUser');

// FIX: UserRequestAPI has no plain "id" property, only p_user_id.
// GetUserById(requestAPI) checks `requestAPI.p_user_id <= 0` and returns
// 400 "User Id is required." for every call as long as the key is "id".
export const getUserById = (id) => apiClient.get(`/User/GetUserById?p_user_id=${id}`);

// ── EDIT USER
export const editUser = (req, adminId) =>
  apiClient.post('/User/EditUser', toForm({ ...req, p_admin_id: adminId ?? req.p_admin_id }));

// ── DELETE USER
// FIX: DeleteUser(requestAPI) checks requestAPI.p_user_id and requestAPI.p_admin_id —
// "id"/"adminId" never bind to those, so this always failed with
// "User Id is required."
export const deleteUser = (id, adminId) =>
  apiClient.post(`/User/DeleteUser?p_user_id=${id}&p_admin_id=${adminId}`);

// ── APPROVE / STATUS USER
// FIX: ApproveOrRejectUser(requestAPI) reads p_user_id, p_admin_id,
// p_new_status, p_role_id, p_first_name, p_last_name — the old
// userId/adminId/newStatus/roleId/firstName/lastName keys never bound,
// so requestAPI.p_user_id was always 0 and this always 400'd.
// (This used to also be duplicated in authApi.js under the same export
// name — since api.js does `export * from './authApi'` and
// `export * from './userApi'`, two modules exporting the same name make
// that name ambiguous and JS drops it from the `export *` barrel, so
// `api.approveUser` was likely undefined at the call site either way.
// Keeping a single copy here fixes both problems at once.)
export const approveUser = (userId, adminId, newStatus, roleId, firstName = '', lastName = '') =>
  apiClient.post(
    `/User/ApproveUser?p_user_id=${userId}&p_admin_id=${adminId}` +
    `&p_new_status=${encodeURIComponent(newStatus)}&p_role_id=${roleId}` +
    `&p_first_name=${encodeURIComponent(firstName || '')}&p_last_name=${encodeURIComponent(lastName || '')}`
  );

// FIX: ChangeUserStatus(requestAPI) reads p_user_id, p_admin_id, p_new_status.
export const changeUserStatus = (userId, adminId, newStatus) =>
  apiClient.post(
    `/User/ChangeUserStatus?p_user_id=${userId}&p_admin_id=${adminId}` +
    `&p_new_status=${encodeURIComponent(newStatus)}`
  );

// FIX: ChangeLinkedTableStatus(requestAPI) reads p_user_id, p_admin_id,
// p_table_name, p_new_status.
export const changeLinkedStatus = (userId, adminId, tableName, newStatus) =>
  apiClient.post(
    `/User/ChangeUserLinkedStatus?p_user_id=${userId}&p_admin_id=${adminId}` +
    `&p_table_name=${encodeURIComponent(tableName)}&p_new_status=${encodeURIComponent(newStatus)}`
  );

export const getPendingUsers = () => apiClient.get('/User/GetUserPending');