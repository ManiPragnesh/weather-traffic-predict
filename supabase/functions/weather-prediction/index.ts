import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { location, lat, lon } = await req.json();
    
    if ((!location && (!lat || !lon))) {
      throw new Error('Location name or coordinates are required');
    }

    const OPENWEATHER_API_KEY = Deno.env.get('OPENWEATHER_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!OPENWEATHER_API_KEY || !LOVABLE_API_KEY) {
      throw new Error('API keys not configured');
    }

    console.log('Fetching weather data...');
    
    // Fetch current weather and forecast from OpenWeatherMap
    const weatherUrl = lat && lon 
      ? `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`
      : `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    
    const weatherResponse = await fetch(weatherUrl);
    
    if (!weatherResponse.ok) {
      throw new Error(`Weather API error: ${weatherResponse.status}`);
    }
    
    const weatherData = await weatherResponse.json();
    
    // Fetch 5-day forecast
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${weatherData.coord.lat}&lon=${weatherData.coord.lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    const forecastResponse = await fetch(forecastUrl);
    const forecastData = await forecastResponse.json();

    console.log('Weather data fetched, calling AI for analysis...');

    // Prepare AI prompt
    const systemPrompt = `You are a weather analysis AI. Provide traffic-relevant weather insights and predictions.
    
Your response must be a valid JSON object with this exact structure:
{
  "current": {
    "temp": number,
    "condition": string,
    "description": string,
    "humidity": number,
    "visibility": number (in km),
    "windSpeed": number (in m/s)
  },
  "forecast": [
    {
      "time": string (ISO format),
      "temp": number,
      "condition": string,
      "precipProbability": number (0-100)
    }
  ],
  "trafficImpact": {
    "severity": string ("low" | "medium" | "high"),
    "expectedDelay": number (minutes),
    "advice": string
  },
  "analysis": string
}`;

    const userPrompt = `Analyze this weather data for traffic impact:

Current Weather:
- Location: ${weatherData.name}
- Temperature: ${weatherData.main.temp}°C
- Condition: ${weatherData.weather[0].main}
- Description: ${weatherData.weather[0].description}
- Humidity: ${weatherData.main.humidity}%
- Visibility: ${(weatherData.visibility / 1000).toFixed(1)} km
- Wind Speed: ${weatherData.wind.speed} m/s

Forecast (next 24 hours):
${forecastData.list.slice(0, 8).map((item: any) => 
  `- ${new Date(item.dt * 1000).toLocaleString()}: ${item.main.temp}°C, ${item.weather[0].main}, ${item.pop * 100}% rain probability`
).join('\n')}

Provide comprehensive weather analysis with traffic impact assessment.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    
    let prediction;
    try {
      const cleanResponse = aiContent.replace(/```json\n?|\n?```/g, '').trim();
      prediction = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent);
      throw new Error('Invalid AI response format');
    }

    console.log('Weather prediction generated successfully');

    return new Response(
      JSON.stringify({
        ...prediction,
        location: weatherData.name,
        coordinates: weatherData.coord
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in weather-prediction function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
