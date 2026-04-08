import { useCallback, useRef, useEffect, useState } from 'react'
// @ts-ignore - @react-google-maps/api types may not be available
import { GoogleMap, useJsApiLoader, Marker, Polyline } from '@react-google-maps/api'
import { motion } from 'framer-motion'
import { GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_LOADER_ID, getGoogleMapsApiKey } from '../lib/googleMapsLoader'
// Use direct public path which is more reliable in this setup
const getDeliveryIconUrl = () => '/assets/deliveryboy/deliveryIcon.png';

interface Location {
    lat: number
    lng: number
    name?: string
}

interface GoogleMapsTrackingProps {
    storeLocation?: Location
    sellerLocations?: Location[]
    customerLocation: Location
    deliveryLocation?: Location
    isTracking: boolean
    showRoute?: boolean // Whether to show actual route using Directions API
    routeOrigin?: Location // Origin for route (delivery partner location)
    routeDestination?: Location // Destination for route (seller shop or customer)
    routeWaypoints?: Location[] // Intermediate waypoints for the route
    destinationName?: string // Name of the destination for the overlay
    onRouteInfoUpdate?: (info: {
        distance: string;
        duration: string;
        durationValue: number; // raw seconds
        distanceValue: number; // raw meters
    } | null) => void
    lastUpdate?: Date | null // Last location update timestamp
}

const mapContainerStyle = {
    width: '100%',
    height: '22rem'
}

