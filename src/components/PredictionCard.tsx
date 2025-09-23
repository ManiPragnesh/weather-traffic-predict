import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, MapPin, Clock } from "lucide-react";

interface PredictionCardProps {
  predictedDelay: number;
  confidence: number;
  alternativeRoute?: {
    name: string;
    savedTime: number;
  };
  lastUpdated: string;
}

export default function PredictionCard({ 
  predictedDelay, 
  confidence, 
  alternativeRoute,
  lastUpdated 
}: PredictionCardProps) {
  const getConfidenceColor = (conf: number) => {
    if (conf >= 90) return "text-traffic-low";
    if (conf >= 75) return "text-traffic-medium";
    return "text-traffic-high";
  };
  
  return (
    <Card className="hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <span className="text-lg font-semibold">ML Prediction</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center py-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Predicted Delay</p>
          <p className="text-3xl font-bold text-primary">{predictedDelay} min</p>
          <p className={`text-sm font-medium ${getConfidenceColor(confidence)}`}>
            {confidence}% confidence
          </p>
        </div>
        
        {alternativeRoute && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Alternative Route</span>
            </div>
            <div className="bg-traffic-low/10 p-3 rounded-lg">
              <p className="font-medium text-traffic-low">{alternativeRoute.name}</p>
              <p className="text-sm text-muted-foreground">
                Save {alternativeRoute.savedTime} minutes
              </p>
            </div>
            <Button className="w-full" size="sm">
              Use Alternative Route
            </Button>
          </div>
        )}
        
        <div className="flex items-center gap-1 text-xs text-muted-foreground pt-2">
          <Clock className="h-3 w-3" />
          <span>Updated {lastUpdated}</span>
        </div>
      </CardContent>
    </Card>
  );
}