import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navigation, Locate, Layers, Menu, Search, Clock, MapPin, Sparkles } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MapViewProps {
  mapboxToken?: string;
}

const MapView = ({ mapboxToken }: MapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [searchOrigin, setSearchOrigin] = useState('');
  const [searchDestination, setSearchDestination] = useState('');
  const [isRoutingMode, setIsRoutingMode] = useState(false);
  const [isLoadingPrediction, setIsLoadingPrediction] = useState(false);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [aiPrediction, setAiPrediction] = useState<any>(null);
  const [weatherPrediction, setWeatherPrediction] = useState<any>(null);
  const [token, setToken] = useState(() => localStorage.getItem('mapbox_token') || '');
  const [showTokenInput, setShowTokenInput] = useState(!token);
  const [routeCoordinates, setRouteCoordinates] = useState<any>(null);
  const [alternativeRoute, setAlternativeRoute] = useState<any>(null);
  const [selectedRoute, setSelectedRoute] = useState<'main' | 'alternative'>('main');
  const { toast } = useToast();
  const [currentWeather, setCurrentWeather] = useState({
    temp: 22,
    condition: 'Rain',
    humidity: 78,
    visibility: 4.2
  });

  // Sample traffic data
  const trafficPoints = [
    { id: 1, coords: [-122.4194, 37.7749], congestion: 'high', name: 'Downtown SF' },
    { id: 2, coords: [-122.4094, 37.7849], congestion: 'medium', name: 'Mission Bay' },
    { id: 3, coords: [-122.3994, 37.7949], congestion: 'low', name: 'SOMA District' },
  ];

  const handleSaveToken = () => {
    if (token) {
      localStorage.setItem('mapbox_token', token);
      setShowTokenInput(false);
      window.location.reload(); // Reload to initialize map with token
    }
  };

  useEffect(() => {
    if (!mapContainer.current || !token) return;

    // Initialize map
    mapboxgl.accessToken = token;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-122.4194, 37.7749], // San Francisco
      zoom: 12,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [
            position.coords.longitude,
            position.coords.latitude
          ];
          setUserLocation(coords);
          
          // Add user location marker
          new mapboxgl.Marker({ color: '#3B82F6' })
            .setLngLat(coords)
            .addTo(map.current!);
          
          // Center map on user location
          map.current?.setCenter(coords);
        },
        (error) => {
          console.log('Location access denied:', error);
        }
      );
    }

    // Add traffic points
    map.current.on('load', () => {
      trafficPoints.forEach((point) => {
        const color = point.congestion === 'high' ? '#EF4444' : 
                     point.congestion === 'medium' ? '#F59E0B' : '#10B981';
        
        new mapboxgl.Marker({ color })
          .setLngLat(point.coords as [number, number])
          .setPopup(new mapboxgl.Popup().setText(`${point.name} - ${point.congestion} traffic`))
          .addTo(map.current!);
      });
    });

    return () => {
      map.current?.remove();
    };
  }, [token]);

  const handleCurrentLocation = () => {
    if (userLocation && map.current) {
      map.current.flyTo({ center: userLocation, zoom: 15 });
    }
  };

  const toggleRouting = () => {
    setIsRoutingMode(!isRoutingMode);
    if (!isRoutingMode) {
      setIsPanelOpen(true);
    }
  };

  const getWeatherPrediction = async () => {
    setIsLoadingWeather(true);
    try {
      const { data, error } = await supabase.functions.invoke('weather-prediction', {
        body: { 
          lat: userLocation?.[1] || 37.7749,
          lon: userLocation?.[0] || -122.4194
        }
      });

      if (error) throw error;
      
      setWeatherPrediction(data);
      setCurrentWeather({
        temp: data.current.temp,
        condition: data.current.condition,
        humidity: data.current.humidity,
        visibility: data.current.visibility
      });
      
      toast({
        title: "Weather Prediction Ready",
        description: data.analysis || "Weather analysis complete",
      });
    } catch (error) {
      console.error('Weather prediction error:', error);
      toast({
        title: "Weather Prediction Failed",
        description: "Unable to get weather prediction",
        variant: "destructive",
      });
    } finally {
      setIsLoadingWeather(false);
    }
  };

  const fetchAndDisplayRoute = async (origin: string, destination: string, showAlternative: boolean = false) => {
    try {
      // Geocode origin and destination
      const originRes = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(origin)}.json?access_token=${token}`
      );
      const originData = await originRes.json();
      
      const destRes = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(destination)}.json?access_token=${token}`
      );
      const destData = await destRes.json();

      if (!originData.features?.length || !destData.features?.length) {
        throw new Error('Location not found');
      }

      const originCoords = originData.features[0].center;
      const destCoords = destData.features[0].center;

      // Fetch route with alternatives
      const routeRes = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${originCoords[0]},${originCoords[1]};${destCoords[0]},${destCoords[1]}?alternatives=true&geometries=geojson&access_token=${token}`
      );
      const routeData = await routeRes.json();

      if (routeData.code !== 'Ok') {
        throw new Error(routeData.message || 'Route not found');
      }

      if (routeData.routes?.length) {
        const route = routeData.routes[0];
        const altRoute = routeData.routes[1];
        
        setRouteCoordinates(route);
        if (altRoute) {
          setAlternativeRoute(altRoute);
        }

        // Wait for map to be ready
        if (!map.current) return;

        // Remove existing routes
        ['route', 'route-outline', 'alternative-route', 'alternative-route-outline'].forEach(layer => {
          if (map.current?.getLayer(layer)) {
            map.current.removeLayer(layer);
          }
        });
        ['route', 'alternative-route'].forEach(source => {
          if (map.current?.getSource(source)) {
            map.current.removeSource(source);
          }
        });

        // Add main route
        map.current.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: route.geometry
          }
        });

        map.current.addLayer({
          id: 'route-outline',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#1e3a8a',
            'line-width': 8,
            'line-opacity': 0.4
          }
        });

        map.current.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#3B82F6',
            'line-width': 6,
            'line-opacity': selectedRoute === 'main' ? 1 : 0.4
          }
        });

        // Add alternative route if available
        if (altRoute && showAlternative) {
          map.current.addSource('alternative-route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: altRoute.geometry
            }
          });

          map.current.addLayer({
            id: 'alternative-route-outline',
            type: 'line',
            source: 'alternative-route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#64748b',
              'line-width': 8,
              'line-opacity': 0.3
            }
          });

          map.current.addLayer({
            id: 'alternative-route',
            type: 'line',
            source: 'alternative-route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#94a3b8',
              'line-width': 6,
              'line-opacity': selectedRoute === 'alternative' ? 1 : 0.5,
              'line-dasharray': [2, 2]
            }
          });
        }

        // Add origin marker
        new mapboxgl.Marker({ color: '#10B981', scale: 1.2 })
          .setLngLat(originCoords)
          .setPopup(new mapboxgl.Popup().setHTML(`<strong>Origin</strong><br/>${origin}`))
          .addTo(map.current);

        // Add destination marker
        new mapboxgl.Marker({ color: '#EF4444', scale: 1.2 })
          .setLngLat(destCoords)
          .setPopup(new mapboxgl.Popup().setHTML(`<strong>Destination</strong><br/>${destination}`))
          .addTo(map.current);

        // Fit map to route bounds with animation
        const coordinates = route.geometry.coordinates;
        const bounds = coordinates.reduce((bounds: any, coord: any) => {
          return bounds.extend(coord);
        }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

        map.current.fitBounds(bounds, {
          padding: { top: 100, bottom: 100, left: 400, right: 100 },
          duration: 1500
        });

        toast({
          title: "Route Found!",
          description: altRoute 
            ? `Main: ${Math.round(route.duration / 60)} min | Alternative: ${Math.round(altRoute.duration / 60)} min`
            : `Distance: ${(route.distance / 1000).toFixed(1)} km, Duration: ${Math.round(route.duration / 60)} min`,
        });
      }
    } catch (error) {
      console.error('Route error:', error);
      toast({
        title: "Route Error",
        description: error instanceof Error ? error.message : "Unable to display route",
        variant: "destructive",
      });
    }
  };

  const handleRouteSelect = (routeType: 'main' | 'alternative') => {
    setSelectedRoute(routeType);
    if (map.current) {
      // Update route opacity
      map.current.setPaintProperty('route', 'line-opacity', routeType === 'main' ? 1 : 0.4);
      if (map.current.getLayer('alternative-route')) {
        map.current.setPaintProperty('alternative-route', 'line-opacity', routeType === 'alternative' ? 1 : 0.5);
      }
    }
  };

  const getPrediction = async () => {
    if (!searchOrigin || !searchDestination) {
      toast({
        title: "Missing Information",
        description: "Please enter both origin and destination",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingPrediction(true);
    try {
      await fetchAndDisplayRoute(searchOrigin, searchDestination, true);
    } catch (error) {
      console.error('Route error:', error);
    } finally {
      setIsLoadingPrediction(false);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Map Container */}
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Mapbox Token Input */}
      {showTokenInput && (
        <Card className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 p-6 w-96">
          <h3 className="text-lg font-semibold mb-4">Enter Mapbox Token</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Get your free token from{' '}
            <a href="https://mapbox.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              mapbox.com
            </a>
          </p>
          <Input
            placeholder="pk.ey..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="mb-4"
          />
          <Button onClick={handleSaveToken} className="w-full">
            Save & Load Map
          </Button>
        </Card>
      )}
      
      {/* Search Bar - From/To */}
      <div className="absolute top-4 left-4 right-4 z-10 max-w-md mx-auto">
        <Card className="p-4 backdrop-blur-sm bg-background/95 border shadow-lg">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary flex-shrink-0"></div>
              <Input 
                placeholder="From" 
                value={searchOrigin}
                onChange={(e) => setSearchOrigin(e.target.value)}
                className="border-0 focus-visible:ring-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-destructive flex-shrink-0" />
              <Input 
                placeholder="To" 
                value={searchDestination}
                onChange={(e) => setSearchDestination(e.target.value)}
                className="border-0 focus-visible:ring-1"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Side Panel */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 z-20 w-80 bg-background border-r shadow-lg transition-transform duration-300 flex flex-col",
        searchOrigin && searchDestination ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Route Details</h3>
            <Button variant="ghost" size="sm" onClick={() => {
              setSearchOrigin('');
              setSearchDestination('');
            }}>
              ×
            </Button>
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
          {/* Find Routes Button */}
          <Button 
            className="w-full" 
            onClick={getPrediction}
            disabled={isLoadingPrediction || !searchOrigin || !searchDestination}
          >
            <Navigation className="h-4 w-4 mr-2" />
            {isLoadingPrediction ? 'Finding Routes...' : 'Find Routes'}
          </Button>

          {/* Route Cards */}
          {routeCoordinates && (
            <Card 
              className={cn(
                "p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                selectedRoute === 'main' && "border-primary border-2"
              )}
              onClick={() => handleRouteSelect('main')}
            >
              <div className="flex justify-between items-start mb-2">
                <Badge variant="default">Main Route</Badge>
                <span className="text-lg font-semibold text-primary">
                  {Math.round(routeCoordinates.duration / 60)} min
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-1">Recommended</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{(routeCoordinates.distance / 1000).toFixed(1)} km</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Fastest route
                </span>
              </div>
            </Card>
          )}

          {alternativeRoute && (
            <Card 
              className={cn(
                "p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                selectedRoute === 'alternative' && "border-primary border-2"
              )}
              onClick={() => handleRouteSelect('alternative')}
            >
              <div className="flex justify-between items-start mb-2">
                <Badge variant="secondary">Alternative Route</Badge>
                <span className="text-lg font-semibold">
                  {Math.round(alternativeRoute.duration / 60)} min
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-1">Avoid traffic</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{(alternativeRoute.distance / 1000).toFixed(1)} km</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {Math.round((alternativeRoute.duration - routeCoordinates.duration) / 60)} min longer
                </span>
              </div>
            </Card>
          )}

          {/* Weather Impact */}
          <Card className="p-3 bg-blue-50 dark:bg-blue-950">
            <h4 className="font-medium text-sm mb-2">Weather Impact</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Condition:</span>
                <span>{currentWeather.condition}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Temperature:</span>
                <span>{currentWeather.temp}°C</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Visibility:</span>
                <span>{currentWeather.visibility} km</span>
              </div>
            </div>
            <Badge variant="destructive" className="mt-2 text-xs">
              +5 min delay expected
            </Badge>
          </Card>
        </div>
        </ScrollArea>
      </div>

      {/* Floating Action Buttons */}
      <div className="absolute bottom-6 right-6 z-10 space-y-2">
        <Button
          size="sm"
          variant="secondary"
          className="w-12 h-12 rounded-full shadow-lg"
          onClick={handleCurrentLocation}
        >
          <Locate className="h-4 w-4" />
        </Button>
        <Button
          size="sm" 
          variant="secondary"
          className="w-12 h-12 rounded-full shadow-lg"
        >
          <Layers className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          className="w-12 h-12 rounded-full shadow-lg"
          onClick={toggleRouting}
        >
          <Navigation className="h-4 w-4" />
        </Button>
      </div>

      {/* Weather Overlay - Top Right */}
      <Card className="absolute top-4 right-4 z-10 backdrop-blur-sm bg-background/95 max-w-xs">
        <div className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-right">
              <div className="text-lg font-semibold">{currentWeather.temp}°C</div>
              <div className="text-xs text-muted-foreground">{currentWeather.condition}</div>
            </div>
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              🌧️
            </div>
          </div>
          
          <Button 
            size="sm" 
            variant="outline" 
            className="w-full"
            onClick={getWeatherPrediction}
            disabled={isLoadingWeather}
          >
            <Sparkles className="h-3 w-3 mr-2" />
            {isLoadingWeather ? 'Analyzing...' : 'AI Weather Forecast'}
          </Button>

          {weatherPrediction && (
            <div className="space-y-2 pt-2 border-t">
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Humidity:</span>
                  <span>{weatherPrediction.current.humidity}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Visibility:</span>
                  <span>{weatherPrediction.current.visibility} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Wind:</span>
                  <span>{weatherPrediction.current.windSpeed} m/s</span>
                </div>
              </div>
              
              {weatherPrediction.trafficImpact && (
                <Badge 
                  variant={weatherPrediction.trafficImpact.severity === 'high' ? 'destructive' : 'secondary'}
                  className="w-full justify-center text-xs"
                >
                  Traffic Impact: +{weatherPrediction.trafficImpact.expectedDelay} min
                </Badge>
              )}
              
              <p className="text-xs text-muted-foreground italic">
                {weatherPrediction.trafficImpact?.advice}
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default MapView;