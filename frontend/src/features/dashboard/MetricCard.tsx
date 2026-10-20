import React from 'react';
import { Box, Card, CardContent, Chip, Typography } from '@mui/material';

interface MetricCardProps {
  title: string;
  value: React.ReactNode;
  subtitle: string;
  icon: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  trendText?: string;
  trendType?: 'critical' | 'warning' | 'info' | 'success';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconBg = '#EFF6FF',
  iconColor = '#0066CC',
  trendText,
  trendType = 'info',
}) => {
  const getTrendColor = () => {
    switch (trendType) {
      case 'critical':
        return { bg: '#FEF2F2', text: '#DC2626' };
      case 'warning':
        return { bg: '#FEF3C7', text: '#D97706' };
      case 'success':
        return { bg: '#ECFDF5', text: '#059669' };
      case 'info':
      default:
        return { bg: '#EFF6FF', text: '#0066CC' };
    }
  };

  const trendStyle = getTrendColor();

  return (
    <Card
      sx={{
        height: '100%',
        transition: 'all 200ms ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 12px 24px -10px rgba(10, 37, 64, 0.12)',
        },
      }}
    >
      <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <div>
            <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {title}
            </Typography>
            <Typography variant="h3" fontWeight="bold" color="text.primary" sx={{ my: 0.5, lineHeight: 1 }}>
              {value}
            </Typography>
          </div>

          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: iconBg,
              color: iconColor,
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>

          {trendText && (
            <Chip
              label={trendText}
              size="small"
              sx={{
                bgcolor: trendStyle.bg,
                color: trendStyle.text,
                fontWeight: 700,
                fontSize: '0.7rem',
                height: 22,
              }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
