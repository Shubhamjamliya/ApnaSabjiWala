import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_LOADER_ID, getGoogleMapsApiKey } from '../lib/googleMapsLoader';

interface LocationPickerMapProps {
  initialLat: number;
  initialLng: number;
  onLocationSelect: (lat: number, lng: number) => void;
  onAddressSelect?: (address: string, components?: { city?: string; state?: string }) => void;
  height?: string;
}

const containerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 22.7196, // Default to Indore center if nothing provided
  lng: 75.8577,
};

export default function LocationPickerMap({
  initialLat,
  initialLng,
  onLocationSelect,
  onAddressSelect,
  height = "300px"
}: LocationPickerMapProps) {
  const { isLoaded } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: getGoogleMapsApiKey(),
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [center, setCenter] = useState(defaultCenter);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  // Update center when props change
  useEffect(() => {
    if (initialLat && initialLng) {
      setCenter({ lat: initialLat, lng: initialLng });
    }
  }, [initialLat, initialLng]);

  // Memoize options
  const mapOptions = useMemo(() => ({
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: true,
    draggable: true,
    gestureHandling: "greedy",
  }), []);

  const onLoad = useCallback(function callback(map: google.maps.Map) {
    setMap(map);
    geocoderRef.current = new google.maps.Geocoder();
  }, []);

  const onUnmount = useCallback(function callback(map: google.maps.Map) {
    setMap(null);
  }, []);

  const onIdle = useCallback(() => {
    if (map) {
      const newCenter = map.getCenter();
      if (newCenter) {
        const lat = parseFloat(newCenter.lat().toFixed(6));
        const lng = parseFloat(newCenter.lng().toFixed(6));
        
        // Only trigger updates if the location actually changed significantly
        // to avoid infinite loops or jitter
        onLocationSelect(lat, lng);

        // Reverse Geocode to get address
        if (onAddressSelect && geocoderRef.current) {
          geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              const address = results[0].formatted_address;
              
              let city = '';
              let state = '';
              
              for (const component of results[0].address_components) {
                if (component.types.includes('locality')) {
                  city = component.long_name;
                } else if (component.types.includes('administrative_area_level_3') && !city) {
                  city = component.long_name;
                } else if (component.types.includes('administrative_area_level_1')) {
                  state = component.long_name;
                }
              }
              
              onAddressSelect(address, { city, state });
            }
          });
        }
      }
    }
  }, [map, onLocationSelect, onAddressSelect]);

  if (!isLoaded) {
    return (
      <div
        className="w-full bg-neutral-100 animate-pulse rounded-lg border border-neutral-300"
        style={{ height }}
      >
        <div className="flex items-center justify-center h-full text-neutral-400 text-sm">
          Loading Map...
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-lg overflow-hidden border border-neutral-300 shadow-sm" style={{ height }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={17}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onIdle={onIdle}
        options={mapOptions}
      >
      </GoogleMap>

      <div
        className="absolute top-1/2 left-1/2 z-10 pointer-events-none"
        style={{ transform: 'translate(-50%, -100%)' }}
      >
        <img
          src="https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi2.png"
          alt="Center Location"
          className="w-[27px] h-[43px]"
          style={{ filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.3))' }}
        />
      </div>
    </div>
  );
}
