import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import store from './store';
import { restoreSession } from './actions/authAction';
import { ROLES } from '../index';

import AdminLayout      from './components/admin/AdminLayout';
import HomePage         from './pages/HomePage';
import Login            from './pages/Login';
import AddUser          from './pages/AddUser';
import Dashboard        from './pages/Dashboard';
import MemberDashboard  from './pages/MemberDashboard';
import TrainerDashboard from './pages/TrainerDashboard';
import Users            from './pages/Users';
import Members          from './pages/Members';
import Trainers         from './pages/Trainers';
import Assignments      from './pages/Assignments';
import Timeslots        from './pages/Timeslots';
import Schedules        from './pages/Schedules';
import Workouts         from './pages/Workouts';
import HealthRecords    from './pages/HealthRecords';
import Plans            from './pages/Plans';
import Subscriptions    from './pages/Subscriptions';
import Payments         from './pages/Payments';
import RFID             from './pages/RFID';
import Reports          from './pages/Reports';
import Equipment        from './pages/Equipment';
import Devices          from './pages/Devices';
import Attendance       from './pages/Attendance';
import Notifications    from './pages/Notifications';
import Complaints       from './pages/Complaints';
import AccountSettings  from './pages/AccountSettings';
import TrainerAvailabilityPage from './pages/TrainerAvailabilityPage';

function ProtectedRoute({ children, allowedRoles }) {
  const user = useSelector((s) => s.auth.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.status && user.status !== 'active') return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user?.roleName)) return <Navigate to="/dashboard" replace />;
  return children;
}

function RoleDashboard() {
  const user = useSelector((s) => s.auth.user);
  if (!user) return <Navigate to="/login" replace />;
  const role = user?.roleName;
  if (role === ROLES.MEMBER)  return <MemberDashboard />;
  if (role === ROLES.TRAINER) return <TrainerDashboard />;
  return <Dashboard />;
}

function AppRoutes() {
  const dispatch = useDispatch();
  const user  = useSelector((s) => s.auth.user);
  const theme = useSelector((s) => s.ui.theme);

  useEffect(() => { dispatch(restoreSession()); }, [dispatch]);
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);

  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public / guest routes ─────────────────────── */}
        <Route path="/"         element={user ? <Navigate to="/dashboard" replace /> : <HomePage />} />
        <Route path="/home"     element={user ? <Navigate to="/dashboard" replace /> : <HomePage />} />
        <Route path="/login"    element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <AddUser />} />

        {/* ── Protected routes — wrapped in AdminLayout ─── */}
        <Route path="/" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route path="dashboard"     element={<RoleDashboard />} />
          <Route path="users"         element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]}><Users /></ProtectedRoute>} />
          <Route path="members"       element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]}><Members /></ProtectedRoute>} />
          <Route path="trainers"      element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.MEMBER]}><Trainers /></ProtectedRoute>} />
          <Route path="assignments"   element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.TRAINER]}><Assignments /></ProtectedRoute>} />
          <Route path="plans"         element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.MEMBER]}><Plans /></ProtectedRoute>} />
          <Route path="subscriptions" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]}><Subscriptions /></ProtectedRoute>} />
          <Route path="payments"      element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.MEMBER]}><Payments /></ProtectedRoute>} />
          <Route path="rfid"          element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]}><RFID /></ProtectedRoute>} />
          <Route path="reports"       element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]}><Reports /></ProtectedRoute>} />
          <Route path="timeslots"     element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.TRAINER]}><Timeslots /></ProtectedRoute>} />
          <Route path="schedules"     element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.TRAINER, ROLES.MEMBER]}><Schedules /></ProtectedRoute>} />
          <Route path="workouts"      element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.TRAINER, ROLES.MEMBER]}><Workouts /></ProtectedRoute>} />
          <Route path="equipment"     element={<ProtectedRoute><Equipment /></ProtectedRoute>} />
          <Route path="devices"       element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]}><Devices /></ProtectedRoute>} />
          <Route path="attendance"    element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.TRAINER, ROLES.MEMBER]}><Attendance /></ProtectedRoute>} />
          <Route path="health"        element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.TRAINER]}><HealthRecords /></ProtectedRoute>} />
          <Route path="notifications" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]}><Notifications /></ProtectedRoute>} />
          <Route path="complaints" element={<ProtectedRoute><Complaints /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
          <Route path="trainer-availability" element={<ProtectedRoute allowedRoles={[ROLES.MEMBER, ROLES.ADMIN]}><TrainerAvailabilityPage /></ProtectedRoute>} />
        </Route>

        {/* ── Fallback ──────────────────────────────────── */}
        <Route path="*" element={<Navigate to={user ? '/dashboard' : '/'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AppRoutes />
    </Provider>
  );
}
