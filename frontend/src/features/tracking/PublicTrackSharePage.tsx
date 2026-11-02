import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  Skeleton,
  Typography,
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import NavigationIcon from '@mui/icons-material/Navigation';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import PersonIcon from '@mui/icons-material/Person';
import MapIcon from '@mui/icons-material/Map';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { locationTrackingApi } from '@/api/locationTrackingApi';

// Displays the latest response-device location from the active backend tracking session instead of treating the fixed incident destination as the responder's position.
export const PublicTrackSharePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const { data: shareData, isLoading, isError } = useQuery({
    queryKey: ['publicTrackShare', token],
    queryFn: () => locationTrackingApi.getPublicShareByToken(token!),
    enabled: Boolean(token),
    refetchInterval: 8000,
  });

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Skeleton variant="rectangular" height={380} />
      </Container>
    );
  }

  if (isError || !shareData) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Tracking Share Link Expired or Revoked.
        </Alert>
        <Typography variant="body2" color="text.secondary">
          This secure emergency tracking link is no longer active.
        </Typography>
      </Container>
    );
  }

  const trackingStatus = shareData.trackingStatus || 'WAITING';
  const isLive = trackingStatus === 'LIVE';
  const isStale = trackingStatus === 'STALE';

  const destLat = shareData.incidentLatitude;
  const destLng = shareData.incidentLongitude;
  const respLat = shareData.responseLatitude;
  const respLng = shareData.responseLongitude;

  const activeLat = (isLive || isStale) && respLat != null ? respLat : destLat != null ? destLat : 7.9465;
  const activeLng = (isLive || isStale) && respLng != null ? respLng : destLng != null ? destLng : -1.0232;

  const osmIframeUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${activeLng - 0.03},${activeLat - 0.03},${activeLng + 0.03},${activeLat + 0.03}&layer=mapnik&marker=${activeLat},${activeLng}`;

  const handleNavigateGoogleMaps = () => {
    if (destLat != null && destLng != null) {
      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving&dir_action=navigate`;
      window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const getStatusChip = () => {
    switch (trackingStatus) {
      case 'LIVE':
        return <Chip icon={<GpsFixedIcon color="success" />} label="LIVE RESPONSE TRACKING" color="success" />;
      case 'STALE':
        return <Chip icon={<GpsFixedIcon color="warning" />} label="RESPONSE UPDATES STALE" color="warning" />;
      case 'COMPLETED':
        return <Chip label="RESPONSE COMPLETED" color="primary" />;
      case 'STOPPED':
        return <Chip label="RESPONSE TRACKING STOPPED" color="default" />;
      default:
        return <Chip label="WAITING FOR RESPONSE TRACKING" color="info" />;
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Typography variant="h4" fontWeight="bold" color="primary" gutterBottom>
          GHANA EMERGENCY CONNECT
        </Typography>
        <Typography variant="subtitle1" fontWeight="bold">
          Emergency Response Operations ({shareData.publicReference})
        </Typography>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <NavigationIcon color="primary" />
              <Typography variant="subtitle1" fontWeight="bold">
                {shareData.categoryName}
              </Typography>
            </Box>
            {getStatusChip()}
          </Box>
          <Divider sx={{ mb: 2 }} />

          {/* Response Details Banner */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {shareData.agencyName && (
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Responding Agency</Typography>
                <Typography variant="body2" fontWeight="bold">{shareData.agencyName}</Typography>
              </Grid>
            )}
            {shareData.stationName && (
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Responding Station</Typography>
                <Typography variant="body2" fontWeight="bold">{shareData.stationName}</Typography>
              </Grid>
            )}
            {shareData.applianceCode && (
              <Grid item xs={6} sm={6}>
                <Typography variant="caption" color="text.secondary">Assigned Appliance / Tender</Typography>
                <Typography variant="body2" fontWeight="bold">{shareData.applianceCode}</Typography>
              </Grid>
            )}
            {shareData.responseLeadName && (
              <Grid item xs={6} sm={6}>
                <Typography variant="caption" color="text.secondary">Response Lead</Typography>
                <Typography variant="body2" fontWeight="bold">{shareData.responseLeadName}</Typography>
              </Grid>
            )}
          </Grid>

          {/* Interactive Map */}
          <Box
            component="iframe"
            src={osmIframeUrl}
            title="Operational Emergency Tracking Map"
            sx={{
              width: '100%',
              height: 380,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
              mb: 2,
            }}
          />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Box>
              {destLat != null && (
                <Typography variant="body2" display="block">
                  Incident Location: <strong>{destLat.toFixed(4)}, {destLng?.toFixed(4)}</strong>
                </Typography>
              )}
              {isLive && respLat != null && (
                <Typography variant="caption" color="success.main" fontWeight="bold" display="block">
                  Current Response Position: {respLat.toFixed(4)}, {respLng?.toFixed(4)}
                  {shareData.responseAccuracyMeters && ` (±${shareData.responseAccuracyMeters.toFixed(0)}m)`}
                </Typography>
              )}
            </Box>

            <Button
              variant="outlined"
              color="primary"
              startIcon={<MapIcon />}
              onClick={handleNavigateGoogleMaps}
              disabled={destLat == null || destLng == null}
            >
              Navigate to Incident
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};
