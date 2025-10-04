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
    const { origin, destination, currentTraffic, weather } = await req.json();
    
    if (!origin || !destination) {
      throw new Error('Origin and destination are required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Prepare context for AI
    const systemPrompt = `You are an AI traffic prediction assistant. Analyze traffic patterns and provide predictions.
    
Your response must be a valid JSON object with this exact structure:
{
  "predictedDelay": number (in minutes),
  "confidence": number (0-100),
  "alternativeRoute": {
    "name": string,
    "savedTime": number (in minutes)
  } or null,
  "analysis": string (brief explanation)
}`;

    const userPrompt = `Analyze this traffic scenario:
- Origin: ${origin}
- Destination: ${destination}
- Current Traffic: ${currentTraffic || 'moderate'}
- Weather: ${weather ? `${weather.temp}°C, ${weather.description}` : 'clear'}

Provide traffic prediction with delay estimate, confidence level, and alternative route if beneficial.`;

    console.log('Calling Lovable AI Gateway...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received:', data);
    
    const aiResponse = data.choices[0].message.content;
    
    // Parse JSON from response
    let prediction;
    try {
      // Remove markdown code blocks if present
      const cleanResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
      prediction = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      throw new Error('Invalid AI response format');
    }

    return new Response(
      JSON.stringify(prediction),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in traffic-prediction function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        predictedDelay: 15,
        confidence: 50,
        alternativeRoute: null,
        analysis: 'Error generating prediction'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
