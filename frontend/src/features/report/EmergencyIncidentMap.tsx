import React, { useEffect, useRef } from 'react';
import { Box, Card, CardContent, Chip, Divider, Typography } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import NavigationIcon from '@mui/icons-material/Navigation';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import { IncidentLocationSummary } from '@/api/locationTrackingApi';

interface EmergencyIncidentMapProps {
  summary: IncidentLocationSummary;
}

/**
 * Uses the assigned station's persisted coordinates as the response origin and
 * the citizen's reported or live location as the destination.
 * Fits the map to the responding station and citizen location so the complete
 * response path is immediately visible.
 */
export const EmergencyIncidentMap: React.FC<EmergencyIncidentMapProps> = ({ summary }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);

  const initialLat = summary.initialLatitude;
  const initialLng = summary.initialLongitude;
  const liveLat = summary.latestLiveLatitude;
  const liveLng = summary.latestLiveLongitude;
  const isLive = summary.isLiveTrackingActive && liveLat != null && liveLng != null;

  const currentCitizenLat = isLive ? liveLat : initialLat;
  const currentCitizenLng = isLive ? liveLng : initialLng;

  const hasGoogleMaps = typeof window !== 'undefined' && Boolean((window as any).google?.maps);

  const validLat = currentCitizenLat != null && Number.isFinite(currentCitizenLat) ? currentCitizenLat : 7.9465;
  const validLng = currentCitizenLng != null && Number.isFinite(currentCitizenLng) ? currentCitizenLng : -1.0232;

  useEffect(() => {
    if (!containerRef.current || !hasGoogleMaps) return;

    const map = new window.google.maps.Map(containerRef.current, {
      center: { lat: validLat, lng: validLng },
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
    });
    mapInstanceRef.current = map;

    const bounds = new window.google.maps.LatLngBounds();
    let hasValidBounds = false;

    // Station Origin Markers (A -> B Response Origin)
    summary.stationOrigins.forEach((station) => {
      if (Number.isFinite(station.latitude) && Number.isFinite(station.longitude)) {
        const pos = { lat: station.latitude, lng: station.longitude };
        bounds.extend(pos);
        hasValidBounds = true;

        new window.google.maps.Marker({
          position: pos,
          map,
          title: `Responding Station: ${station.stationName || station.agencyName}`,
          icon: {
            path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: '#1976d2',
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: '#ffffff',
          },
        });
      }
    });

    // Initial Reported Citizen Location Marker (Snapshot Destination)
    // Snapshot incidents use the immutable location captured when the emergency was reported and do not require an active live-tracking session.
    if (initialLat != null && initialLng != null && Number.isFinite(initialLat) && Number.isFinite(initialLng)) {
      const initPos = { lat: initialLat, lng: initialLng };
      bounds.extend(initPos);
      hasValidBounds = true;

      new window.google.maps.Marker({
        position: initPos,
        map,
        title: 'Original Reported Emergency Location',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: '#d32f2f',
          fillOpacity: 0.9,
          strokeWeight: 2,
          strokeColor: '#ffffff',
        },
      });
    }

    // Live Moving Citizen Location Marker (Consented Moving Destination)
    // Uses the latest consented tracking point for the moving destination while preserving the original reported location.
    if (isLive && liveLat != null && liveLng != null && Number.isFinite(liveLat) && Number.isFinite(liveLng)) {
      const livePos = { lat: liveLat, lng: liveLng };
      bounds.extend(livePos);
      hasValidBounds = true;

      new window.google.maps.Marker({
        position: livePos,
        map,
        title: 'Current Live Citizen Location',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#2e7d32',
          fillOpacity: 1,
          strokeWeight: 3,
          strokeColor: '#ffffff',
        },
      });
    }

    if (hasValidBounds) {
      map.fitBounds(bounds);
    }

    // Delayed resize trigger prevents blank surface on dynamic tab mount
    const resizeTimer = setTimeout(() => {
      if (mapInstanceRef.current && window.google?.maps) {
        window.google.maps.event.trigger(mapInstanceRef.current, 'resize');
        if (hasValidBounds) {
          mapInstanceRef.current.fitBounds(bounds);
        } else {
          mapInstanceRef.current.setCenter({ lat: validLat, lng: validLng });
        }
      }
    }, 150);

    return () => {
      clearTimeout(resizeTimer);
      mapInstanceRef.current = null;
    };
  }, [summary, currentCitizenLat, currentCitizenLng, initialLat, initialLng, isLive, liveLat, liveLng, hasGoogleMaps, validLat, validLng]);

  const osmIframeUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${validLng - 0.03},${validLat - 0.03},${validLng + 0.03},${validLat + 0.03}&layer=mapnik&marker=${validLat},${validLng}`;

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NavigationIcon color="primary" />
            <Typography variant="subtitle1" fontWeight="bold">
              Emergency Map (Station Origin → Citizen Destination)
            </Typography>
          </Box>
          <Chip
            icon={isLive ? <GpsFixedIcon color="success" /> : <LocationOnIcon />}
            label={isLive ? 'LIVE TRACKING ACTIVE' : 'SNAPSHOT LOCATION'}
            color={isLive ? 'success' : 'default'}
            size="small"
          />
        </Box>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
          Origin: Responding Station Coordinates | Destination: Citizen Initial vs Moving Live Location
        </Typography>
        <Divider sx={{ mb: 2 }} />

        {hasGoogleMaps ? (
          <Box
            ref={containerRef}
            sx={{
              width: '100%',
              height: 350,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'action.hover',
              overflow: 'hidden',
            }}
          />
        ) : (
          // Render whichever valid locations are available instead of hiding the entire map when the responding station has not yet been assigned.
          <Box
            component="iframe"
            src={osmIframeUrl}
            title="OpenStreetMap Emergency Incident Map"
            sx={{
              width: '100%',
              height: 350,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
            }}
          />
        )}

        <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          {initialLat != null ? (
            <Typography variant="caption">
              Initial Reported: <strong>{initialLat.toFixed(4)}, {initialLng?.toFixed(4)}</strong> ±
              {summary.initialAccuracyMeters ? `${summary.initialAccuracyMeters.toFixed(0)}m` : ''}
            </Typography>
          ) : (
            <Typography variant="caption" color="text.secondary">
              Location unavailable
            </Typography>
          )}
          {isLive && (
            <Typography variant="caption" color="success.main" fontWeight="bold">
              Latest Live Location: <strong>{liveLat?.toFixed(4)}, {liveLng?.toFixed(4)}</strong> (Updated: {new Date(summary.latestLiveCapturedAt!).toLocaleTimeString()})
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
