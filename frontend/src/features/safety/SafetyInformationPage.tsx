import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import PublishIcon from '@mui/icons-material/Publish';
import UnpublishedIcon from '@mui/icons-material/Unpublished';
import ArchiveIcon from '@mui/icons-material/Archive';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ClearIcon from '@mui/icons-material/Clear';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { safetyApi, SafetyPostItem } from '@/api/safetyApi';
import { agencyApi } from '@/api/agencyApi';
import { useAuthStore } from '@/auth/useAuthStore';
import { MetricCard } from '@/features/dashboard/MetricCard';

export const SafetyInformationPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasRole } = useAuthStore();
  const isSysAdmin = hasRole('SYSTEM_ADMIN');

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterAgency, setFilterAgency] = useState('ALL');

  // Modal States
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<SafetyPostItem | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form States
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('FIRE_SAFETY');
  const [severity, setSeverity] = useState('INFO');
  const [notifyUsers, setNotifyUsers] = useState(false);
  const [removalReason, setRemovalReason] = useState('');

  const { data: summaryData, isLoading: loadingSummary } = useQuery({
    queryKey: ['safetySummary'],
    queryFn: safetyApi.getSummary,
  });

  const { data: postsPage, isLoading: loadingPosts } = useQuery({
    queryKey: ['safetyPosts', filterStatus, filterCategory, filterSeverity, filterAgency, searchTerm],
    queryFn: () => safetyApi.getAdminPosts(0, 50, filterStatus, filterCategory, filterSeverity, filterAgency, searchTerm),
  });

  const { data: agencies = [] } = useQuery({
    queryKey: ['agencies'],
    queryFn: agencyApi.getAgencies,
    enabled: isSysAdmin,
  });

  const posts = postsPage?.content || [];

  const createMutation = useMutation({
    mutationFn: safetyApi.createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safetyPosts'] });
      queryClient.invalidateQueries({ queryKey: ['safetySummary'] });
      setCreateOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create safety information post.';
      setFormError(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; title: string; content: string; category: string; severity: string; notifyUsers: boolean }) =>
      safetyApi.updatePost(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safetyPosts'] });
      queryClient.invalidateQueries({ queryKey: ['safetySummary'] });
      setEditOpen(false);
      setSelectedPost(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to update safety information post.';
      setFormError(msg);
    },
  });

  const publishMutation = useMutation({
    mutationFn: safetyApi.publishPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safetyPosts'] });
      queryClient.invalidateQueries({ queryKey: ['safetySummary'] });
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: safetyApi.unpublishPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safetyPosts'] });
      queryClient.invalidateQueries({ queryKey: ['safetySummary'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: safetyApi.archivePost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safetyPosts'] });
      queryClient.invalidateQueries({ queryKey: ['safetySummary'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (data: { id: string; reason: string }) => safetyApi.removePostBySystem(data.id, data.reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safetyPosts'] });
      queryClient.invalidateQueries({ queryKey: ['safetySummary'] });
      setRemoveOpen(false);
      setSelectedPost(null);
      setRemovalReason('');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to remove safety post.';
      setFormError(msg);
    },
  });

  const resetForm = () => {
    setTitle('');
    setContent('');
    setCategory('FIRE_SAFETY');
    setSeverity('INFO');
    setNotifyUsers(false);
    setFormError(null);
  };

  const isFilterActive =
    Boolean(searchTerm) || filterStatus !== 'ALL' || filterCategory !== 'ALL' || filterSeverity !== 'ALL' || filterAgency !== 'ALL';

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterStatus('ALL');
    setFilterCategory('ALL');
    setFilterSeverity('ALL');
    setFilterAgency('ALL');
  };

  const renderSeverityChip = (sev: string) => {
    switch (sev.toUpperCase()) {
      case 'CRITICAL':
        return <Chip label="Critical" color="error" size="small" />;
      case 'WARNING':
        return <Chip label="Warning" color="warning" size="small" />;
      case 'ADVISORY':
        return <Chip label="Advisory" color="info" size="small" />;
      default:
        return <Chip label="Info" color="default" size="small" />;
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent, initialStatus: 'PUBLISHED' | 'DRAFT') => {
    e.preventDefault();
    setFormError(null);
    if (!title.trim() || !content.trim()) {
      setFormError('Please fill in all required safety information fields.');
      return;
    }
    try {
      await createMutation.mutateAsync({
        title: title.trim(),
        content: content.trim(),
        category,
        severity,
        status: initialStatus,
        notifyUsers,
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Safety information could not be published.';
      setFormError(msg);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            {isSysAdmin ? 'Public Safety & Advisory Oversight' : 'Public Safety Information'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isSysAdmin
              ? 'National oversight of public safety advisories and emergency preparedness guidance across Ghana.'
              : 'Create and publish public safety guidance, fire tips, and emergency advisories for your agency.'}
          </Typography>
        </Box>

        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { resetForm(); setCreateOpen(true); }}>
          {isSysAdmin ? 'Create National Post' : 'Create Safety Information'}
        </Button>
      </Box>

      {/* Summary KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard
            title="Total Posts"
            value={loadingSummary ? <Skeleton width={40} /> : summaryData?.total || 0}
            subtitle="Guidance articles"
            icon={<HealthAndSafetyIcon />}
            iconBg="#EFF6FF"
            iconColor="#0066CC"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard
            title="Published"
            value={loadingSummary ? <Skeleton width={40} /> : summaryData?.published || 0}
            subtitle="Live in public app"
            icon={<CheckCircleIcon />}
            iconBg="#ECFDF5"
            iconColor="#059669"
            trendType="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard
            title="Active Warnings"
            value={loadingSummary ? <Skeleton width={40} /> : summaryData?.warnings || 0}
            subtitle="Urgent advisories"
            icon={<WarningIcon />}
            iconBg="#FEF2F2"
            iconColor="#D32F2F"
            trendType="critical"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard
            title="Drafts"
            value={loadingSummary ? <Skeleton width={40} /> : summaryData?.drafts || 0}
            subtitle="Unpublished posts"
            icon={<EditIcon />}
            iconBg="#FEF3C7"
            iconColor="#D97706"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard
            title="Archived"
            value={loadingSummary ? <Skeleton width={40} /> : summaryData?.archived || 0}
            subtitle="Retired guidance"
            icon={<ArchiveIcon />}
            iconBg="#F3F4F6"
            iconColor="#4B5563"
          />
        </Grid>
      </Grid>

      {/* Search & Filter Toolbar */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={isSysAdmin ? 2.5 : 3}>
              <TextField
                placeholder="Search title, guidance..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {isSysAdmin && (
              <Grid item xs={6} sm={3} md={2}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Agency Source</InputLabel>
                  <Select value={filterAgency} label="Agency Source" onChange={(e) => setFilterAgency(e.target.value)}>
                    <MenuItem value="ALL">All Sources</MenuItem>
                    {agencies.map((ag) => (
                      <MenuItem key={ag.id} value={ag.id}>
                        {ag.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            <Grid item xs={6} sm={3} md={2}>
              <FormControl size="small" fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={filterStatus} label="Status" onChange={(e) => setFilterStatus(e.target.value)}>
                  <MenuItem value="ALL">All Statuses</MenuItem>
                  <MenuItem value="PUBLISHED">Published</MenuItem>
                  <MenuItem value="DRAFT">Draft</MenuItem>
                  <MenuItem value="ARCHIVED">Archived</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6} sm={3} md={2}>
              <FormControl size="small" fullWidth>
                <InputLabel>Category</InputLabel>
                <Select value={filterCategory} label="Category" onChange={(e) => setFilterCategory(e.target.value)}>
                  <MenuItem value="ALL">All Categories</MenuItem>
                  <MenuItem value="FIRE_SAFETY">Fire Safety</MenuItem>
                  <MenuItem value="ROAD_SAFETY">Road Safety</MenuItem>
                  <MenuItem value="MEDICAL_SAFETY">Medical Guidance</MenuItem>
                  <MenuItem value="FLOOD_SAFETY">Flood Safety</MenuItem>
                  <MenuItem value="DISASTER_PREPAREDNESS">Disaster Preparedness</MenuItem>
                  <MenuItem value="SECURITY_ALERT">Security Advisory</MenuItem>
                  <MenuItem value="WEATHER_SAFETY">Weather Alert</MenuItem>
                  <MenuItem value="GENERAL">General Guidance</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6} sm={3} md={2}>
              <FormControl size="small" fullWidth>
                <InputLabel>Severity</InputLabel>
                <Select value={filterSeverity} label="Severity" onChange={(e) => setFilterSeverity(e.target.value)}>
                  <MenuItem value="ALL">All Severities</MenuItem>
                  <MenuItem value="INFO">Info</MenuItem>
                  <MenuItem value="ADVISORY">Advisory</MenuItem>
                  <MenuItem value="WARNING">Warning</MenuItem>
                  <MenuItem value="CRITICAL">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6} sm={3} md={1.5}>
              {isFilterActive && (
                <Button size="small" color="secondary" onClick={handleClearFilters} startIcon={<ClearIcon />}>
                  Clear
                </Button>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Safety Posts Table */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">
              Public Safety Advisories & Guidance ({posts.length})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Showing {posts.length} safety posts
            </Typography>
          </Box>

          {loadingPosts ? (
            <Skeleton variant="rectangular" height={200} />
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Source / Issuing Agency</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Published Date</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {posts.map((post) => {
                    const isAgencyPost = post.sourceType === 'AGENCY';
                    const canEdit = !isSysAdmin || !isAgencyPost;

                    return (
                      <TableRow key={post.id} hover>
                        <TableCell sx={{ fontWeight: 'bold', color: 'primary.main', maxWidth: 260 }}>
                          {post.title}
                          {post.removedAt && (
                            <Chip label="System Removed" color="error" size="small" variant="outlined" sx={{ ml: 1 }} />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {post.agencyName}
                          </Typography>
                          <Chip label={post.sourceType} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                        </TableCell>
                        <TableCell>{post.category.replace('_', ' ')}</TableCell>
                        <TableCell>{renderSeverityChip(post.severity)}</TableCell>
                        <TableCell>
                          <Chip
                            label={post.status}
                            color={post.status === 'PUBLISHED' ? 'success' : post.status === 'DRAFT' ? 'warning' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : 'Unpublished'}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              setSelectedPost(post);
                              setDetailOpen(true);
                            }}
                            title="View Full Post"
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>

                          {canEdit ? (
                            <IconButton
                              size="small"
                              color="info"
                              onClick={() => {
                                setSelectedPost(post);
                                setTitle(post.title);
                                setContent(post.content);
                                setCategory(post.category);
                                setSeverity(post.severity);
                                setNotifyUsers(post.notifyUsers);
                                setFormError(null);
                                setEditOpen(true);
                              }}
                              title="Edit Post"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          ) : (
                            // Agency safety information is owned by the authenticated agency; System Admin may remove but never edit agency-authored content.
                            <IconButton
                              size="small"
                              disabled
                              title="System Admin cannot edit agency-authored posts"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          )}

                          {post.status === 'DRAFT' && canEdit && (
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => publishMutation.mutate(post.id)}
                              title="Publish Post"
                            >
                              <PublishIcon fontSize="small" />
                            </IconButton>
                          )}

                          {post.status === 'PUBLISHED' && canEdit && (
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => unpublishMutation.mutate(post.id)}
                              title="Unpublish to Draft"
                            >
                              <UnpublishedIcon fontSize="small" />
                            </IconButton>
                          )}

                          {isSysAdmin && isAgencyPost && !post.removedAt && (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                setSelectedPost(post);
                                setRemovalReason('');
                                setFormError(null);
                                setRemoveOpen(true);
                              }}
                              title="System Administrative Removal"
                            >
                              <DeleteForeverIcon fontSize="small" />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {posts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                        No safety information posts found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Create Safety Post Modal */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="md" fullWidth>
        <form onSubmit={(e) => handleCreateSubmit(e, 'PUBLISHED')}>
          <DialogTitle fontWeight="bold">{isSysAdmin ? 'Create National Public Safety Post' : 'Create Agency Safety Information'}</DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              {formError && (
                <Alert severity="error" onClose={() => setFormError(null)}>
                  {formError}
                </Alert>
              )}

              <TextField fullWidth label="Title" placeholder="e.g. Safety is a shared responsibility" value={title} onChange={(e) => setTitle(e.target.value)} required />
              <TextField fullWidth label="Full Safety Content & Guidance" placeholder="Detailed guidance, safety steps, emergency precautions..." value={content} onChange={(e) => setContent(e.target.value)} required multiline rows={6} />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Category</InputLabel>
                    <Select value={category} label="Category" onChange={(e) => setCategory(e.target.value)}>
                      <MenuItem value="FIRE_SAFETY">Fire Safety</MenuItem>
                      <MenuItem value="ROAD_SAFETY">Road Safety</MenuItem>
                      <MenuItem value="MEDICAL_SAFETY">Medical Guidance</MenuItem>
                      <MenuItem value="FLOOD_SAFETY">Flood Safety</MenuItem>
                      <MenuItem value="DISASTER_PREPAREDNESS">Disaster Preparedness</MenuItem>
                      <MenuItem value="SECURITY_ALERT">Security Advisory</MenuItem>
                      <MenuItem value="WEATHER_SAFETY">Weather Alert</MenuItem>
                      <MenuItem value="GENERAL">General Guidance</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Severity Level</InputLabel>
                    <Select value={severity} label="Severity Level" onChange={(e) => setSeverity(e.target.value)}>
                      <MenuItem value="INFO">INFO (General Education)</MenuItem>
                      <MenuItem value="ADVISORY">ADVISORY (Precautionary)</MenuItem>
                      <MenuItem value="WARNING">WARNING (High Risk)</MenuItem>
                      <MenuItem value="CRITICAL">CRITICAL (Immediate Public Safety Alert)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <FormControlLabel
                control={<Switch checked={notifyUsers} onChange={(e) => setNotifyUsers(e.target.checked)} />}
                label="Dispatch Public Notification Signal (FCM Push & In-App Alert)"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              type="button"
              variant="outlined"
              onClick={(e) => handleCreateSubmit(e, 'DRAFT')}
              disabled={!title || !content || createMutation.isPending}
            >
              Save as Draft
            </Button>
            <Button type="submit" variant="contained" disabled={!title || !content || createMutation.isPending}>
              {createMutation.isPending ? 'Publishing...' : 'Publish Immediately'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Edit Safety Post Modal */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle fontWeight="bold">Edit Safety Post — {selectedPost?.title}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {formError && (
              <Alert severity="error" onClose={() => setFormError(null)}>
                {formError}
              </Alert>
            )}

            <TextField fullWidth label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <TextField fullWidth label="Full Content & Guidance" value={content} onChange={(e) => setContent(e.target.value)} required multiline rows={6} />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth required>
                  <InputLabel>Category</InputLabel>
                  <Select value={category} label="Category" onChange={(e) => setCategory(e.target.value)}>
                    <MenuItem value="FIRE_SAFETY">Fire Safety</MenuItem>
                    <MenuItem value="ROAD_SAFETY">Road Safety</MenuItem>
                    <MenuItem value="MEDICAL_SAFETY">Medical Guidance</MenuItem>
                    <MenuItem value="FLOOD_SAFETY">Flood Safety</MenuItem>
                    <MenuItem value="DISASTER_PREPAREDNESS">Disaster Preparedness</MenuItem>
                    <MenuItem value="SECURITY_ALERT">Security Advisory</MenuItem>
                    <MenuItem value="WEATHER_SAFETY">Weather Alert</MenuItem>
                    <MenuItem value="GENERAL">General Guidance</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6}>
                <FormControl fullWidth required>
                  <InputLabel>Severity Level</InputLabel>
                  <Select value={severity} label="Severity Level" onChange={(e) => setSeverity(e.target.value)}>
                    <MenuItem value="INFO">INFO</MenuItem>
                    <MenuItem value="ADVISORY">ADVISORY</MenuItem>
                    <MenuItem value="WARNING">WARNING</MenuItem>
                    <MenuItem value="CRITICAL">CRITICAL</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <FormControlLabel
              control={<Switch checked={notifyUsers} onChange={(e) => setNotifyUsers(e.target.checked)} />}
              label="Public Notification Signal Enabled"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              setFormError(null);
              if (selectedPost) {
                updateMutation.mutate({
                  id: selectedPost.id,
                  title,
                  content,
                  category,
                  severity,
                  notifyUsers,
                });
              }
            }}
            disabled={!title || !content || updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
          {selectedPost?.title}
          <IconButton onClick={() => setDetailOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedPost && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Chip label={`Source: ${selectedPost.agencyName}`} color="primary" variant="outlined" />
                <Chip label={selectedPost.category.replace('_', ' ')} />
                {renderSeverityChip(selectedPost.severity)}
                <Chip label={selectedPost.status} color={selectedPost.status === 'PUBLISHED' ? 'success' : 'default'} />
              </Box>

              {selectedPost.removalReason && (
                <Alert severity="error">
                  <strong>System Admin Removal Reason:</strong> "{selectedPost.removalReason}"
                </Alert>
              )}

              <Typography variant="subtitle2" fontWeight="bold">Full Content & Guidance:</Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', bgcolor: 'background.default', p: 2, borderRadius: 2 }}>
                {selectedPost.content}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* System Admin Removal Modal */}
      <Dialog open={removeOpen} onClose={() => setRemoveOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">System Administrative Removal</DialogTitle>
        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError(null)}>
              {formError}
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary" gutterBottom>
            Remove <strong>"{selectedPost?.title}"</strong> authored by {selectedPost?.agencyName}?
          </Typography>

          <TextField
            fullWidth
            label="Required Removal Reason"
            placeholder="e.g. Contains outdated emergency advisory guidance"
            value={removalReason}
            onChange={(e) => setRemovalReason(e.target.value)}
            required
            multiline
            rows={3}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              setFormError(null);
              if (selectedPost) {
                removeMutation.mutate({ id: selectedPost.id, reason: removalReason });
              }
            }}
            disabled={!removalReason.trim() || removeMutation.isPending}
          >
            {removeMutation.isPending ? 'Removing...' : 'Confirm Administrative Removal'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
