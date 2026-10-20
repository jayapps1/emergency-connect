import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ShieldIcon from '@mui/icons-material/Shield';
import { AdminReportSummary } from '@/types';
import { useNavigate } from 'react-router-dom';

interface RequiresAttentionPanelProps {
  reports: AdminReportSummary[];
  isLoading?: boolean;
}

export const RequiresAttentionPanel: React.FC<RequiresAttentionPanelProps> = ({
  reports,
  isLoading,
}) => {
  const navigate = useNavigate();

  const urgentReports = reports.filter(
    (r) => r.status === 'SUBMITTED' || r.status === 'RECEIVED' || r.severity === 'CRITICAL'
  );

  return (
    <Card sx={{ mb: 4, border: '1px solid', borderColor: urgentReports.length > 0 ? 'warning.light' : 'divider' }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: urgentReports.length > 0 ? '#FEF3C7' : '#F1F5F9',
                color: urgentReports.length > 0 ? '#D97706' : '#64748B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <WarningAmberIcon />
            </Box>
            <div>
              <Typography variant="h6" fontWeight="bold">
                Incidents Requiring Operational Attention ({urgentReports.length})
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Reports awaiting immediate agency acknowledgement or dispatch action
              </Typography>
            </div>
          </Box>

          <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/reports')}>
            View All Reports
          </Button>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {urgentReports.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Reference</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Target Agencies</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Elapsed Time</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {urgentReports.slice(0, 5).map((report) => {
                  const elapsedMins = Math.max(0, Math.floor((Date.now() - new Date(report.createdAt).getTime()) / 60000));
                  return (
                    <TableRow key={report.id} hover>
                      <TableCell sx={{ fontWeight: 'bold', color: 'primary.main', cursor: 'pointer' }} onClick={() => navigate(`/reports/${report.id}`)}>
                        {report.publicReference}
                      </TableCell>
                      <TableCell>{report.categoryName || 'Incident'}</TableCell>
                      <TableCell>
                        <Chip
                          label={report.severity}
                          color={report.severity === 'CRITICAL' ? 'error' : report.severity === 'HIGH' ? 'warning' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {report.targetAgencyTypes?.map((ag) => (
                            <Chip key={ag} icon={<ShieldIcon />} label={ag} size="small" variant="outlined" />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={report.status} color="warning" size="small" />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: elapsedMins > 10 ? 'error.main' : 'text.primary' }}>
                        ● {elapsedMins} min waiting
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          onClick={() => navigate(`/reports/${report.id}`)}
                        >
                          View & Handle
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ p: 3, textAlign: 'center', bgcolor: 'background.default', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary" fontWeight="bold">
              ✓ No active incidents awaiting immediate acknowledgement.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              All incoming emergency alerts have been acknowledged by responsible dispatchers.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
