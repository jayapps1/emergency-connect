import React, { useState } from 'react';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BusinessIcon from '@mui/icons-material/Business';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import CategoryIcon from '@mui/icons-material/Category';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import StarIcon from '@mui/icons-material/Star';
import PeopleIcon from '@mui/icons-material/People';
import BadgeIcon from '@mui/icons-material/Badge';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import ShieldIcon from '@mui/icons-material/Shield';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import SecurityIcon from '@mui/icons-material/Security';
import StorageIcon from '@mui/icons-material/Storage';
import MemoryIcon from '@mui/icons-material/Memory';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import CloseIcon from '@mui/icons-material/Close';
import LaunchIcon from '@mui/icons-material/Launch';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/auth/useAuthStore';
import { useIdleTimeout } from '@/auth/useIdleTimeout';
import { authApi, StaffNotificationItem } from '@/api/authApi';
import { reportApi } from '@/api/reportApi';
import { adminRequestApi } from '@/api/adminRequestApi';

const expandedDrawerWidth = 270;
const collapsedDrawerWidth = 78;

interface AdminLayoutProps {
  toggleTheme: () => void;
  currentMode: 'light' | 'dark';
}

/**
 * Sidebar navigation is derived from the authenticated staff capability set.
 * Visual hiding improves usability, while backend authorization remains
 * authoritative for every protected route.
 */
