import React from 'react';
import { Box, Button, Card, CardContent, Chip, Divider, Grid, Typography } from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { AgencyType } from '@/types';
import { useNavigate } from 'react-router-dom';

interface AgencyPerformanceCardProps {
  agencyName: string;
  agencyCode: string;
  agencyType: AgencyType;
  totalIncidents: number;
  unacknowledgedCount: number;
  inProgressCount: number;
  resolvedCount: number;
}

export const AgencyPerformanceCard: React.FC<AgencyPerformanceCardProps> = ({
  agencyName,
  agencyCode,
  agencyType,
  totalIncidents,
  unacknowledgedCount,
  inProgressCount,
  resolvedCount,
}) => {
  const navigate = useNavigate();

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
        <div>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  bgcolor: 'primary.main',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <BusinessIcon fontSize="small" />
              </Box>
              <div>
                <Typography variant="subtitle2" fontWeight="bold" noWrap>
                  {agencyName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Code: {agencyCode}
                </Typography>
              </div>
            </Box>

            <Chip label={agencyType} size="small" variant="outlined" />
          </Box>

          <Divider sx={{ my: 1.5 }} />

          <Grid container spacing={1}>
            <Grid item xs={6}>
              <Box sx={{ p: 1, bgcolor: 'background.default', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Total Incidents
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {totalIncidents}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ p: 1, bgcolor: unacknowledgedCount > 0 ? '#FEF3C7' : 'background.default', borderRadius: 2 }}>
                <Typography variant="caption" color={unacknowledgedCount > 0 ? '#D97706' : 'text.secondary'} display="block" fontWeight="bold">
                  Awaiting Ack
                </Typography>
                <Typography variant="h6" fontWeight="bold" color={unacknowledgedCount > 0 ? '#D97706' : 'text.primary'}>
                  {unacknowledgedCount}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ p: 1, bgcolor: 'background.default', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  In Progress
                </Typography>
                <Typography variant="h6" fontWeight="bold" color="primary">
                  {inProgressCount}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ p: 1, bgcolor: 'background.default', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Resolved
                </Typography>
                <Typography variant="h6" fontWeight="bold" color="success.main">
                  {resolvedCount}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </div>

        <Button
          fullWidth
          size="small"
          variant="outlined"
          endIcon={<ArrowForwardIcon />}
          onClick={() => navigate('/reports')}
          sx={{ mt: 2 }}
        >
          Inspect Agency Incidents
        </Button>
      </CardContent>
    </Card>
  );
};
