import React, { useState } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Chip,
  CssBaseline,
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
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BusinessIcon from '@mui/icons-material/Business';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import CategoryIcon from '@mui/icons-material/Category';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import PeopleIcon from '@mui/icons-material/People';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import ShieldIcon from '@mui/icons-material/Shield';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/auth/useAuthStore';
import { authApi } from '@/api/authApi';

const DRAWER_WIDTH = 270;

interface AdminLayoutProps {
  toggleTheme: () => void;
  currentMode: 'light' | 'dark';
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ toggleTheme, currentMode }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();

  const { user, roles, logout, hasPermission, hasRole } = useAuthStore();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    try {
      await authApi.logout();
    } catch (e) {
      // ignore logout error
    } finally {
      logout();
      navigate('/login');
    }
  };

  const navGroups = [
    {
      subheader: 'OVERVIEW',
      items: [{ label: 'Command Dashboard', icon: <DashboardIcon />, path: '/', permission: 'REPORT_READ' }],
    },
    {
      subheader: 'INCIDENT MANAGEMENT',
      items: [{ label: 'Incident Reports', icon: <ReportProblemIcon />, path: '/reports', permission: 'REPORT_READ' }],
    },
    {
      subheader: 'DIRECTORY & NETWORK',
      items: [
        { label: 'Agencies', icon: <BusinessIcon />, path: '/agencies', permission: 'AGENCY_READ' },
        { label: 'Stations & Contacts', icon: <LocalOfferIcon />, path: '/stations', permission: 'STATION_READ' },
        { label: 'Incident Categories', icon: <CategoryIcon />, path: '/incident-categories', permission: 'INCIDENT_CATEGORY_READ' },
      ],
    },
    {
      subheader: 'ADMINISTRATION',
      items: [
        { label: 'Admin Users', icon: <PeopleIcon />, path: '/users', permission: 'ADMIN_USER_READ' },
        { label: 'Temporary Credentials', icon: <VpnKeyIcon />, path: '/temporary-credentials', permission: 'ADMIN_USER_READ' },
        { label: 'Admin Requests', icon: <AdminPanelSettingsIcon />, path: '/admin-requests', permission: 'ADMIN_USER_READ' },
        { label: 'Roles & Permissions', icon: <AdminPanelSettingsIcon />, path: '/roles', permission: 'ROLE_READ' },
        { label: 'Audit Logs', icon: <HistoryIcon />, path: '/audit-logs', permission: 'AUDIT_LOG_READ' },
      ],
    },
    {
      subheader: 'SYSTEM',
      items: [{ label: 'System Settings', icon: <SettingsIcon />, path: '/settings', permission: 'SYSTEM_SETTINGS_MANAGE' }],
    },
  ];

  const logoSrc = currentMode === 'dark' ? '/brand/gec-logo-dark.png' : '/brand/gec-logo-transparent.png';

  const userRoleTitle = hasRole('SYSTEM_ADMIN')
    ? 'National Platform Oversight'
    : user?.agencyName
    ? `${user.agencyName} ${user.region ? `(${user.region})` : ''}`
    : roles[0] || 'User';

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#0B1739', color: '#F8FAFC' }}>
      <Toolbar sx={{ px: 2, display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5 }}>
        <Box
          component="img"
          src={logoSrc}
          alt="Ghana Emergency Connect"
          sx={{ maxHeight: 42, maxWidth: '100%', objectFit: 'contain' }}
        />
      </Toolbar>
      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.12)' }} />

      {/* Scope Identity Badge in Sidebar */}
      <Box sx={{ p: 2, mx: 1.5, my: 1.5, bgcolor: '#0F2047', borderRadius: 2, border: '1px solid rgba(255, 255, 255, 0.12)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <ShieldIcon sx={{ color: '#38BDF8', fontSize: 18 }} />
          <Typography variant="caption" fontWeight="bold" sx={{ color: '#38BDF8', letterSpacing: '0.05em' }}>
            OPERATIONAL SCOPE
          </Typography>
        </Box>
        <Typography variant="body2" fontWeight="bold" sx={{ color: '#FFFFFF' }} noWrap>
          {userRoleTitle}
        </Typography>
        <Typography variant="caption" sx={{ color: '#94A3B8' }} noWrap display="block">
          {user?.email || 'admin@gec.gov.gh'}
        </Typography>
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: 'auto', py: 1 }}>
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => hasPermission(item.permission));
          if (visibleItems.length === 0) return null;

          return (
            <List
              key={group.subheader}
              subheader={
                <ListSubheader sx={{ bgcolor: 'transparent', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.08em', color: '#94A3B8', pt: 1, pb: 0.5 }}>
                  {group.subheader}
                </ListSubheader>
              }
            >
              {visibleItems.map((item) => {
                const isSelected = location.pathname === item.path;
                return (
                  <ListItem key={item.path} disablePadding sx={{ mb: 0.5, px: 1.5 }}>
                    <ListItemButton
                      selected={isSelected}
                      onClick={() => {
                        navigate(item.path);
                        if (isMobile) setMobileOpen(false);
                      }}
                      sx={{
                        borderRadius: 2,
                        position: 'relative',
                        color: isSelected ? '#FFFFFF' : '#CBD5E1',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        },
                        '&.Mui-selected': {
                          backgroundColor: 'rgba(255, 255, 255, 0.12)',
                          color: '#FFFFFF',
                          fontWeight: 700,
                          '& .MuiListItemIcon-root': {
                            color: '#38BDF8',
                          },
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            left: 0,
                            top: '15%',
                            bottom: '15%',
                            width: 4,
                            borderRadius: '0 4px 4px 0',
                            backgroundColor: '#38BDF8',
                          },
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 40, color: isSelected ? '#38BDF8' : '#94A3B8' }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{ fontWeight: isSelected ? 700 : 500, fontSize: '0.875rem' }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          );
        })}
      </Box>
      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.12)' }} />
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="caption" sx={{ color: '#94A3B8' }} fontWeight="bold">
          Ghana Emergency Connect
        </Typography>
        <Typography variant="caption" sx={{ color: '#64748B' }} display="block">
          National Command Platform v1.0
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.03), 0 1px 2px -1px rgba(0, 0, 0, 0.03)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          color: 'text.primary',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              National Emergency Operations Console
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {userRoleTitle}
            </Typography>
          </Box>

          <IconButton color="inherit" sx={{ mr: 1 }}>
            <NotificationsNoneIcon />
          </IconButton>

          <IconButton onClick={toggleTheme} color="inherit" sx={{ mr: 1.5 }}>
            {currentMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>

          {user && (
            <Chip
              label={roles[0] || 'User'}
              color="primary"
              size="small"
              variant="outlined"
              sx={{ mr: 2, display: { xs: 'none', sm: 'inline-flex' }, fontWeight: 'bold' }}
            />
          )}

          <IconButton onClick={handleMenuOpen} size="small">
            <Avatar sx={{ width: 36, height: 36, bgcolor: '#0A2540', color: '#FFFFFF', fontWeight: 'bold' }}>
              {user?.firstName?.[0] || 'A'}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={() => { handleMenuClose(); navigate('/profile'); }}>
              <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
              Profile & Password
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
              <ListItemIcon><LogoutIcon fontSize="small" color="error" /></ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, borderRight: 'none' },
          }}
        >
          {drawerContent}
        </Drawer>

        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, borderRight: 'none' },
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
          p: { xs: 2, sm: 3 },
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: '100vh',
          backgroundColor: 'background.default',
          mt: 8,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};
