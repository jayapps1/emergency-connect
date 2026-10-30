import React, { useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Rating,
  Select,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import RateReviewIcon from '@mui/icons-material/RateReview';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useQuery } from '@tanstack/react-query';
import { reviewApi } from '@/api/reviewApi';
import { agencyApi } from '@/api/agencyApi';
import { useNavigate } from 'react-router-dom';
import { MetricCard } from '@/features/dashboard/MetricCard';
import { useAuthStore } from '@/auth/useAuthStore';

export const ReviewsPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuthStore();
  const isSysAdmin = hasRole('SYSTEM_ADMIN');

  const [selectedAgencyId, setSelectedAgencyId] = useState<string>('');
  const [selectedRating, setSelectedRating] = useState<number | undefined>(undefined);

  const { data: agencies = [] } = useQuery({
    queryKey: ['agencies'],
    queryFn: agencyApi.getAgencies,
    enabled: isSysAdmin,
  });

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['reviewSummary', selectedAgencyId],
    queryFn: () => reviewApi.getSummary(isSysAdmin ? selectedAgencyId || undefined : undefined),
    enabled: !isSysAdmin || Boolean(selectedAgencyId),
  });

  const { data: reviewsPage, isLoading: loadingReviews } = useQuery({
    queryKey: ['reviews', 0, 20, selectedRating, selectedAgencyId],
    queryFn: () => reviewApi.getReviews(0, 20, selectedRating, isSysAdmin ? selectedAgencyId || undefined : undefined),
    enabled: !isSysAdmin || Boolean(selectedAgencyId),
  });

  const reviews = reviewsPage?.content || [];
  const total = summary?.totalReviews || 0;
  const dist = summary?.ratingDistribution || {};

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          {isSysAdmin ? 'National Citizen Reviews Oversight' : 'Citizen Reviews & Feedback'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isSysAdmin
            ? 'System Admin national operational oversight for citizen response ratings and feedback.'
            : 'Monitor citizen ratings and operational performance feedback scoped to your agency assignments.'}
        </Typography>
      </Box>

      {/* System Admin Agency Selector Bar */}
      {isSysAdmin && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={4}>
                <FormControl size="small" fullWidth required>
                  <InputLabel>Select Responding Agency</InputLabel>
                  <Select
                    value={selectedAgencyId}
                    label="Select Responding Agency"
                    onChange={(e) => setSelectedAgencyId(e.target.value)}
                  >
                    <MenuItem value="">-- Select Responding Agency --</MenuItem>
                    {agencies.map((ag) => (
                      <MenuItem key={ag.id} value={ag.id}>
                        {ag.name} ({ag.code})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={8}>
                {!selectedAgencyId && (
                  <Typography variant="body2" color="text.secondary" fontWeight="bold">
                    ℹ️ Select an agency above to view its citizen response reviews and satisfaction statistics.
                  </Typography>
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {isSysAdmin && !selectedAgencyId ? (
        <Alert severity="info" sx={{ py: 3, px: 4, borderRadius: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Agency Selection Required
          </Typography>
          <Typography variant="body2">
            System Administrators must select a specific responding agency from the dropdown above to inspect citizen reviews and response performance analytics.
          </Typography>
        </Alert>
      ) : (
        <>
          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Average Rating"
                value={
                  loadingSummary ? (
                    <Skeleton width={40} />
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>{summary?.averageRating ? `${summary.averageRating} / 5` : 'N/A'}</span>
                      {Boolean(summary?.averageRating) && <Rating value={summary?.averageRating || 0} precision={0.1} readOnly size="small" />}
                    </Box>
                  )
                }
                subtitle="Citizen satisfaction score"
                icon={<StarIcon />}
                iconBg="#FEF3C7"
                iconColor="#D97706"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Total Reviews"
                value={loadingSummary ? <Skeleton width={40} /> : total}
                subtitle="Feedback submissions"
                icon={<RateReviewIcon />}
                iconBg="#EFF6FF"
                iconColor="#0066CC"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="5-Star Reviews"
                value={loadingSummary ? <Skeleton width={40} /> : summary?.fiveStarCount || 0}
                subtitle="Top rating responses"
                icon={<ThumbUpIcon />}
                iconBg="#ECFDF5"
                iconColor="#059669"
                trendType="success"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="caption" fontWeight="bold" color="text.secondary" gutterBottom display="block">
                    RATING DISTRIBUTION
                  </Typography>
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = dist[String(star)] || 0;
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    return (
                      <Box key={star} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="caption" sx={{ width: 16 }}>
                          {star}★
                        </Typography>
                        <LinearProgress variant="determinate" value={pct} sx={{ flexGrow: 1, height: 6, borderRadius: 3 }} />
                        <Typography variant="caption" color="text.secondary" sx={{ width: 24, textAlign: 'right' }}>
                          {count}
                        </Typography>
                      </Box>
                    );
                  })}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Filter Chips */}
          <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography variant="body2" fontWeight="bold" sx={{ mr: 1 }}>
              Filter Rating:
            </Typography>
            <Chip
              label="All Ratings"
              color={selectedRating === undefined ? 'primary' : 'default'}
              onClick={() => setSelectedRating(undefined)}
              clickable
            />
            {[5, 4, 3, 2, 1].map((star) => (
              <Chip
                key={star}
                label={`${star} Stars`}
                color={selectedRating === star ? 'primary' : 'default'}
                onClick={() => setSelectedRating(star)}
                clickable
              />
            ))}
          </Box>

          {/* Reviews Table */}
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                Citizen Response Reviews
              </Typography>

              {loadingReviews ? (
                <Skeleton variant="rectangular" height={200} />
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Submitted Date</TableCell>
                        <TableCell>Report Reference</TableCell>
                        <TableCell>Rating</TableCell>
                        <TableCell>Citizen Feedback / Comment</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reviews.map((rev) => (
                        <TableRow key={rev.id} hover>
                          <TableCell>{new Date(rev.createdAt).toLocaleString()}</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                            {rev.publicReference || 'Report'}
                          </TableCell>
                          <TableCell>
                            <Rating value={rev.rating} readOnly size="small" />
                          </TableCell>
                          <TableCell sx={{ maxWidth: 350 }}>
                            {rev.comment ? `"${rev.comment}"` : <Typography variant="caption" color="text.secondary">No comment provided</Typography>}
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              startIcon={<VisibilityIcon />}
                              onClick={() => navigate(`/reports/${rev.reportId}`)}
                            >
                              View Incident
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {reviews.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                            No citizen reviews have been received for this agency.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
};