export default function GoogleMapsTracking({
    storeLocation,
    sellerLocations = [],
    customerLocation,
    deliveryLocation,
    isTracking,
    showRoute = false,
    routeOrigin,
    routeDestination,
    routeWaypoints = [],
    destinationName,
    onRouteInfoUpdate,
    lastUpdate
}: GoogleMapsTrackingProps) {
    const apiKey = getGoogleMapsApiKey()
    const mapRef = useRef<any>(null)
    const directionsServiceRef = useRef<any>(null)
    const directionsRendererRef = useRef<any>(null)
    const lastRouteCalcRef = useRef<{ time: number, origin: Location }>({ time: 0, origin: { lat: 0, lng: 0 } })
    const hasInitialBoundsFitted = useRef<boolean>(false)
    const [userHasInteracted, setUserHasInteracted] = useState<boolean>(false)
    const [isFullScreen, setIsFullScreen] = useState<boolean>(false)
    const [routeInfo, setRouteInfo] = useState<{
        distance: string;
        duration: string;
        durationValue: number;
        distanceValue: number;
    } | null>(null)
    const [routeError, setRouteError] = useState<string | null>(null)
    const [isGPSWeak, setIsGPSWeak] = useState<boolean>(false)
    const [isSimulating, setIsSimulating] = useState<boolean>(false)
    const [simulatedLocation, setSimulatedLocation] = useState<Location | undefined>(undefined)
    const simulationIntervalRef = useRef<any>(null)
    const lastDirectionsResultRef = useRef<any>(null)

    // Check for weak GPS signal (no updates for > 45 seconds)
    useEffect(() => {
        if (!lastUpdate) return;

        const checkGPS = () => {
            const now = new Date().getTime();
            const lastTime = new Date(lastUpdate).getTime();
            setIsGPSWeak(now - lastTime > 45000); // 45 seconds threshold
        };

        const interval = setInterval(checkGPS, 10000); // Check every 10 seconds
        checkGPS(); // Initial check

        return () => clearInterval(interval);
    }, [lastUpdate]);

    // Sync routeInfo with parent
    useEffect(() => {
        if (onRouteInfoUpdate) {
            onRouteInfoUpdate(routeInfo);
        }
    }, [routeInfo, onRouteInfoUpdate]);

    const { isLoaded, loadError } = useJsApiLoader({
        id: GOOGLE_MAPS_LOADER_ID,
        googleMapsApiKey: apiKey || '',
        libraries: GOOGLE_MAPS_LIBRARIES
    })

    // Combine storeLocation with sellerLocations
    const allSellers = storeLocation ? [storeLocation, ...sellerLocations] : sellerLocations;

    // Center will be updated dynamically based on deliveryLocation
    const currentDeliveryLocation = isSimulating ? simulatedLocation : deliveryLocation;

    const center = currentDeliveryLocation || (allSellers.length > 0 ? {
        lat: (allSellers[0].lat + customerLocation.lat) / 2,
        lng: (allSellers[0].lng + customerLocation.lng) / 2
    } : customerLocation)

    // Logical path for fallback polyline: Rider -> Next Waypoints -> Customer
    const path = currentDeliveryLocation 
        ? [currentDeliveryLocation, ...routeWaypoints, customerLocation]
        : [...allSellers, customerLocation];
    
    const filteredPath = path.filter(loc => loc && (loc.lat !== 0 || loc.lng !== 0))

    // Auto-center and fit bounds when location or route changes
    useEffect(() => {
        if (!isLoaded || !mapRef.current || userHasInteracted || !window.google?.maps) return;

        const bounds = new window.google.maps.LatLngBounds();
        let hasPoints = false;

        // Add delivery location (focus point)
        if (deliveryLocation) {
            bounds.extend(deliveryLocation);
            hasPoints = true;
        }

        // Add route points if visible
        if (showRoute && routeOrigin && routeDestination) {
            bounds.extend(routeOrigin);
            bounds.extend(routeDestination);
            routeWaypoints.forEach(wp => bounds.extend(wp));
            hasPoints = true;
        } else {
            // Add other locations if route not showing
            if (storeLocation) {
                bounds.extend(storeLocation);
                hasPoints = true;
            }
            sellerLocations.forEach(s => {
                bounds.extend(s);
                hasPoints = true;
            });
            bounds.extend(customerLocation);
            hasPoints = true;
        }

        if (hasPoints) {
            if (mapRef.current._setProgrammaticChange) {
                mapRef.current._setProgrammaticChange(true);
            }

            // If in full screen or only have delivery location, focus on delivery boy
            if (deliveryLocation && (isFullScreen || !showRoute)) {
                mapRef.current.panTo(deliveryLocation);
                if (!hasInitialBoundsFitted.current || isFullScreen) {
                    mapRef.current.setZoom(isFullScreen ? 17 : 15);
                    hasInitialBoundsFitted.current = true;
                }
            } else {
                // Fit to include everything (route + locations)
                mapRef.current.fitBounds(bounds, {
                    top: 50,
                    bottom: 50,
                    left: 50,
                    right: 50
                });
                hasInitialBoundsFitted.current = true;
            }

            if (mapRef.current._setProgrammaticChange) {
                setTimeout(() => mapRef.current._setProgrammaticChange(false), 500);
            }
        }
    }, [isLoaded, deliveryLocation, showRoute, routeOrigin, routeDestination, routeWaypoints, storeLocation, sellerLocations, customerLocation, userHasInteracted, isFullScreen]);

    const handleRecenter = () => {
        setUserHasInteracted(false);
        hasInitialBoundsFitted.current = false;
        if (mapRef.current) {
            if (deliveryLocation && (isFullScreen || !showRoute)) {
                mapRef.current.panTo(deliveryLocation);
                mapRef.current.setZoom(isFullScreen ? 17 : 15);
                hasInitialBoundsFitted.current = true;
            } else {
                const bounds = new window.google.maps.LatLngBounds();
                if (deliveryLocation) bounds.extend(deliveryLocation);
                if (showRoute && routeOrigin && routeDestination) {
                    bounds.extend(routeOrigin);
                    bounds.extend(routeDestination);
                    routeWaypoints.forEach(wp => bounds.extend(wp));
                } else {
                    if (storeLocation) bounds.extend(storeLocation);
                    sellerLocations.forEach(s => bounds.extend(s));
                    bounds.extend(customerLocation);
                }
                mapRef.current.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
                hasInitialBoundsFitted.current = true;
            }
        }
    };

    const toggleFullScreen = () => {
        setIsFullScreen(!isFullScreen);
        // Reset interaction/bounds to force re-fit in new size
        setUserHasInteracted(false);
        hasInitialBoundsFitted.current = false;
    };

    const onLoad = useCallback((map: any) => {
        mapRef.current = map

        // Track user interaction with the map (pan, zoom, drag)
        let isProgrammaticChange = false;

        const trackInteraction = () => {
            if (!isProgrammaticChange) {
                setUserHasInteracted(true);
            }
        };

        // Add event listeners to track user interaction
        map.addListener('dragstart', trackInteraction);
        map.addListener('zoom_changed', () => {
            if (!isProgrammaticChange) {
                setTimeout(() => {
                    if (!isProgrammaticChange) {
                        trackInteraction();
                    }
                }, 100);
            }
        });

        // Store the flag setter for use in route calculation
        map._setProgrammaticChange = (value: boolean) => {
            isProgrammaticChange = value;
        };
    }, [])

    // Calculate and display route using Google Directions Service
    const calculateAndDisplayRoute = useCallback((origin: Location, destination: Location, waypoints: Location[] = []) => {
        if (!isLoaded || !mapRef.current || !window.google?.maps) {
            console.log('⚠️ Cannot calculate route: map not loaded or not ready')
            return
        }

        // Validate origin and destination
        if (!origin || !destination || !origin.lat || !origin.lng || !destination.lat || !destination.lng) {
            console.log('⚠️ Cannot calculate route: invalid origin or destination', { origin, destination })
            return
        }

        // Optimization: Throttle route calculation (min 5 seconds between calls)
        // unless origin has moved significantly (> 50m)
        const now = Date.now()
        const lastCalc = lastRouteCalcRef.current
        const timeDiff = now - lastCalc.time

        if (timeDiff < 5000) {
            // Check if origin moved significantly
            const latDiff = Math.abs(origin.lat - lastCalc.origin.lat)
            const lngDiff = Math.abs(origin.lng - lastCalc.origin.lng)
            // Rough approximation: 0.0005 degrees is ~50m
            if (latDiff < 0.0005 && lngDiff < 0.0005) {
                return // Skip calculation
            }
        }

        lastRouteCalcRef.current = { time: now, origin: { ...origin } }

        // Initialize DirectionsService if not already initialized
        if (!directionsServiceRef.current) {
            directionsServiceRef.current = new window.google.maps.DirectionsService()
        }

        // Initialize or reuse DirectionsRenderer
        if (!directionsRendererRef.current) {
            directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
                map: mapRef.current,
                suppressMarkers: true, // We'll use custom markers
                preserveViewport: true, // Preserve viewport - we'll center manually
                polylineOptions: {
                    strokeColor: '#3b82f6',
                    strokeWeight: 6,
                    strokeOpacity: 0.9,
                },
            })
        } else {
            // Ensure preserveViewport is true so route updates don't change viewport
            directionsRendererRef.current.setOptions({ preserveViewport: true })
        }

        // Prepare waypoints
        const googleWaypoints = waypoints.map(wp => ({
            location: new window.google.maps.LatLng(wp.lat, wp.lng),
            stopover: true
        }));

        // Calculate route
        directionsServiceRef.current.route(
            {
                origin: origin,
                destination: destination,
                waypoints: googleWaypoints,
                travelMode: window.google.maps.TravelMode.DRIVING,
                drivingOptions: {
                    departureTime: new Date(),
                    trafficModel: 'bestguess'
                },
                optimizeWaypoints: true,
            },
            (result: any, status: any) => {
                if (status === 'OK' && result.routes && result.routes[0]) {
                    setRouteError(null)
                    lastDirectionsResultRef.current = result
                    // Extract route information
                    const route = result.routes[0]
                    if (route.legs && route.legs.length > 0) {
                        let totalDistance = 0
                        let totalDurationSeconds = 0

                        route.legs.forEach((leg: any) => {
                            totalDistance += leg.distance?.value || 0
                            totalDurationSeconds += leg.duration?.value || 0
                        })

                        // Add 2-minute buffer (120 seconds) as requested
                        totalDurationSeconds += 120

                        const formatDuration = (seconds: number) => {
                            if (seconds < 60) return `${Math.ceil(seconds)} sec`
                            const mins = Math.ceil(seconds / 60)
                            if (mins < 60) return `${mins} mins`
                            const hours = Math.floor(mins / 60)
                            const remainingMins = mins % 60
                            return `${hours}h ${remainingMins}m`
                        }

                        const formatDistance = (meters: number) => {
                            if (meters < 1000) return `${meters}m`
                            return `${(meters / 1000).toFixed(1)} km`
                        }

                        setRouteInfo({
                            distance: formatDistance(totalDistance),
                            duration: formatDuration(totalDurationSeconds),
                            durationValue: totalDurationSeconds,
                            distanceValue: totalDistance,
                        })
                    }

                    directionsRendererRef.current.setDirections(result);
                } else {
                    console.error('❌ Directions request failed:', status, { origin, destination })
                    setRouteInfo(null)

                    // Fallback to straight line if route fails
                    if (status === 'ZERO_RESULTS') {
                        setRouteError('No road route found. Showing straight line.')
                    } else if (status === 'OVER_QUERY_LIMIT') {
                        setRouteError('Map service busy. Showing straight line.')
                    } else {
                        setRouteError('Navigation error. Showing straight line.')
                    }
                }
            }
        )
    }, [isLoaded])

    // Handle route calculation when routeOrigin and routeDestination are provided
    useEffect(() => {
        if (showRoute && routeOrigin && routeDestination && isLoaded && mapRef.current) {
            // Recalculate route when origin, destination or waypoints change
            calculateAndDisplayRoute(routeOrigin, routeDestination, routeWaypoints)
        } else if (!showRoute && directionsRendererRef.current) {
            // Clear route if showRoute is false
            directionsRendererRef.current.setMap(null)
            directionsRendererRef.current = null
            lastDirectionsResultRef.current = null
            setRouteInfo(null)
        }
    }, [showRoute, routeOrigin, routeDestination, routeWaypoints, isLoaded, calculateAndDisplayRoute])

    // Interpolation State
    const [animatedDeliveryLocation, setAnimatedDeliveryLocation] = useState<Location | undefined>(deliveryLocation);
    const [heading, setHeading] = useState<number>(0);
    const animationRef = useRef<number>();
    const lastDeliveryLocationRef = useRef<Location | undefined>(deliveryLocation);

    // Bearing between two points (in degrees)
    const calculateBearing = (start: Location, end: Location) => {
        if (window.google?.maps?.geometry?.spherical) {
            return window.google.maps.geometry.spherical.computeHeading(
                new window.google.maps.LatLng(start.lat, start.lng),
                new window.google.maps.LatLng(end.lat, end.lng)
            );
        }
        
        // Fallback mathematical formula
        const lat1 = (start.lat * Math.PI) / 180;
        const lat2 = (end.lat * Math.PI) / 180;
        const lng1 = (start.lng * Math.PI) / 180;
        const lng2 = (end.lng * Math.PI) / 180;

        const y = Math.sin(lng2 - lng1) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1);
        const brng = (Math.atan2(y, x) * 180) / Math.PI;
        return (brng + 360) % 360;
    };

    // Center is only for initial load, we use panTo/fitBounds for updates
    const [initialCenter] = useState(center);

    // Animation Logic
    const activeLocation = isSimulating ? simulatedLocation : deliveryLocation;
    
    useEffect(() => {
        if (!activeLocation) return;

        // If no previous location, snap to current (initial load)
        if (!lastDeliveryLocationRef.current) {
            setAnimatedDeliveryLocation(activeLocation);
            lastDeliveryLocationRef.current = activeLocation;
            return;
        }

        // If location hasn't changed (deep check), do nothing
        if (activeLocation.lat === lastDeliveryLocationRef.current.lat &&
            activeLocation.lng === lastDeliveryLocationRef.current.lng) {
            return;
        }

        const startLocation = animatedDeliveryLocation || lastDeliveryLocationRef.current;
        const targetLocation = activeLocation;

        // Calculate heading for rotation
        const newHeading = calculateBearing(startLocation, targetLocation);
        if (Math.abs(newHeading) > 0.1) {
            setHeading(newHeading);
        }

        const startTime = performance.now();
        const duration = 3800; // Slightly less than 4s interval to ensure completion

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Use easeInOutQuad for smooth tracking movement
            const ease = progress < 0.5 
                ? 2 * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            const lat = startLocation.lat + (targetLocation.lat - startLocation.lat) * ease;
            const lng = startLocation.lng + (targetLocation.lng - startLocation.lng) * ease;
            
            const newPos = { lat, lng };
            setAnimatedDeliveryLocation(newPos);

            // Smoothly pan map WITH the marker
            if (mapRef.current && !userHasInteracted) {
                mapRef.current.panTo(newPos);
            }

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            } else {
                lastDeliveryLocationRef.current = targetLocation;
            }
        };

        cancelAnimationFrame(animationRef.current!);
        animationRef.current = requestAnimationFrame(animate);

        // Update ref for next comparison
        lastDeliveryLocationRef.current = activeLocation;

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [activeLocation]);

    // Simulation Logic
    const toggleSimulation = () => {
        if (isSimulating) {
            clearSimulation();
            return;
        }

        // Create a path for simulation
        let simulationPath: Location[] = [];

        // If we have a road route, follow it precisely
        if (lastDirectionsResultRef.current?.routes?.[0]?.overview_path) {
            simulationPath = lastDirectionsResultRef.current.routes[0].overview_path.map((p: any) => ({
                lat: p.lat(),
                lng: p.lng()
            }));
        } else {
            // Fallback to waypoints
            simulationPath = [
                deliveryLocation || routeOrigin || allSellers[0] || { lat: 21.1702, lng: 72.8311 },
                ...routeWaypoints,
                customerLocation
            ].filter(Boolean) as Location[];
        }

        if (simulationPath.length < 2) return;

        setIsSimulating(true);
        let currentStep = 0;
        
        // Detailed path needs faster updates or fewer steps
        const delay = lastDirectionsResultRef.current ? 1000 : 4000;

        simulationIntervalRef.current = setInterval(() => {
            if (currentStep >= simulationPath.length) {
                clearSimulation();
                return;
            }

            setSimulatedLocation(simulationPath[currentStep]);
            currentStep++;
        }, delay);
    };

    const clearSimulation = () => {
        setIsSimulating(false);
        setSimulatedLocation(undefined);
        if (simulationIntervalRef.current) {
            clearInterval(simulationIntervalRef.current);
            simulationIntervalRef.current = null;
        }
    };

    useEffect(() => {
        return () => clearSimulation();
    }, []);


    const containerClasses = isFullScreen
        ? "fixed inset-0 z-[100] bg-white w-screen h-screen flex flex-col"
        : "relative mx-4 mt-4 rounded-lg overflow-hidden shadow-sm";

    if (loadError) {
        return (
            <div className={containerClasses + " bg-red-50 border border-red-200 p-4 text-center"}>
                <p className="text-red-800 text-sm">❌ Failed to load Google Maps</p>
            </div>
        )
    }

    if (!isLoaded) {
        return (
            <div className={containerClasses + " bg-gray-100 p-8 text-center"}>
                <div className="animate-spin text-2xl">🗺️</div>
                <p className="text-gray-600 text-sm mt-2">Loading map...</p>
            </div>
        )
    }

    if (!apiKey) {
        return (
            <div className={containerClasses + " bg-yellow-50 border border-yellow-200 p-4 text-center"}>
                <p className="text-yellow-800 text-sm">⚠️ Google Maps API key not configured</p>
            </div>
        )
    }

    return (
        <div className={containerClasses}>
            {/* Map UI Overlays */}
            <div className={`absolute ${isFullScreen ? 'left-6 top-6' : 'left-3 top-3'} flex flex-col gap-2 z-10`}>
                {isTracking && (
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-white bg-black/70 px-2 py-1 rounded text-sm font-medium">Live</span>
                    </div>
                )}

                {isGPSWeak && isTracking && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-red-600 text-white px-3 py-1.5 rounded-md text-xs font-semibold shadow-lg flex items-center gap-2"
                    >
                        <span className="animate-pulse">⚠️</span>
                        GPS Signal Weak
                    </motion.div>
                )}

                {routeInfo && isFullScreen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-3 rounded-lg shadow-xl border border-gray-100 min-w-[150px]"
                    >
                        <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Estimated Arrival</div>
                        <div className="flex items-end gap-2">
                            <span className="text-xl font-bold text-gray-900">{routeInfo.duration}</span>
                            <span className="text-sm text-gray-500 mb-0.5">({routeInfo.distance})</span>
                        </div>
                        {destinationName && (
                            <div className="text-xs text-blue-600 mt-1 font-medium truncate">
                                to {destinationName}
                            </div>
                        )}
                    </motion.div>
                )}
            </div>

            <div className={`absolute ${isFullScreen ? 'right-6 top-6' : 'right-3 top-3'} flex flex-col gap-2 z-10`}>
                <button
                    onClick={toggleFullScreen}
                    className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
                    title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                >
                    {isFullScreen ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" /></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                    )}
                </button>
                <button
                    onClick={handleRecenter}
                    className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
                    title="Recenter"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M3 12h3m12 0h3M12 3v3m0 12v3" /></svg>
                </button>

                {import.meta.env.DEV && (
                    <button
                        onClick={toggleSimulation}
                        className={`p-2 rounded-full shadow-md transition-colors ${isSimulating ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                        title={isSimulating ? "Stop Simulation" : "Simulate Trace"}
                    >
                        <span className="text-lg">🧪</span>
                    </button>
                )}
            </div>

            {routeError && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-full text-xs font-medium shadow-lg flex items-center gap-2">
                        <span>⚠️</span>
                        {routeError}
                    </div>
                </div>
            )}

            {/* Warning when customer location is missing */}
            {isTracking && (!customerLocation || customerLocation.lat === 0) && (
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 w-max max-w-[90%]">
                    <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-lg text-xs font-medium shadow-lg flex flex-col items-center gap-1 text-center">
                        <div className="flex items-center gap-2">
                            <span>📍</span>
                            <span className="font-bold">Location Unavailable</span>
                        </div>
                        <span>Customer hasn't pinned their location.</span>
                        <span className="text-orange-600/80 text-[10px]">Please rely on the written address.</span>
                    </div>
                </div>
            )}

            <GoogleMap
                mapContainerStyle={isFullScreen ? { width: '100%', height: '100%' } : mapContainerStyle}
                center={initialCenter}
                zoom={13}
                onLoad={onLoad}
                options={{
                    zoomControl: false,
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: false,
                    disableDefaultUI: true,
                    mapId: '4504f8b37365c3d0', // Required for AdvancedMarkerElement
                }}
            >
                {/* Customer Marker */}
                {customerLocation && (customerLocation.lat !== 0 || customerLocation.lng !== 0) && (
                    <AdvancedMarker
                        map={mapRef.current}
                        position={customerLocation}
                        title="Delivery Address"
                        content={
                            <div style={{ fontSize: '30px' }}>📍</div>
                        }
                    />
                )}

                {/* Seller Markers */}
                {allSellers.map((seller, index) => (
                    <AdvancedMarker
                        key={`seller-${index}`}
                        map={mapRef.current}
                        position={seller}
                        title={seller.name || "Seller Shop"}
                        content={
                            showRoute && routeDestination?.lat === seller.lat ? (
                                <div style={{ 
                                    width: '20px', 
                                    height: '20px', 
                                    backgroundColor: '#ef4444', 
                                    borderRadius: '50%', 
                                    border: '3px solid white',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                }} />
                            ) : (
                                <div style={{ fontSize: '30px' }}>🏪</div>
                            )
                        }
                    />
                ))}

                {/* Delivery Partner Marker (Animated & Rotated) */}
                {animatedDeliveryLocation && (
                    <AdvancedMarker
                        map={mapRef.current}
                        position={animatedDeliveryLocation}
                        title="Delivery Partner"
                        rotation={heading}
                        content={
                            <div style={{ 
                                width: '60px', 
                                height: '60px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                backgroundColor: 'white',
                                borderRadius: '50%',
                                border: '2px solid #16a34a',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                overflow: 'hidden'
                            }}>
                                <img 
                                    src={getDeliveryIconUrl()} 
                                    alt="Rider"
                                    style={{ width: '40px', height: '40px', margin: 'auto' }}
                                />
                            </div>
                        }
                    />
                )}
                {(!showRoute || routeError) && (
                    <Polyline
                        path={filteredPath}
                        options={{
                            strokeColor: routeError ? '#ef4444' : '#16a34a',
                            strokeOpacity: 0.7,
                            strokeWeight: 4,
                            geodesic: true,
                        }}
                    />
                )}
            </GoogleMap>
        </div>
    )
}

/**
 * Custom Advanced Marker component that uses the modern google.maps.marker.AdvancedMarkerElement
 */
function AdvancedMarker({ map, position, title, content, rotation = 0 }: { 
    map: any, 
    position: Location, 
    title?: string, 
    content: React.ReactNode,
    rotation?: number
}) {
    const markerRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        if (!map || !window.google?.maps?.marker?.AdvancedMarkerElement || !position) return;

        // Create container for the React content
        const container = document.createElement('div');
        containerRef.current = container;
        
        markerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
            map,
            position: { lat: position.lat, lng: position.lng },
            title,
            content: container,
        });

        setIsMounted(true);

        return () => {
            if (markerRef.current) {
                markerRef.current.map = null;
                markerRef.current = null;
            }
        };
    }, [map]);

    // Update position and rotation smoothly
    useEffect(() => {
        if (markerRef.current && position) {
            markerRef.current.position = { lat: position.lat, lng: position.lng };
        }
    }, [position.lat, position.lng]);

    // Apply rotation separately via CSS to avoid marker re-renders
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.style.transition = 'transform 0.1s linear';
            containerRef.current.style.transform = `rotate(${rotation}deg)`;
        }
    }, [rotation]);

    // Import and use createPortal for rendering React content into the DOM element
    const [Portal, setPortal] = useState<any>(null);
    useEffect(() => {
        import('react-dom').then((mod) => setPortal(() => mod.createPortal));
    }, []);

    if (!isMounted || !containerRef.current || !Portal) return null;

    return Portal(content, containerRef.current);
}

