import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Skeleton,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useQuery } from '@tanstack/react-query';
import { reportApi } from '@/api/reportApi';
import { useNavigate } from 'react-router-dom';

export const ReportsPage: React.FC = () => {
  const [page] = useState(0);
  const [tabValue, setTabValue] = useState<string>('ALL');

  const navigate = useNavigate();

  const { data: reportsPage, isLoading } = useQuery({
    queryKey: ['reports', page],
    queryFn: () => reportApi.getReports(page, 20),
  });

  const rawReports = reportsPage?.content || [];

  const filteredReports = rawReports.filter((report) => {
    if (tabValue === 'ALL') return true;
    if (tabValue === 'NEW') return report.status === 'SUBMITTED' || report.status === 'RECEIVED';
    if (tabValue === 'ACKNOWLEDGED') return report.status === 'ACKNOWLEDGED';
    if (tabValue === 'IN_PROGRESS') return report.status === 'IN_PROGRESS';
    if (tabValue === 'RESOLVED') return report.status === 'RESOLVED';
    return true;
  });

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Incident Reports Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Operational incoming reports, agency assignment, and oversight monitoring
        </Typography>
      </Box>

      <Box sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tabValue}
          onChange={(_, val) => setTabValue(val)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label={`ALL (${rawReports.length})`} value="ALL" />
          <Tab label="NEW / RECEIVED" value="NEW" />
          <Tab label="ACKNOWLEDGED" value="ACKNOWLEDGED" />
          <Tab label="IN PROGRESS" value="IN_PROGRESS" />
          <Tab label="RESOLVED" value="RESOLVED" />
        </Tabs>
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {isLoading ? (
            <Box sx={{ p: 3 }}>
              <Skeleton variant="rectangular" height={300} />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Reference</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Mode</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Submitted Time</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow key={report.id} hover>
                      <TableCell
                        sx={{ fontWeight: 'bold', cursor: 'pointer', color: 'primary.main' }}
                        onClick={() => navigate(`/reports/${report.id}`)}
                      >
                        {report.publicReference}
                      </TableCell>
                      <TableCell>{report.categoryName || 'Incident'}</TableCell>
                      <TableCell>
                        <Chip
                          label={report.severity}
                          color={report.severity === 'CRITICAL' ? 'error' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={report.mode}
                          color={report.mode === 'SILENT' ? 'secondary' : 'default'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={report.status}
                          size="small"
                          color={report.status === 'RESOLVED' ? 'success' : report.status === 'IN_PROGRESS' ? 'warning' : 'default'}
                        />
                      </TableCell>
                      <TableCell>{new Date(report.createdAt).toLocaleString()}</TableCell>
                      <TableCell align="right">
                        <Chip
                          icon={<VisibilityIcon fontSize="small" />}
                          label="View & Handle"
                          color="primary"
                          clickable
                          onClick={() => navigate(`/reports/${report.id}`)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredReports.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                        No incident reports found for the selected status tab.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
