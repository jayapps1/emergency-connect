import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { LoginPage } from '@/features/auth/LoginPage';
import { ProfilePage } from '@/features/auth/ProfilePage';
import { ForceChangePasswordPage } from '@/features/auth/ForceChangePasswordPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { AppliancesPage } from '@/features/appliance/AppliancesPage';
import { ReviewsPage } from '@/features/review/ReviewsPage';
import { AgenciesPage } from '@/features/agency/AgenciesPage';
import { StationsPage } from '@/features/station/StationsPage';
import { ReportsPage } from '@/features/report/ReportsPage';
import { ReportDetailsPage } from '@/features/report/ReportDetailsPage';
import { UsersPage } from '@/features/user/UsersPage';
import { RespondersPage } from '@/features/responder/RespondersPage';
import { PublicUsersPage } from '@/features/user/PublicUsersPage';
import { UserDetailPage } from '@/features/user/UserDetailPage';
import { TemporaryCredentialsPage } from '@/features/credentials/TemporaryCredentialsPage';
import { AdminRequestsPage } from '@/features/requests/AdminRequestsPage';
import { UserRequestsPage } from '@/features/requests/UserRequestsPage';
import { AuditLogsPage } from '@/features/audit/AuditLogsPage';
import { IncidentCategoriesPage } from '@/features/categories/IncidentCategoriesPage';
import { SafetyInformationPage } from '@/features/safety/SafetyInformationPage';
import { RolesPage } from '@/features/roles/RolesPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { AdminLayout } from '@/layouts/AdminLayout';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { PermissionRoute } from '@/auth/PermissionRoute';

export const createRouter = (toggleTheme: () => void, currentMode: 'light' | 'dark') =>
  createBrowserRouter([
    {
      path: '/login',
      element: <LoginPage />,
    },
    {
      path: '/change-password-required',
      element: <ForceChangePasswordPage />,
    },
    {
      element: <ProtectedRoute />,
      children: [
        {
          element: <AdminLayout toggleTheme={toggleTheme} currentMode={currentMode} />,
          children: [
            {
              path: '/',
              element: (
                <PermissionRoute permission="REPORT_READ">
                  <DashboardPage />
                </PermissionRoute>
              ),
            },
            {
              path: '/profile',
              element: <ProfilePage />,
            },
            {
              path: '/appliances',
              element: (
                <PermissionRoute permission="STATION_READ">
                  <AppliancesPage />
                </PermissionRoute>
              ),
            },
            {
              path: '/reviews',
              element: (
                <PermissionRoute permission="REPORT_READ">
                  <ReviewsPage />
                </PermissionRoute>
              ),
            },
            {
              path: '/agencies',
              element: (
                <PermissionRoute permission="AGENCY_READ">
                  <AgenciesPage />
                </PermissionRoute>
              ),
            },
            {
              path: '/stations',
              element: (
                <PermissionRoute permission="STATION_READ">
                  <StationsPage />
                </PermissionRoute>
              ),
            },
            {
              path: '/incident-categories',
              element: (
                <PermissionRoute permission="INCIDENT_CATEGORY_READ">
                  <IncidentCategoriesPage />
                </PermissionRoute>
              ),
            },
            {
              path: '/safety-information',
              element: (
                <PermissionRoute permission="REPORT_READ">
                  <SafetyInformationPage />
                </PermissionRoute>
              ),
            },
            {
              path: '/reports',
              element: (
                <PermissionRoute permission="REPORT_READ">
                  <ReportsPage />
                </PermissionRoute>
              ),
            },
            {
              path: '/reports/:reportId',
              element: (
                <PermissionRoute permission="REPORT_READ">
                  <ReportDetailsPage />
                </PermissionRoute>
              ),
            },
            {
              path: '/responders',
              element: (
                <PermissionRoute permission="ADMIN_USER_READ">
                  <RespondersPage />
                </PermissionRoute>
              ),
            },
            {
              path: '/users',
              element: (
                <PermissionRoute permission="ADMIN_USER_READ">
                  <UsersPage />
                </PermissionRoute>
              ),
            },
            {
              path: '/public-users',
              element: (
                <PermissionRoute permission="ADMIN_USER_READ">
                  <PublicUsersPage />
                </PermissionRoute>
              ),
            },
            {
              path: '/users/:userId',
              element: (
                <PermissionRoute permission="ADMIN_USER_READ">
                  <UserDetailPage />
                </PermissionRoute>
              ),
            },
            {
              path: '/temporary-credentials',
              element: (
                <PermissionRoute permission="ADMIN_USER_READ">
                  <TemporaryCredentialsPage />
                </PermissionRoute>
              ),
            },
            {
              path: '/admin-requests',
              element: (
                <PermissionRoute permission="ADMIN_USER_READ">
                  <AdminRequestsPage />
                </PermissionRoute>
              ),
            },
            {
              path: '/user-management-requests',
              element: (
                <PermissionRoute permission="ADMIN_USER_READ">
                  <UserRequestsPage />
                </PermissionRoute>
              ),
            },
            {
              path: '/roles',
              element: (
                <PermissionRoute permission="ROLE_READ">
                  <RolesPage />
                </PermissionRoute>
              ),
            },
            {
              path: '/audit-logs',
              element: (
                <PermissionRoute permission="AUDIT_LOG_READ">
                  <AuditLogsPage />
                </PermissionRoute>
              ),
            },
            {
              path: '/settings',
              element: (
                <PermissionRoute permission="SYSTEM_SETTINGS_MANAGE">
                  <SettingsPage />
                </PermissionRoute>
              ),
            },
          ],
        },
      ],
    },
  ]);
