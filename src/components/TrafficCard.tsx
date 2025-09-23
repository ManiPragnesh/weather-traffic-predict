import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TrafficCardProps {
  location: string;
  congestionLevel: "low" | "medium" | "high" | "severe";
  delay: number;
  volume: number;
  trend: "up" | "down" | "stable";
}

const congestionConfig = {
  low: {
    color: "text-traffic-low",
    bg: "bg-traffic-low/10",
    label: "Light Traffic",
  },
  medium: {
    color: "text-traffic-medium", 
    bg: "bg-traffic-medium/10",
    label: "Moderate Traffic",
  },
  high: {
    color: "text-traffic-high",
    bg: "bg-traffic-high/10", 
    label: "Heavy Traffic",
  },
  severe: {
    color: "text-traffic-severe",
    bg: "bg-traffic-severe/10",
    label: "Severe Congestion",
  },
};

const TrendIcon = ({ trend }: { trend: "up" | "down" | "stable" }) => {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-traffic-high" />;
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-traffic-low" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

export default function TrafficCard({ 
  location, 
  congestionLevel, 
  delay, 
  volume, 
  trend 
}: TrafficCardProps) {
  const config = congestionConfig[congestionLevel];
  
  return (
    <Card className="hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="text-lg font-semibold">{location}</span>
          <TrendIcon trend={trend} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.color}`}>
          {config.label}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Avg. Delay</p>
            <p className="text-xl font-bold">{delay} min</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Volume</p>
            <p className="text-xl font-bold">{volume.toLocaleString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}