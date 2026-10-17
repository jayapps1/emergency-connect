import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MapIcon from '@mui/icons-material/Map';
import SatelliteAltIcon from '@mui/icons-material/SatelliteAlt';
import CloseIcon from '@mui/icons-material/Close';

interface LocationPickerModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (lat: number, lng: number, localitySuggestion?: string) => void;
  initialLat?: number | null;
  initialLng?: number | null;
  regionName?: string | null;
  districtName?: string | null;
}

interface PlaceSuggestion {
  description: string;
  placeId: string;
}

declare global {
  interface Window {
    google: any;
  }
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  open,
  onClose,
  onConfirm,
  initialLat,
  initialLng,
  regionName,
  districtName,
}) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const googleMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const autocompleteServiceRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPlaceInfo, setSelectedPlaceInfo] = useState<{ name: string; address?: string; plusCode?: string } | null>(null);

  // Single authoritative temporary selection state
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(
    initialLat != null && initialLng != null && !isNaN(initialLat) && !isNaN(initialLng)
      ? { lat: initialLat, lng: initialLng }
      : null
  );
  const [manualLat, setManualLat] = useState<string>(initialLat != null ? String(initialLat) : '');
  const [manualLng, setManualLng] = useState<string>(initialLng != null ? String(initialLng) : '');
  const [mapType, setMapType] = useState<'roadmap' | 'hybrid'>('roadmap');
  const [localitySuggestion, setLocalitySuggestion] = useState<string | undefined>(undefined);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync initial values when modal opens
  useEffect(() => {
    if (open) {
      const hasInitial = initialLat != null && initialLng != null && !isNaN(initialLat) && !isNaN(initialLng);
      if (hasInitial) {
        setSelectedLocation({ lat: initialLat!, lng: initialLng! });
        setManualLat(String(initialLat));
        setManualLng(String(initialLng));
      } else {
        setSelectedLocation(null);
        setManualLat('');
        setManualLng('');
      }
      setValidationError(null);
      setSearchMessage(null);
      setSelectedPlaceInfo(null);
      setSearchQuery('');
      setSuggestions([]);
      setLocalitySuggestion(undefined);
    }
  }, [open, initialLat, initialLng]);

  // Load Google Maps & Places Libraries
  useEffect(() => {
    if (!open) return;

    if (!apiKey) {
      setLoadError('Google Maps API key is missing (VITE_GOOGLE_MAPS_API_KEY). You can enter coordinates manually.');
      return;
    }

    if (window.google?.maps?.places) {
      setMapLoaded(true);
      return;
    }

    const scriptId = 'google-maps-js-sdk';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setMapLoaded(true);
      };
      script.onerror = () => {
        setLoadError('Map service is temporarily unavailable. You can enter coordinates manually.');
      };
      document.head.appendChild(script);
    } else {
      setMapLoaded(true);
    }
  }, [open, apiKey]);

  const createMarker = (lat: number, lng: number, map: any) => {
    const marker = new window.google.maps.Marker({
      position: { lat, lng },
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
        console.log('Selected place coordinates (drag):', dragLat, dragLng);
        setSelectedLocation({ lat: dragLat, lng: dragLng });
        setManualLat(String(dragLat));
        setManualLng(String(dragLng));
        setValidationError(null);
        reverseGeocode(dragLat, dragLng);
      }
    });
  };

  const updateLocationFromCoordinates = (lat: number, lng: number, mapInstance?: any) => {
    const roundedLat = parseFloat(lat.toFixed(6));
    const roundedLng = parseFloat(lng.toFixed(6));

    console.log('Selected place coordinates (click/manual):', roundedLat, roundedLng);

    setSelectedLocation({ lat: roundedLat, lng: roundedLng });
    setManualLat(String(roundedLat));
    setManualLng(String(roundedLng));
    setValidationError(null);

    const map = mapInstance || googleMapRef.current;
    if (markerRef.current) {
      markerRef.current.setPosition({ lat: roundedLat, lng: roundedLng });
    } else if (map && window.google?.maps) {
      createMarker(roundedLat, roundedLng, map);
    }
  };

  // Centralized place location application function
  const applyPlaceLocation = (place: any) => {
    let lat: number | null = null;
    let lng: number | null = null;
    const displayName = place.name || place.displayName || searchQuery;
    const formattedAddress = place.formatted_address || place.formattedAddress || '';
    const plusCode =
      place.plus_code?.global_code ||
      place.plusCode?.globalCode ||
      place.plus_code?.compound_code ||
      place.plusCode?.compoundCode ||
      '';
    const viewport = place.geometry?.viewport || place.viewport;

    if (place.geometry?.location) {
      lat = typeof place.geometry.location.lat === 'function' ? place.geometry.location.lat() : place.geometry.location.lat;
      lng = typeof place.geometry.location.lng === 'function' ? place.geometry.location.lng() : place.geometry.location.lng;
    } else if (place.location) {
      lat = typeof place.location.lat === 'function' ? place.location.lat() : place.location.lat;
      lng = typeof place.location.lng === 'function' ? place.location.lng() : place.location.lng;
    }

    if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
      setSearchMessage('Selected place has no valid geographic coordinates.');
      return;
    }

    const roundedLat = parseFloat(lat.toFixed(6));
    const roundedLng = parseFloat(lng.toFixed(6));

    console.log('Selected place coordinates:', roundedLat, roundedLng);

    setSelectedLocation({ lat: roundedLat, lng: roundedLng });
    setManualLat(String(roundedLat));
    setManualLng(String(roundedLng));
    setValidationError(null);
    setSearchMessage(null);

    setSelectedPlaceInfo({
      name: displayName,
      address: formattedAddress,
      plusCode: plusCode || undefined,
    });

    const map = googleMapRef.current;
    if (markerRef.current) {
      markerRef.current.setPosition({ lat: roundedLat, lng: roundedLng });
    } else if (map && window.google?.maps) {
      createMarker(roundedLat, roundedLng, map);
    }

    if (map) {
      if (viewport) {
        map.fitBounds(viewport);
      } else {
        map.setCenter({ lat: roundedLat, lng: roundedLng });
        map.setZoom(17);
      }
    }

    reverseGeocode(roundedLat, roundedLng);
  };

  // Initialize Map and Places Services
  useEffect(() => {
    if (!open || !mapLoaded || !mapRef.current || !window.google?.maps) return;

    const hasInitialCoords = initialLat != null && initialLng != null && !isNaN(initialLat) && !isNaN(initialLng);
    const defaultLat = hasInitialCoords ? initialLat! : 7.9465; // Ghana center
    const defaultLng = hasInitialCoords ? initialLng! : -1.0232;
    const defaultZoom = hasInitialCoords ? 15 : 7;

    const mapOptions = {
      center: { lat: defaultLat, lng: defaultLng },
      zoom: defaultZoom,
      mapTypeId: mapType,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
    };

    const map = new window.google.maps.Map(mapRef.current, mapOptions);
    googleMapRef.current = map;

    // Initialize Places & Autocomplete Services
    if (window.google.maps.places) {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      placesServiceRef.current = new window.google.maps.places.PlacesService(map);
    }

    // Place Initial Marker if coordinates exist
    if (hasInitialCoords) {
      updateLocationFromCoordinates(defaultLat, defaultLng, map);
    }

    // Map Click & POI Click Handler
    map.addListener('click', (event: any) => {
      if (event.placeId) {
        event.stop?.();
        if (placesServiceRef.current) {
          placesServiceRef.current.getDetails(
            {
              placeId: event.placeId,
              fields: ['name', 'geometry', 'formatted_address', 'plus_code'],
            },
            (place: any, status: string) => {
              if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
                applyPlaceLocation(place);
              } else if (event.latLng) {
                const clickedLat = event.latLng.lat();
                const clickedLng = event.latLng.lng();
                updateLocationFromCoordinates(clickedLat, clickedLng, map);
                reverseGeocode(clickedLat, clickedLng);
              }
            }
          );
          return;
        }
      }

      if (event.latLng) {
        const clickedLat = event.latLng.lat();
        const clickedLng = event.latLng.lng();
        updateLocationFromCoordinates(clickedLat, clickedLng, map);
        reverseGeocode(clickedLat, clickedLng);
      }
    });

    // Geocode Region/District if no initial coords
    if (!hasInitialCoords && (regionName || districtName)) {
      const regionSearch = [districtName, regionName, 'Ghana'].filter(Boolean).join(', ');
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: regionSearch, componentRestrictions: { country: 'gh' } }, (results: any, status: string) => {
        if (status === 'OK' && results[0] && googleMapRef.current) {
          googleMapRef.current.setCenter(results[0].geometry.location);
          googleMapRef.current.setZoom(12);
        }
      });
    }
  }, [open, mapLoaded]);

  // Fetch Autocomplete Suggestions on Input Change (biased to Ghana)
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2 || !autocompleteServiceRef.current) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: searchQuery,
          componentRestrictions: { country: 'gh' },
        },
        (predictions: any[], status: string) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSuggestions(
              predictions.map((p) => ({
                description: p.description,
                placeId: p.place_id,
              }))
            );
          } else {
            setSuggestions([]);
          }
        }
      );
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const reverseGeocode = (lat: number, lng: number) => {
    if (!window.google?.maps) return;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results: any, status: string) => {
      if (status === 'OK' && results[0]) {
        const addressComponents = results[0].address_components;
        const sublocality = addressComponents.find((c: any) =>
          c.types.includes('sublocality') || c.types.includes('locality') || c.types.includes('neighborhood')
        );
        if (sublocality) {
          setLocalitySuggestion(sublocality.long_name);
        }
      }
    });
  };

  // Select Place Suggestion from Autocomplete Dropdown
  const handleSelectSuggestion = (suggestion: PlaceSuggestion) => {
    setSearchQuery(suggestion.description);
    setSuggestions([]);
    setSearchMessage(null);

    if (!placesServiceRef.current && googleMapRef.current) {
      placesServiceRef.current = new window.google.maps.places.PlacesService(googleMapRef.current);
    }

    if (placesServiceRef.current) {
      placesServiceRef.current.getDetails(
        {
          placeId: suggestion.placeId,
          fields: ['name', 'geometry', 'formatted_address', 'plus_code'],
        },
        (place: any, status: string) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
            applyPlaceLocation(place);
          } else {
            setSearchMessage('Google place search is temporarily unavailable.');
          }
        }
      );
    }
  };

  // Perform Free-Text Search via Places API / Geocoder
  const handlePerformSearch = () => {
    if (!searchQuery.trim()) return;

    setSuggestions([]);
    setSearchMessage(null);
    setSearching(true);

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode(
      {
        address: searchQuery,
        componentRestrictions: { country: 'gh' },
      },
      (results: any[], status: string) => {
        setSearching(false);
        if (status === 'OK' && results && results.length > 0) {
          const topResult = results[0];
          applyPlaceLocation({
            name: searchQuery,
            formatted_address: topResult.formatted_address,
            geometry: topResult.geometry,
            plus_code: topResult.plus_code,
          });
        } else {
          setSearchMessage('No matching place found. Try a nearby town, road or landmark.');
        }
      }
    );
  };

  const handleManualApply = () => {
    const parsedLat = parseFloat(manualLat);
    const parsedLng = parseFloat(manualLng);

    if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
      setValidationError('Latitude must be a valid number between -90 and 90.');
      return;
    }
    if (isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
      setValidationError('Longitude must be a valid number between -180 and 180.');
      return;
    }
    if (parsedLat === 0 && parsedLng === 0) {
      setValidationError('Coordinates (0,0) are invalid for a station location.');
      return;
    }

    setValidationError(null);
    updateLocationFromCoordinates(parsedLat, parsedLng);

    if (googleMapRef.current) {
      googleMapRef.current.setCenter({ lat: parsedLat, lng: parsedLng });
      googleMapRef.current.setZoom(15);
    }
  };

  const handleToggleMapType = (newType: 'roadmap' | 'hybrid') => {
    setMapType(newType);
    if (googleMapRef.current && window.google?.maps) {
      googleMapRef.current.setMapTypeId(
        newType === 'hybrid' ? window.google.maps.MapTypeId.HYBRID : window.google.maps.MapTypeId.ROADMAP
      );
    }
  };

  const handleConfirm = () => {
    if (!selectedLocation) {
      setValidationError('Please select or enter valid station coordinates.');
      return;
    }

    const { lat, lng } = selectedLocation;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setValidationError('Latitude or Longitude is out of valid range.');
      return;
    }
    if (lat === 0 && lng === 0) {
      setValidationError('Coordinates (0,0) are invalid for a station location.');
      return;
    }

    console.log('Confirm location:', lat, lng);
    onConfirm(lat, lng, localitySuggestion);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight="bold">
          Select Station Location
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2 }}>
        {loadError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {loadError}
          </Alert>
        )}

        {searchMessage && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {searchMessage}
          </Alert>
        )}

        {validationError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {validationError}
          </Alert>
        )}

        {/* Search & Map Controls Header */}
        <Box sx={{ mb: 2, position: 'relative' }}>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search town, road, landmark, or area (e.g. Komenda, Elmina, Cape Coast)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handlePerformSearch();
                }
              }}
              sx={{ flex: 1, minWidth: 280 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: searching ? (
                  <InputAdornment position="end">
                    <CircularProgress size={20} />
                  </InputAdornment>
                ) : null,
              }}
            />

            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={handlePerformSearch}
              disabled={!searchQuery.trim() || searching}
            >
              Search
            </Button>

            <ButtonGroup size="small" variant="outlined">
              <Button
                variant={mapType === 'roadmap' ? 'contained' : 'outlined'}
                startIcon={<MapIcon />}
                onClick={() => handleToggleMapType('roadmap')}
              >
                Map
              </Button>
              <Button
                variant={mapType === 'hybrid' ? 'contained' : 'outlined'}
                startIcon={<SatelliteAltIcon />}
                onClick={() => handleToggleMapType('hybrid')}
              >
                Satellite
              </Button>
            </ButtonGroup>
          </Box>

          {/* Places Autocomplete Suggestions Popup */}
          {suggestions.length > 0 && (
            <Paper
              elevation={4}
              sx={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: { xs: 0, sm: 200 },
                zIndex: 1300,
                mt: 0.5,
                maxHeight: 220,
                overflowY: 'auto',
              }}
            >
              {suggestions.map((suggestion) => (
                <Box
                  key={suggestion.placeId}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  sx={{
                    p: 1.5,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    '&:hover': { bgcolor: 'action.hover' },
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <LocationOnIcon color="primary" fontSize="small" />
                  <Typography variant="body2">{suggestion.description}</Typography>
                </Box>
              ))}
            </Paper>
          )}
        </Box>

        {/* Selected Place Summary Banner */}
        {selectedPlaceInfo && (
          <Box
            onClick={() => {
              if (selectedLocation && googleMapRef.current) {
                googleMapRef.current.setCenter({ lat: selectedLocation.lat, lng: selectedLocation.lng });
                googleMapRef.current.setZoom(17);
              }
            }}
            sx={{
              mb: 2,
              p: 1.5,
              bgcolor: 'primary.50',
              borderRadius: 1.5,
              border: '1px solid',
              borderColor: 'primary.200',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'primary.100' },
            }}
          >
            <Typography variant="subtitle2" fontWeight="bold" color="primary.main">
              Place: {selectedPlaceInfo.name}
            </Typography>
            {selectedPlaceInfo.address && (
              <Typography variant="caption" color="text.secondary" display="block">
                {selectedPlaceInfo.address}
              </Typography>
            )}
            {selectedPlaceInfo.plusCode && (
              <Typography variant="caption" color="primary.dark" display="block" sx={{ fontWeight: 'medium' }}>
                Google Plus Code: {selectedPlaceInfo.plusCode}
              </Typography>
            )}
            <Typography variant="caption" color="success.main" fontWeight="bold" sx={{ mt: 0.5, display: 'block' }}>
              ✓ Location selected from Google Maps
            </Typography>
          </Box>
        )}

        {/* Google Map Container */}
        <Box
          ref={mapRef}
          sx={{
            width: '100%',
            height: { xs: 350, sm: 450, md: 500 },
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'action.hover',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {!mapLoaded && !loadError && (
            <Typography color="text.secondary">Loading Google Maps...</Typography>
          )}
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Click anywhere on the map or drag the red marker to place the station at the exact compound or Watchroom.
        </Typography>

        {/* Selected / Manual Coordinate Inputs */}
        <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="Latitude"
                type="number"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                placeholder="e.g. 5.105823"
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="Longitude"
                type="number"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                placeholder="e.g. -1.246109"
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <Button
                fullWidth
                variant="outlined"
                size="medium"
                startIcon={<LocationOnIcon />}
                onClick={handleManualApply}
              >
                Show on Map
              </Button>
            </Grid>
          </Grid>

          {selectedLocation != null && (
            <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" fontWeight="bold" color="primary">
                Selected Coordinates: {selectedLocation.lat}, {selectedLocation.lng}
              </Typography>
              {localitySuggestion && (
                <Typography variant="body2" color="text.secondary">
                  Suggested Locality: <strong>{localitySuggestion}</strong>
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          startIcon={<LocationOnIcon />}
          disabled={selectedLocation == null}
        >
          Confirm Location
        </Button>
      </DialogActions>
    </Dialog>
  );
};
