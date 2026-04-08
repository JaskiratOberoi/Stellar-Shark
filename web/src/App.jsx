import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { AppShell } from './components/AppShell.jsx';
import { HomeRedirect } from './components/HomeRedirect.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { RoleGate } from './components/RoleGate.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { TellerDashboard } from './pages/teller/TellerDashboard.jsx';
import { LabEntryPage } from './pages/lab/LabEntryPage.jsx';
import { LabHistoryPage } from './pages/lab/LabHistoryPage.jsx';
import { AdminDashboard } from './pages/admin/AdminDashboard.jsx';
import { AdminBuPage } from './pages/admin/AdminBuPage.jsx';
import { AdminMachinesPage } from './pages/admin/AdminMachinesPage.jsx';
import { AdminKitsPage } from './pages/admin/AdminKitsPage.jsx';
import { AdminParametersPage } from './pages/admin/AdminParametersPage.jsx';
import { ParameterMappingPage } from './pages/admin/ParameterMappingPage.jsx';
import { AdminUsersPage } from './pages/admin/AdminUsersPage.jsx';
import { AdminInventoryPage } from './pages/admin/AdminInventoryPage.jsx';
import { AdminValidationPage } from './pages/admin/AdminValidationPage.jsx';
import { AdminAnalyticsPage } from './pages/admin/AdminAnalyticsPage.jsx';

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route element={<ProtectedRoute />}>
                        <Route element={<AppShell />}>
                            <Route path="/" element={<HomeRedirect />} />
                            <Route path="/teller/dashboard" element={<TellerDashboard />} />
                            <Route path="/shark/dashboard" element={<Navigate to="/teller/dashboard" replace />} />
                            <Route
                                path="/lab/entry"
                                element={
                                    <RoleGate roles={['lab_technician']}>
                                        <LabEntryPage />
                                    </RoleGate>
                                }
                            />
                            <Route
                                path="/lab/history"
                                element={
                                    <RoleGate roles={['lab_technician']}>
                                        <LabHistoryPage />
                                    </RoleGate>
                                }
                            />
                            <Route
                                path="/admin/dashboard"
                                element={
                                    <RoleGate roles={['super_admin']}>
                                        <AdminDashboard />
                                    </RoleGate>
                                }
                            />
                            <Route
                                path="/admin/analytics"
                                element={
                                    <RoleGate roles={['super_admin']}>
                                        <AdminAnalyticsPage />
                                    </RoleGate>
                                }
                            />
                            <Route
                                path="/admin/bus"
                                element={
                                    <RoleGate roles={['super_admin']}>
                                        <AdminBuPage />
                                    </RoleGate>
                                }
                            />
                            <Route
                                path="/admin/machines"
                                element={
                                    <RoleGate roles={['super_admin']}>
                                        <AdminMachinesPage />
                                    </RoleGate>
                                }
                            />
                            <Route
                                path="/admin/kits"
                                element={
                                    <RoleGate roles={['super_admin']}>
                                        <AdminKitsPage />
                                    </RoleGate>
                                }
                            />
                            <Route
                                path="/admin/parameters"
                                element={
                                    <RoleGate roles={['super_admin']}>
                                        <AdminParametersPage />
                                    </RoleGate>
                                }
                            />
                            <Route
                                path="/admin/parameters/mapping"
                                element={
                                    <RoleGate roles={['super_admin']}>
                                        <ParameterMappingPage />
                                    </RoleGate>
                                }
                            />
                            <Route
                                path="/admin/users"
                                element={
                                    <RoleGate roles={['super_admin']}>
                                        <AdminUsersPage />
                                    </RoleGate>
                                }
                            />
                            <Route
                                path="/admin/inventory"
                                element={
                                    <RoleGate roles={['super_admin']}>
                                        <AdminInventoryPage />
                                    </RoleGate>
                                }
                            />
                            <Route
                                path="/admin/validation"
                                element={
                                    <RoleGate roles={['super_admin']}>
                                        <AdminValidationPage />
                                    </RoleGate>
                                }
                            />
                            <Route path="/teller" element={<Navigate to="/teller/dashboard" replace />} />
                            <Route path="/shark" element={<Navigate to="/teller/dashboard" replace />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Route>
                    </Route>
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}
