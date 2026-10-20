import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';

interface DashboardHeroProps {
  userName?: string;
  roleTitle: string;
  subtitle: string;
}

export const DashboardHero: React.FC<DashboardHeroProps> = ({
  userName,
  roleTitle,
  subtitle,
}) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <Box
      sx={{
        p: { xs: 3, sm: 4 },
        mb: 4,
        borderRadius: 4,
        background: 'linear-gradient(135deg, #0A2540 0%, #0F2047 60%, #13295A 100%)',
        color: '#FFFFFF',
        boxShadow: '0 10px 30px -10px rgba(10, 37, 64, 0.5)',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
          <Chip
            icon={<ShieldIcon sx={{ color: '#38BDF8 !important' }} />}
            label={roleTitle}
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.12)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.75rem',
              letterSpacing: '0.05em',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          />
        </Box>

        <Typography variant="h4" fontWeight="bold" sx={{ color: '#FFFFFF', mb: 1 }}>
          {getGreeting()}{userName ? `, ${userName}` : ''}
        </Typography>

        <Typography variant="body1" sx={{ color: '#CBD5E1', maxWidth: 700 }}>
          {subtitle}
        </Typography>
      </Box>
    </Box>
  );
};
