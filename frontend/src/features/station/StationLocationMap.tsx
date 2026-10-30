import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';

interface StationLocationMapProps {
  latitude: number;
  longitude: number;
  mapType: 'roadmap' | 'hybrid';
  zoom?: number;
  onLocationSelect: (lat: number, lng: number) => void;
}

/**
 * Google Maps maintains imperative state outside React's normal rendering
 * model. A new map revision remounts only the canvas after a confirmed place
 * selection, preventing stale map instances from producing a blank surface
 * during repeated station searches.
 */
export const StationLocationMap: React.FC<StationLocationMapProps> = ({
  latitude,
  longitude,
  mapType,
  zoom = 16,
  onLocationSelect,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || !window.google?.maps) return;

    const validLat = Number.isFinite(latitude) ? latitude : 7.9465;
    const validLng = Number.isFinite(longitude) ? longitude : -1.0232;

    const mapOptions = {
      center: { lat: validLat, lng: validLng },
      zoom,
      mapTypeId: mapType === 'hybrid' ? window.google.maps.MapTypeId.HYBRID : window.google.maps.MapTypeId.ROADMAP,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
    };

    const map = new window.google.maps.Map(containerRef.current, mapOptions);
    mapInstanceRef.current = map;

    const marker = new window.google.maps.Marker({
      position: { lat: validLat, lng: validLng },
      map,
      draggable: true,
      title: 'Emergency Station Location',
    });
    markerRef.current = marker;

    marker.addListener('dragend', (event: any) => {
      const eventLat = event.latLng?.lat();
      const eventLng = event.latLng?.lng();
      if (eventLat != null && eventLng != null) {
        const dragLat = parseFloat(eventLat.toFixed(6));
        const dragLng = parseFloat(eventLng.toFixed(6));
        onLocationSelect(dragLat, dragLng);
      }
    });

    map.addListener('click', (event: any) => {
      if (event.latLng) {
        const clickedLat = parseFloat(event.latLng.lat().toFixed(6));
        const clickedLng = parseFloat(event.latLng.lng().toFixed(6));
        marker.setPosition({ lat: clickedLat, lng: clickedLng });
        onLocationSelect(clickedLat, clickedLng);
      }
    });

    // Schedule container re-measurement for responsive dialogs
    const resizeTimer = setTimeout(() => {
      if (mapInstanceRef.current && window.google?.maps) {
        window.google.maps.event.trigger(mapInstanceRef.current, 'resize');
        mapInstanceRef.current.setCenter({ lat: validLat, lng: validLng });
      }
    }, 100);

    return () => {
      clearTimeout(resizeTimer);
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      mapInstanceRef.current = null;
    };
  }, []);

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        height: '100%',
        minHeight: { xs: 350, sm: 450, md: 500 },
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'action.hover',
        overflow: 'hidden',
      }}
    />
  );
};
