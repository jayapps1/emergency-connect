import React from 'react';
import { Alert, Box, Button, Card, CardContent, Chip,
  Divider, Grid, Skeleton, Table, TableBody, TableCell,
   TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import MemoryIcon from '@mui/icons-material/Memory';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cacheApi } from '@/api/cacheApi';

// Caches stable reference data while write operations evict related entries so public and administrative reads remain fast without serving stale updates.
export const CacheManagementPage: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: metrics, isLoading, isError } = useQuery({
    queryKey: ['cacheMetrics'],
    queryFn: cacheApi.getMetrics,
    refetchInterval: 10000,
  });

  const clearCacheMutation = useMutation({
    mutationFn: (cacheName?: string) => cacheApi.clearCache(cacheName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cacheMetrics'] });
    },
  });

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <MemoryIcon color="primary" fontSize="large" />
          <Typography variant="h4" fontWeight="bold">
            Application Cache Diagnostics & Eviction
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Caffeine in-memory reference cache performance, entry estimates, hit rates, and eviction controls
        </Typography>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">
              Active Reference Caches ({metrics?.length || 0})
            </Typography>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteSweepIcon />}
              disabled={clearCacheMutation.isPending}
              onClick={() => clearCacheMutation.mutate(undefined)}
            >
              Clear All Caches
            </Button>
          </Box>
          <Divider sx={{ mb: 2 }} />

          {isLoading ? (
            <Skeleton variant="rectangular" height={250} />
          ) : isError ? (
            <Alert severity="error">Unable to load cache metrics.</Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>CACHE NAME</TableCell>
                    <TableCell>PROVIDER</TableCell>
                    <TableCell>ESTIMATED ENTRIES</TableCell>
                    <TableCell>HIT COUNT</TableCell>
                    <TableCell>MISS COUNT</TableCell>
                    <TableCell>HIT RATE</TableCell>
                    <TableCell align="right">ACTION</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {metrics?.map((m) => (
                    <TableRow key={m.cacheName} hover>
                      <TableCell sx={{ fontWeight: 'bold', color: 'primary.main', fontFamily: 'monospace' }}>
                        {m.cacheName}
                      </TableCell>
                      <TableCell><Chip label={m.provider} size="small" /></TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>{m.estimatedSize}</TableCell>
                      <TableCell sx={{ color: 'success.main', fontWeight: 'bold' }}>{m.hitCount}</TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{m.missCount}</TableCell>
                      <TableCell><Chip label={m.hitRate} color="primary" variant="outlined" size="small" /></TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          color="warning"
                          onClick={() => clearCacheMutation.mutate(m.cacheName)}
                        >
                          Clear Cache
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