export const AdminLayout: React.FC<AdminLayoutProps> = ({ toggleTheme, currentMode }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifAnchorEl, setNotifAnchorEl] = useState<null | HTMLElement>(null);

  // Notification Detail Modal States
  const [selectedNotif, setSelectedNotif] = useState<StaffNotificationItem | null>(null);
  const [notifDetailOpen, setNotifDetailOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, roles, logout, hasPermission, hasRole } = useAuthStore();
  const { showWarning, handleStaySignedIn, handleSignOut } = useIdleTimeout();
  const isSysAdmin = hasRole('SYSTEM_ADMIN');

  // Treats realtime incident events as invalidation signals and refetches the authoritative unread count from the backend.
  const { data: unreadData } = useQuery({
    queryKey: ['unreadIncidentCount'],
    queryFn: reportApi.getUnreadCount,
    refetchInterval: 10000,
    enabled: hasPermission('REPORT_READ'),
  });

  const { data: requestSummary } = useQuery({
    queryKey: ['centralizedAdminRequestsCount'],
    queryFn: adminRequestApi.getCentralizedRequests,
    refetchInterval: 15000,
    enabled: hasPermission('ADMIN_USER_READ'),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['staffNotifications'],
    queryFn: authApi.getNotifications,
    refetchInterval: 10000,
  });

  const unreadCount = unreadData?.unreadCount || 0;
  const pendingAdminRequestsCount = requestSummary?.totalPendingCount || 0;
  const unreadNotifCount = notifications.filter((n) => !n.readAt && !n.readState).length;

  const markNotifReadMutation = useMutation({
    mutationFn: (id: string) => authApi.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffNotifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: authApi.markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffNotifications'] });
    },
  });

  const deleteNotifMutation = useMutation({
    mutationFn: (id: string) => authApi.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffNotifications'] });
    },
  });

  const clearReadNotifsMutation = useMutation({
    mutationFn: authApi.deleteAllReadNotifications,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffNotifications'] });
    },
  });

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleProfileMenuClose();
    try {
      await authApi.logout();
    } catch (_: any) {}
    logout();
    navigate('/login');
  };

  const formatRoleTitle = (rawRole?: string) => {
    if (hasRole('SYSTEM_ADMIN')) return 'National Platform Oversight';
    if (!rawRole) return 'Staff User';
    switch (rawRole.replace('ROLE_', '')) {
      case 'AGENCY_ADMIN':
        return 'Agency Administrator';
      case 'REGIONAL_ADMIN':
        return 'Regional Administrator';
      case 'STATION_ADMIN':
        return 'Station Administrator';
      case 'CONTROL_ROOM_OPERATOR':
        return 'Control Room Operator';
      case 'REPORT_REVIEWER':
        return 'Report Reviewer';
      case 'AUDITOR':
        return 'Auditor';
      case 'RESPONDER':
        return 'Field Unit Responder';
      case 'BACKUP_OPERATOR':
        return 'Backup Operator';
      default:
        return rawRole.replace('ROLE_', '');
    }
  };

  const currentDrawerWidth = collapsed ? collapsedDrawerWidth : expandedDrawerWidth;

  const menuSections = [
    {
      subheader: 'OVERVIEW',
      items: [
        { label: 'Dashboard', icon: <DashboardIcon fontSize="small" />, path: '/', permission: 'REPORT_READ' },
        { label: 'My Requests', icon: <AssignmentIcon fontSize="small" />, path: '/my-requests', permission: '' },
      ],
    },
    {
      subheader: 'OPERATIONS',
      items: [
        { label: 'Incident Reports', icon: <AssignmentIcon fontSize="small" />, path: '/reports', permission: 'REPORT_READ' },
        { label: 'Tracking Management', icon: <GpsFixedIcon fontSize="small" />, path: '/tracking', permission: 'REPORT_READ' },
        { label: 'Field Responders', icon: <BadgeIcon fontSize="small" />, path: '/responders', permission: 'ADMIN_USER_READ' },
        { label: 'Appliance Management', icon: <DirectionsCarIcon fontSize="small" />, path: '/appliances', permission: 'STATION_READ' },
        { label: 'Emergency Stations', icon: <LocalHospitalIcon fontSize="small" />, path: '/stations', permission: 'STATION_READ' },
        { label: 'Responding Agencies', icon: <BusinessIcon fontSize="small" />, path: '/agencies', permission: 'AGENCY_READ' },
        { label: 'Incident Categories', icon: <CategoryIcon fontSize="small" />, path: '/incident-categories', permission: 'INCIDENT_CATEGORY_READ' },
        { label: 'Safety Information', icon: <HealthAndSafetyIcon fontSize="small" />, path: '/safety-information', permission: 'REPORT_READ' },
      ],
    },
    {
      subheader: 'INFRASTRUCTURE',
      items: [
        { label: 'Backup & Recovery', icon: <StorageIcon fontSize="small" />, path: '/backups', permission: 'BACKUP_READ' },
        { label: 'Cache Management', icon: <MemoryIcon fontSize="small" />, path: '/cache-management', permission: 'SYSTEM_SETTINGS_MANAGE', sysAdminOnly: true },
      ],
    },
    {
      subheader: 'PERFORMANCE',
      items: [
        { label: 'Citizen Reviews', icon: <StarIcon fontSize="small" />, path: '/reviews', permission: 'REPORT_READ' },
      ],
    },
    {
      subheader: 'ADMINISTRATION',
      items: [
        { label: 'Staff Users', icon: <PeopleIcon fontSize="small" />, path: '/users', permission: 'ADMIN_USER_READ' },
        { label: 'Citizen Users', icon: <PeopleIcon fontSize="small" />, path: '/public-users', permission: 'ADMIN_USER_READ' },
        { label: 'Temporary Credentials', icon: <VpnKeyIcon fontSize="small" />, path: '/temporary-credentials', permission: 'ADMIN_USER_READ' },
        { label: 'Admin Requests', icon: <AdminPanelSettingsIcon fontSize="small" />, path: '/admin-requests', permission: 'ADMIN_USER_READ' },
        { label: 'Roles & Permissions', icon: <SecurityIcon fontSize="small" />, path: '/roles', permission: 'ROLE_READ' },
        { label: 'Audit Logs', icon: <HistoryIcon fontSize="small" />, path: '/audit-logs', permission: 'AUDIT_LOG_READ' },
      ],
    },
    {
      subheader: 'SYSTEM',
      items: [{ label: 'System Settings', icon: <SettingsIcon fontSize="small" />, path: '/settings', permission: 'SYSTEM_SETTINGS_MANAGE', sysAdminOnly: true }],
    },
  ];

  const logoSrc = currentMode === 'dark' ? '/brand/gec-logo-dark.png' : '/brand/gec-logo-light.png';

  const userScopeSubtitle = user?.agencyName
    ? `${user.agencyName}${user.region ? ` (${user.region})` : ''}`
    : formatRoleTitle(roles[0]);

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #071525 0%, #0B1F33 45%, #0A1726 100%)',
        color: '#F8FAFC',
        position: 'relative',
        boxShadow: '12px 0 30px rgba(0, 0, 0, 0.25)',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(18px)',
        transition: 'width 220ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Floating Collapse Toggle Button */}
      <IconButton
        onClick={() => setCollapsed(!collapsed)}
        sx={{
          position: 'absolute',
          top: 22,
          right: -14,
          zIndex: 1400,
          width: 28,
          height: 28,
          bgcolor: '#0F243E',
          color: '#38BDF8',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          display: { xs: 'none', sm: 'flex' },
          '&:hover': {
            bgcolor: '#17355B',
            color: '#FFFFFF',
          },
        }}
        size="small"
      >
        {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
      </IconButton>

      {/* Brand Header */}
      <Toolbar
        sx={{
          px: collapsed ? 1.5 : 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          py: 2,
          minHeight: '76px !important',
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}
      >
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: '12px',
            bgcolor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 0.5,
            flexShrink: 0,
          }}
        >
          <Box
            component="img"
            src={logoSrc}
            alt="GEC Shield"
            sx={{ maxHeight: 32, maxWidth: 32, objectFit: 'contain' }}
          />
        </Box>

        {!collapsed && (
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#F8FAFC', lineHeight: 1.2, letterSpacing: '0.01em' }} noWrap>
              Ghana Emergency Connect
            </Typography>
            <Typography variant="caption" sx={{ color: '#38BDF8', fontWeight: 'bold', fontSize: '0.68rem', letterSpacing: '0.06em' }} noWrap>
              OPERATIONS CONSOLE
            </Typography>
          </Box>
        )}
      </Toolbar>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />

      {/* Operational Scope Identity Badge */}
      {!collapsed ? (
        <Box
          sx={{
            p: 1.5,
            mx: 1.5,
            my: 1.5,
            bgcolor: 'rgba(15, 32, 71, 0.65)',
            borderRadius: '14px',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <ShieldIcon sx={{ color: '#38BDF8', fontSize: 16 }} />
            <Typography variant="caption" fontWeight="bold" sx={{ color: '#38BDF8', letterSpacing: '0.06em', fontSize: '0.65rem' }}>
              OPERATIONAL SCOPE
            </Typography>
          </Box>
          <Typography variant="body2" fontWeight="bold" sx={{ color: '#F8FAFC' }} noWrap>
            {formatRoleTitle(roles[0])}
          </Typography>
          <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block' }} noWrap>
            {userScopeSubtitle}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ py: 1.5, display: 'flex', justifyContent: 'center' }}>
          <Tooltip title={`${formatRoleTitle(roles[0])} • ${userScopeSubtitle}`} placement="right">
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: '10px',
                bgcolor: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldIcon sx={{ color: '#38BDF8', fontSize: 20 }} />
            </Box>
          </Tooltip>
        </Box>
      )}

      {/* Navigation Links */}
      <Box
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          px: 1,
          py: 0.5,
          '&::-webkit-scrollbar': { width: '5px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { background: 'rgba(255, 255, 255, 0.15)', borderRadius: '10px' },
          '&::-webkit-scrollbar-thumb:hover': { background: 'rgba(255, 255, 255, 0.28)' },
        }}
      >
        {menuSections.map((section) => {
          const visibleItems = section.items.filter((item) => {
            if ((item as any).sysAdminOnly && !isSysAdmin) return false;
            return !item.permission || hasPermission(item.permission);
          });
          if (visibleItems.length === 0) return null;

          return (
            <List
              key={section.subheader}
              subheader={
                !collapsed ? (
                  <ListSubheader
                    sx={{
                      bgcolor: 'transparent',
                      color: '#64748B',
                      fontSize: '0.65rem',
                      fontWeight: 'bold',
                      letterSpacing: '0.08em',
                      lineHeight: '28px',
                      mt: 1,
                    }}
                  >
                    {section.subheader}
                  </ListSubheader>
                ) : (
                  <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.06)' }} />
                )
              }
            >
              {visibleItems.map((item) => {
                const isSelected = location.pathname === item.path;

                const buttonContent = (
                  <ListItem key={item.label} disablePadding sx={{ mb: 0.5 }}>
                    <ListItemButton
                      selected={isSelected}
                      onClick={() => {
                        navigate(item.path);
                        setMobileOpen(false);
                      }}
                      sx={{
                        borderRadius: '12px',
                        minHeight: 46,
                        px: collapsed ? 1.5 : 1.75,
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        color: isSelected ? '#FFFFFF' : '#94A3B8',
                        bgcolor: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                        border: isSelected ? '1px solid rgba(56, 189, 248, 0.28)' : '1px solid transparent',
                        boxShadow: isSelected ? '0 0 16px rgba(56, 189, 248, 0.12)' : 'none',
                        position: 'relative',
                        transition: 'all 180ms ease-in-out',
                        '&:hover': {
                          bgcolor: isSelected ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255, 255, 255, 0.06)',
                          color: '#F8FAFC',
                          '& .MuiListItemIcon-root': { color: '#38BDF8' },
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          color: isSelected ? '#38BDF8' : '#64748B',
                          minWidth: collapsed ? 0 : 34,
                          justifyContent: 'center',
                          transition: 'color 180ms ease-in-out',
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      {!collapsed && (
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{
                            fontSize: '0.875rem',
                            fontWeight: isSelected ? 'bold' : '500',
                            letterSpacing: '0.01em',
                          }}
                        />
                      )}
                      {!collapsed && item.path === '/reports' && unreadCount > 0 && (
                        <Chip
                          label={unreadCount > 99 ? '99+' : unreadCount}
                          color="error"
                          size="small"
                          sx={{ height: 20, fontSize: '0.7rem', fontWeight: 'bold', ml: 1 }}
                        />
                      )}
                      {!collapsed && item.path === '/admin-requests' && pendingAdminRequestsCount > 0 && (
                        <Chip
                          label={pendingAdminRequestsCount > 99 ? '99+' : pendingAdminRequestsCount}
                          color="warning"
                          size="small"
                          sx={{ height: 20, fontSize: '0.7rem', fontWeight: 'bold', ml: 1 }}
                        />
                      )}
                    </ListItemButton>
                  </ListItem>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={item.label} title={item.label} placement="right">
                      {buttonContent}
                    </Tooltip>
                  );
                }

                return buttonContent;
              })}
            </List>
          );
        })}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />

      {/* Footer Branding Area */}
      {!collapsed ? (
        <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(0, 0, 0, 0.15)' }}>
          <Typography variant="caption" sx={{ color: '#64748B', display: 'block', fontWeight: 'bold' }}>
            Ghana Emergency Connect v1.0
          </Typography>
        </Box>
      ) : (
        <Box sx={{ py: 1.5, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.65rem', fontWeight: 'bold' }}>
            v1.0
          </Typography>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${currentDrawerWidth}px)` },
          ml: { sm: `${currentDrawerWidth}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider',
          transition: 'width 220ms cubic-bezier(0.4, 0, 0.2, 1), margin-left 220ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { sm: 'none' } }}>
            <MenuIcon />
          </IconButton>

          <Typography variant="subtitle1" fontWeight="bold" color="text.secondary">
            National Emergency Operations Command Center
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={(e) => setNotifAnchorEl(e.currentTarget)} color="inherit">
              <Badge badgeContent={unreadNotifCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>

            {/* Notification Dropdown Menu */}
            <Menu
              anchorEl={notifAnchorEl}
              open={Boolean(notifAnchorEl)}
              onClose={() => setNotifAnchorEl(null)}
              PaperProps={{ sx: { width: 360, maxHeight: 450 } }}
            >
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" fontWeight="bold">Notifications</Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {unreadNotifCount > 0 && (
                    <Tooltip title="Mark All as Read">
                      <IconButton size="small" onClick={() => markAllReadMutation.mutate()}>
                        <DoneAllIcon fontSize="small" color="primary" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {notifications.some((n) => Boolean(n.readAt) || n.readState) && (
                    <Tooltip title="Clear Read Notifications">
                      <IconButton size="small" onClick={() => clearReadNotifsMutation.mutate()}>
                        <DeleteOutlineIcon fontSize="small" color="action" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>
              <Divider />

              {notifications.map((n) => {
                const isUnread = !n.readAt && !n.readState;

                return (
                  <MenuItem
                    key={n.id}
                    onClick={() => {
                      if (isUnread) {
                        markNotifReadMutation.mutate(n.id);
                      }
                      setSelectedNotif(n);
                      setNotifDetailOpen(true);
                    }}
                    sx={{
                      bgcolor: isUnread ? 'action.hover' : 'transparent',
                      display: 'flex',
                      justify: 'space-between',
                      alignItems: 'center',
                      py: 1.5,
                      borderLeft: isUnread ? '3px solid #0066CC' : '3px solid transparent',
                    }}
                  >
                    <Box sx={{ flexGrow: 1, pr: 1, overflow: 'hidden' }}>
                      <Typography variant="body2" fontWeight={isUnread ? 'bold' : '500'} noWrap>
                        {n.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {n.message || n.body}
                      </Typography>
                      <Typography variant="caption" color="primary" sx={{ fontSize: '0.65rem', mt: 0.5, display: 'block' }}>
                        {new Date(n.createdAt).toLocaleString()}
                      </Typography>
                    </Box>

                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotifMutation.mutate(n.id);
                      }}
                      title="Delete Notification"
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </MenuItem>
                );
              })}

              {notifications.length === 0 && (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">No notifications available.</Typography>
                </Box>
              )}
            </Menu>

            <IconButton onClick={toggleTheme} color="inherit">
              {currentMode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>

            <Box
              onClick={handleProfileMenuOpen}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                cursor: 'pointer',
                p: 0.5,
                borderRadius: 2,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: '0.875rem', fontWeight: 'bold' }}>
                {user?.firstName?.[0] || 'A'}
              </Avatar>
              <Box sx={{ display: { xs: 'none', md: 'block' }, textAlign: 'left' }}>
                <Typography variant="subtitle2" fontWeight="bold" lineHeight={1.2}>
                  {user?.firstName} {user?.lastName}
                </Typography>
                <Chip label={formatRoleTitle(roles[0])} size="small" color="primary" sx={{ height: 18, fontSize: '0.65rem' }} />
              </Box>
            </Box>

            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleProfileMenuClose}>
              <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/profile'); }}>
                <ListItemIcon><AccountCircleIcon fontSize="small" /></ListItemIcon>
                My Profile
              </MenuItem>
              {isSysAdmin && (
                <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/settings'); }}>
                  <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
                  Settings
                </MenuItem>
              )}
              <Divider />
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                <ListItemIcon><LogoutIcon fontSize="small" color="error" /></ListItemIcon>
                Sign Out
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { sm: currentDrawerWidth }, flexShrink: { sm: 0 }, transition: 'width 220ms cubic-bezier(0.4, 0, 0.2, 1)' }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: expandedDrawerWidth } }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: currentDrawerWidth,
              borderRight: 'none',
              transition: 'width 220ms cubic-bezier(0.4, 0, 0.2, 1)',
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${currentDrawerWidth}px)` },
          mt: 8,
          transition: 'width 220ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Outlet />
      </Box>

      {/* Notification Detail Dialog */}
      <Dialog open={notifDetailOpen} onClose={() => setNotifDetailOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
          <span>Notification Detail</span>
          <IconButton onClick={() => setNotifDetailOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedNotif && (
            <Box>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                {selectedNotif.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {selectedNotif.message || selectedNotif.body}
              </Typography>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" color="text.secondary" display="block">
                Received: {new Date(selectedNotif.createdAt).toLocaleString()}
              </Typography>
              <Typography variant="caption" color="primary" display="block">
                Status: {selectedNotif.readAt || selectedNotif.readState ? 'Read' : 'Unread'}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotifDetailOpen(false)}>Close</Button>
          {selectedNotif?.actionUrl && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<LaunchIcon />}
              onClick={() => {
                setNotifDetailOpen(false);
                setNotifAnchorEl(null);
                navigate(selectedNotif.actionUrl!);
              }}
            >
              View Request
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* 1-Hour Inactivity Session Warning Dialog */}
      <Dialog open={showWarning} onClose={handleStaySignedIn} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">Session Expiring Soon</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Your administrative session will expire shortly due to inactivity. Would you like to stay signed in?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSignOut} color="error">Sign Out</Button>
          <Button onClick={handleStaySignedIn} variant="contained" color="primary">Stay Signed In</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
