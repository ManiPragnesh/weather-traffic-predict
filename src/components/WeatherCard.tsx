import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cloud, CloudRain, Sun, Zap } from "lucide-react";

interface WeatherCardProps {
  condition: "clear" | "cloudy" | "rain" | "storm";
  temperature: number;
  humidity: number;
  visibility: number;
  impactLevel: "low" | "medium" | "high";
}

const weatherConfig = {
  clear: {
    icon: Sun,
    color: "text-weather-clear",
    bg: "bg-weather-clear/10",
    label: "Clear Sky",
  },
  cloudy: {
    icon: Cloud,
    color: "text-weather-cloudy",
    bg: "bg-weather-cloudy/10", 
    label: "Cloudy",
  },
  rain: {
    icon: CloudRain,
    color: "text-weather-rain",
    bg: "bg-weather-rain/10",
    label: "Rainy",
  },
  storm: {
    icon: Zap,
    color: "text-weather-storm",
    bg: "bg-weather-storm/10",
    label: "Stormy",
  },
};

const impactConfig = {
  low: { color: "text-traffic-low", label: "Low Impact" },
  medium: { color: "text-traffic-medium", label: "Medium Impact" }, 
  high: { color: "text-traffic-high", label: "High Impact" },
};

export default function WeatherCard({ 
  condition, 
  temperature, 
  humidity, 
  visibility, 
  impactLevel 
}: WeatherCardProps) {
  const config = weatherConfig[condition];
  const impact = impactConfig[impactLevel];
  const IconComponent = config.icon;
  
  return (
    <Card className="hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <IconComponent className={`h-5 w-5 ${config.color}`} />
          <span className="text-lg font-semibold">Weather Conditions</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.color}`}>
          {config.label}
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Temp</p>
            <p className="text-lg font-bold">{temperature}°C</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Humidity</p>
            <p className="text-lg font-bold">{humidity}%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Visibility</p>
            <p className="text-lg font-bold">{visibility}km</p>
          </div>
        </div>
        
        <div className="pt-2 border-t">
          <p className="text-sm text-muted-foreground">Traffic Impact</p>
          <p className={`font-semibold ${impact.color}`}>{impact.label}</p>
        </div>
      </CardContent>
    </Card>
  );
}