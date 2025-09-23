import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Map, Navigation } from "lucide-react";

interface TrafficMapProps {
  selectedRoute?: string;
  trafficPoints: Array<{
    id: string;
    name: string;
    congestion: "low" | "medium" | "high" | "severe";
    coordinates: [number, number];
  }>;
}

export default function TrafficMap({ selectedRoute, trafficPoints }: TrafficMapProps) {
  const getCongestionColor = (level: string) => {
    switch (level) {
      case "low": return "bg-traffic-low";
      case "medium": return "bg-traffic-medium";
      case "high": return "bg-traffic-high";
      case "severe": return "bg-traffic-severe";
      default: return "bg-gray-400";
    }
  };
  
  return (
    <Card className="col-span-full hover:shadow-lg transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Map className="h-5 w-5 text-primary" />
          <span>Traffic Heatmap</span>
          {selectedRoute && (
            <Badge variant="secondary" className="ml-auto">
              <Navigation className="h-3 w-3 mr-1" />
              {selectedRoute}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg h-64 overflow-hidden">
          {/* Simulated map background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-white to-gray-100 opacity-60" />
          
          {/* Road network simulation */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 256">
            <defs>
              <pattern id="roadPattern" patternUnits="userSpaceOnUse" width="4" height="4">
                <rect width="4" height="4" fill="white" />
                <rect width="2" height="4" fill="#e5e7eb" />
              </pattern>
            </defs>
            
            {/* Main highway */}
            <path 
              d="M0,128 Q100,120 200,128 T400,128" 
              stroke="url(#roadPattern)" 
              strokeWidth="8" 
              fill="none"
            />
            
            {/* Secondary roads */}
            <path 
              d="M50,50 Q150,60 250,50 T350,60" 
              stroke="url(#roadPattern)" 
              strokeWidth="6" 
              fill="none"
            />
            <path 
              d="M40,200 Q140,190 240,200 T360,190" 
              stroke="url(#roadPattern)" 
              strokeWidth="6" 
              fill="none"
            />
          </svg>
          
          {/* Traffic points */}
          {trafficPoints.map((point, index) => (
            <div
              key={point.id}
              className={`absolute w-3 h-3 rounded-full ${getCongestionColor(point.congestion)} 
                        border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2
                        hover:scale-125 transition-transform cursor-pointer`}
              style={{
                left: `${20 + index * 15 + Math.sin(index) * 20}%`,
                top: `${40 + index * 8 + Math.cos(index) * 15}%`,
              }}
              title={`${point.name}: ${point.congestion} traffic`}
            />
          ))}
        </div>
        
        {/* Legend */}
        <div className="flex justify-center gap-4 mt-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-traffic-low" />
            <span className="text-sm">Light</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-traffic-medium" />
            <span className="text-sm">Moderate</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-traffic-high" />
            <span className="text-sm">Heavy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-traffic-severe" />
            <span className="text-sm">Severe</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}