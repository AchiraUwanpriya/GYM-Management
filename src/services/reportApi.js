import { apiClient } from './_apiClient';

// FIX: ReportController's real action names are singular (Member, Trainer,
// UserR, Attendance, Subscription, Payment) — not Members/Trainers/etc.
// Every one of these 404'd against the old plural URLs.

// GET /Report/Member?dateFrom=&dateTo=&adminId=
export const getMemberReport = (adminId, dateFrom, dateTo) =>
  apiClient.get(`/Report/Member?adminId=${adminId}&dateFrom=${dateFrom||''}&dateTo=${dateTo||''}`);
 
// GET /Report/Trainer?adminId=&dateFrom=&dateTo=
export const getTrainerReport = (adminId, dateFrom, dateTo) =>
  apiClient.get(`/Report/Trainer?adminId=${adminId}&dateFrom=${dateFrom||''}&dateTo=${dateTo||''}`);

// FIX (missing): the user report action exists on the backend as "UserR"
// (named that way to avoid clashing with UserController) but had no
// frontend function calling it at all.
// GET /Report/UserR?adminId=&dateFrom=&dateTo=
export const getUserReport = (adminId, dateFrom, dateTo) =>
  apiClient.get(`/Report/UserR?adminId=${adminId}&dateFrom=${dateFrom||''}&dateTo=${dateTo||''}`);

// GET /Report/Attendance?adminId=&memberId=&dateFrom=&dateTo=
export const getAttendanceReport = (adminId, memberId, dateFrom, dateTo) =>
  apiClient.get(`/Report/Attendance?adminId=${adminId}&memberId=${memberId||''}&dateFrom=${dateFrom||''}&dateTo=${dateTo||''}`);
 
// GET /Report/Subscription?adminId=&dateFrom=&dateTo=
export const getSubscriptionReport = (adminId, dateFrom, dateTo) =>
  apiClient.get(`/Report/Subscription?adminId=${adminId}&dateFrom=${dateFrom||''}&dateTo=${dateTo||''}`);
 
// GET /Report/Payment?adminId=&dateFrom=&dateTo=
export const getPaymentReport = (adminId, dateFrom, dateTo) =>
  apiClient.get(`/Report/Payment?adminId=${adminId}&dateFrom=${dateFrom||''}&dateTo=${dateTo||''}`);
 
// GET /Report/ExportPdf?type=&dateFrom=&dateTo=&adminId=&memberId= (returns base64 PDF)
export const exportReportPdf = (adminId, type, dateFrom, dateTo, memberId) =>
  apiClient.get(`/Report/ExportPdf?adminId=${adminId}&type=${type}&dateFrom=${dateFrom||''}&dateTo=${dateTo||''}&memberId=${memberId||''}`, {
    responseType: 'blob',
  });

// GET /Report/ExportCsv?type=&dateFrom=&dateTo=&adminId=&memberId= (returns plain CSV string)
export const exportReportCsv = (adminId, type, dateFrom, dateTo, memberId) =>
  apiClient.get(`/Report/ExportCsv?adminId=${adminId}&type=${type}&dateFrom=${dateFrom||''}&dateTo=${dateTo||''}&memberId=${memberId||''}`, {
    responseType: 'blob',
  });