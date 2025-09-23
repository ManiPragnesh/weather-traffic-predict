import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Settings, BarChart3 } from "lucide-react";
import TrafficCard from "@/components/TrafficCard";
import WeatherCard from "@/components/WeatherCard";
import PredictionCard from "@/components/PredictionCard";
import TrafficMap from "@/components/TrafficMap";
import heroImage from "@/assets/traffic-hero.jpg";

const Index = () => {
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sample data - replace with real API calls
  const trafficData = [
    {
      location: "Highway 101 North",
      congestionLevel: "high" as const,
      delay: 15,
      volume: 8540,
      trend: "up" as const,
    },
    {
      location: "Downtown Main St",
      congestionLevel: "medium" as const,
      delay: 8,
      volume: 3200,
      trend: "stable" as const,
    },
    {
      location: "Airport Connector",
      congestionLevel: "low" as const,
      delay: 3,
      volume: 1850,
      trend: "down" as const,
    },
  ];

  const weatherData = {
    condition: "rain" as const,
    temperature: 22,
    humidity: 78,
    visibility: 4.2,
    impactLevel: "high" as const,
  };

  const predictionData = {
    predictedDelay: 18,
    confidence: 87,
    alternativeRoute: {
      name: "Riverside Route",
      savedTime: 12,
    },
    lastUpdated: "2 min ago",
  };

  const trafficPoints = [
    { id: "1", name: "Junction A", congestion: "high" as const, coordinates: [0, 0] as [number, number] },
    { id: "2", name: "Junction B", congestion: "medium" as const, coordinates: [0, 0] as [number, number] },
    { id: "3", name: "Junction C", congestion: "severe" as const, coordinates: [0, 0] as [number, number] },
    { id: "4", name: "Junction D", congestion: "low" as const, coordinates: [0, 0] as [number, number] },
    { id: "5", name: "Junction E", congestion: "medium" as const, coordinates: [0, 0] as [number, number] },
  ];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastUpdated(new Date());
      setIsRefreshing(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary to-primary/80">
        <img 
          src={heroImage}
          alt="Traffic management dashboard"
          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-20"
        />
        <div className="relative max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge className="mb-4 bg-white/20 text-white border-white/30" variant="outline">
              AI-Powered Traffic Intelligence
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
              Traffic Congestion
              <br />
              <span className="text-blue-200">Prediction System</span>
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Real-time traffic analysis with weather correlation using machine learning 
              to predict congestion levels and optimize route planning.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button 
                size="lg" 
                className="bg-white text-primary hover:bg-gray-100"
              >
                <BarChart3 className="mr-2 h-5 w-5" />
                View Analytics
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-white text-white hover:bg-white/10"
              >
                <Settings className="mr-2 h-5 w-5" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Live Dashboard</h2>
            <p className="text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
          <Button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Traffic Cards */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Traffic Conditions</h3>
            {trafficData.map((data, index) => (
              <TrafficCard key={index} {...data} />
            ))}
          </div>

          {/* Weather & Prediction */}
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-4">Weather Impact</h3>
              <WeatherCard {...weatherData} />
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-4">AI Predictions</h3>
              <PredictionCard {...predictionData} />
            </div>
          </div>

          {/* Traffic Map */}
          <div className="lg:col-span-1">
            <h3 className="font-semibold text-lg mb-4">Traffic Heatmap</h3>
            <TrafficMap 
              selectedRoute="Highway 101"
              trafficPoints={trafficPoints}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;