import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navigation, Locate, Layers, Menu, Search, Clock, MapPin, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import PredictionCard from './PredictionCard';

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

  const fetchAndDisplayRoute = async (origin: string, destination: string) => {
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

      // Fetch route
      const routeRes = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${originCoords[0]},${originCoords[1]};${destCoords[0]},${destCoords[1]}?geometries=geojson&access_token=${token}`
      );
      const routeData = await routeRes.json();

      if (routeData.routes?.length) {
        const route = routeData.routes[0];
        setRouteCoordinates(route.geometry);

        // Remove existing route and markers
        if (map.current?.getSource('route')) {
          map.current.removeLayer('route');
          map.current.removeSource('route');
        }

        // Add route to map
        map.current?.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: route.geometry
          }
        });

        map.current?.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#3B82F6',
            'line-width': 5,
            'line-opacity': 0.8
          }
        });

        // Add origin marker
        new mapboxgl.Marker({ color: '#10B981' })
          .setLngLat(originCoords)
          .setPopup(new mapboxgl.Popup().setText(origin))
          .addTo(map.current!);

        // Add destination marker
        new mapboxgl.Marker({ color: '#EF4444' })
          .setLngLat(destCoords)
          .setPopup(new mapboxgl.Popup().setText(destination))
          .addTo(map.current!);

        // Fit map to route bounds
        const coordinates = route.geometry.coordinates;
        const bounds = coordinates.reduce((bounds: any, coord: any) => {
          return bounds.extend(coord);
        }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

        map.current?.fitBounds(bounds, {
          padding: 100
        });
      }
    } catch (error) {
      console.error('Route error:', error);
      toast({
        title: "Route Error",
        description: "Unable to display route",
        variant: "destructive",
      });
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
      // Fetch and display route
      await fetchAndDisplayRoute(searchOrigin, searchDestination);

      // Get AI prediction
      const { data, error } = await supabase.functions.invoke('traffic-prediction', {
        body: { 
          origin: searchOrigin, 
          destination: searchDestination,
          currentTraffic: 'moderate',
          weather: currentWeather
        }
      });

      if (error) throw error;
      
      setAiPrediction(data);
      toast({
        title: "AI Prediction Ready",
        description: data.analysis || "Route analysis complete",
      });
    } catch (error) {
      console.error('Prediction error:', error);
      toast({
        title: "Prediction Failed",
        description: "Unable to get AI prediction",
        variant: "destructive",
      });
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
      
      {/* Search Bar Overlay */}
      <div className="absolute top-4 left-4 right-4 z-10 max-w-md mx-auto">
        <Card className="p-2 backdrop-blur-sm bg-background/95 border shadow-lg">
          {!isRoutingMode ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsPanelOpen(!isPanelOpen)}>
                <Menu className="h-4 w-4" />
              </Button>
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search for places..." 
                  className="pl-10 border-0 focus-visible:ring-0"
                  onClick={toggleRouting}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={toggleRouting}>
                  ←
                </Button>
                <span className="text-sm font-medium">Directions</span>
              </div>
              <div className="space-y-2 pl-8">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  <Input 
                    placeholder="Choose starting point" 
                    value={searchOrigin}
                    onChange={(e) => setSearchOrigin(e.target.value)}
                    className="border-0 focus-visible:ring-0"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-destructive" />
                  <Input 
                    placeholder="Choose destination" 
                    value={searchDestination}
                    onChange={(e) => setSearchDestination(e.target.value)}
                    className="border-0 focus-visible:ring-0"
                  />
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Side Panel */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 z-20 w-80 bg-background border-r shadow-lg transition-transform duration-300",
        isPanelOpen && isRoutingMode ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Route Options</h3>
            <Button variant="ghost" size="sm" onClick={() => setIsPanelOpen(false)}>
              ×
            </Button>
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          {/* AI Prediction Button */}
          <Button 
            className="w-full" 
            onClick={getPrediction}
            disabled={isLoadingPrediction || !searchOrigin || !searchDestination}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {isLoadingPrediction ? 'Analyzing with AI...' : 'Get AI Prediction'}
          </Button>

          {/* AI Prediction Card */}
          {aiPrediction && (
            <PredictionCard 
              predictedDelay={aiPrediction.predictedDelay}
              confidence={aiPrediction.confidence}
              alternativeRoute={aiPrediction.alternativeRoute}
              lastUpdated="just now"
            />
          )}

          {/* Route Cards */}
          <Card className="p-3 cursor-pointer hover:bg-muted/50 border-primary">
            <div className="flex justify-between items-start mb-2">
              <Badge variant="default">Fastest</Badge>
              <span className="text-lg font-semibold text-primary">18 min</span>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Via Highway 101 North</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>8.2 km</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Moderate traffic
              </span>
            </div>
          </Card>

          <Card className="p-3 cursor-pointer hover:bg-muted/50">
            <div className="flex justify-between items-start mb-2">
              <Badge variant="secondary">Alternative</Badge>
              <span className="text-lg font-semibold">23 min</span>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Via Downtown Main St</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>7.1 km</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Heavy traffic
              </span>
            </div>
          </Card>

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