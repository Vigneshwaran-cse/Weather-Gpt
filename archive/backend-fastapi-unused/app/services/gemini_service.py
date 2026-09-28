"""
Gemini Service for Natural Language Weather Explanations
"""
import os
import json
import urllib.request
from typing import Dict, Any

SYSTEM_INSTRUCTION = """You are WeatherGPT, a conversational weather assistant.

Answer the user's question ONLY using the verified weather data provided by the backend.

Never invent temperature, rainfall probability, wind speed, weather conditions, alerts or other weather values.

Never claim that a forecast is certain.

If the required weather information is unavailable, clearly state that it is unavailable.

Explain technical weather information in simple language.

When useful, explain what the weather means for the user's plans.

Always identify the weather-data source.

Distinguish between current observations and forecasts."""

def generate_ai_weather_response(user_query: str, verified_weather: Dict[str, Any]) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return _fallback_response(user_query, verified_weather)

    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    prompt = f"""User Question: {user_query}
Verified Weather Data (from Open-Meteo):
{json.dumps(verified_weather, indent=2)}

Please answer the question according to your instructions. Cite Open-Meteo as the source with timestamp {verified_weather.get('updated')}."""

    payload = {
        "system_instruction": {"parts": [{"text": SYSTEM_INSTRUCTION}]},
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2}
    }

    try:
        req = urllib.request.Request(
            endpoint,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req) as response:
            res = json.loads(response.read().decode())
            text = res.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            return text if text else _fallback_response(user_query, verified_weather)
    except Exception as e:
        print(f"Gemini API error: {e}")
        return _fallback_response(user_query, verified_weather)

def _fallback_response(user_query: str, weather: Dict[str, Any]) -> str:
    cur = weather.get("current", {})
    loc = weather.get("location", {}).get("name", "the requested city")
    daily = weather.get("daily", [])
    target = daily[1] if "tomorrow" in user_query.lower() and len(daily) > 1 else (daily[0] if daily else {})

    rain_prob = target.get("rainProbabilityMax", cur.get("rainProbability", 0))
    temp_max = target.get("tempMax", cur.get("temperature", 0))
    temp_min = target.get("tempMin", cur.get("temperature", 0))

    return (
        f"Verified weather update for {loc}:\n\n"
        f"🌧️ Rain probability: {rain_prob}%\n"
        f"🌡️ Temperature: {temp_min}°C – {temp_max}°C\n"
        f"💨 Wind: {cur.get('windSpeed', 0)} km/h\n\n"
        "AI explanation is temporarily unavailable. Displaying verified real-time weather metrics directly.\n\n"
        f"Source: Open-Meteo\nUpdated: {weather.get('updated')}"
    )
