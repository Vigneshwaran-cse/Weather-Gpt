"""
Weather Service using Open-Meteo API
"""
import urllib.parse
import urllib.request
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from ..config.settings import settings

WMO_CODES = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail"
}

def decode_wmo_code(code: int) -> str:
    return WMO_CODES.get(code, "Variable conditions")

def geocode_city(city_name: str) -> List[Dict[str, Any]]:
    query = urllib.parse.quote(city_name.strip())
    url = f"{settings.geocoding_base_url}/search?name={query}&count=5&language=en&format=json"
    req = urllib.request.Request(url, headers={"User-Agent": "WeatherGPT-SIH2026"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        return data.get("results", [])

def get_realtime_weather(lat: float, lon: float, location_name: str, state: str = "", country: str = "") -> Dict[str, Any]:
    base_url = settings.open_meteo_base_url.rstrip("/")
    if not base_url.endswith("/v1"):
        base_url = f"{base_url}/v1"
    url = (
        f"{base_url}/forecast"
        f"?latitude={lat}&longitude={lon}"
        "&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m"
        "&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m"
        "&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,precipitation_sum,precipitation_probability_max,wind_speed_10m_max"
        "&timezone=auto"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "WeatherGPT-SIH2026"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())

    # Data validation
    current_raw = data.get("current", {})
    daily_raw = data.get("daily", {})
    hourly_raw = data.get("hourly", {})
    if not current_raw or not daily_raw or not hourly_raw:
        raise ValueError("Invalid or incomplete payload received from Open-Meteo.")

    cur_rain_prob = 0
    if hourly_raw.get("precipitation_probability"):
        cur_rain_prob = hourly_raw["precipitation_probability"][0]

    code = current_raw.get("weather_code", 0)
    current = {
        "temperature": round(current_raw.get("temperature_2m", 0.0), 1),
        "feelsLike": round(current_raw.get("apparent_temperature", 0.0), 1),
        "humidity": round(current_raw.get("relative_humidity_2m", 0.0)),
        "windSpeed": round(current_raw.get("wind_speed_10m", 0.0), 1),
        "windDirection": round(current_raw.get("wind_direction_10m", 0.0)),
        "precipitation": round(current_raw.get("precipitation", 0.0), 1),
        "rainProbability": cur_rain_prob,
        "weatherCode": code,
        "condition": decode_wmo_code(code),
        "isDay": current_raw.get("is_day") == 1,
        "timestamp": current_raw.get("time", datetime.utcnow().isoformat())
    }

    daily = []
    days = min(len(daily_raw.get("time", [])), 7)
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    for i in range(days):
        d_str = daily_raw["time"][i]
        dt = datetime.strptime(d_str, "%Y-%m-%d")
        label = "Today" if i == 0 else ("Tomorrow" if i == 1 else day_names[dt.weekday()])
        d_code = daily_raw["weather_code"][i]
        daily.append({
            "date": d_str,
            "dayOfWeek": label,
            "weatherCode": d_code,
            "condition": decode_wmo_code(d_code),
            "tempMax": round(daily_raw["temperature_2m_max"][i], 1),
            "tempMin": round(daily_raw["temperature_2m_min"][i], 1),
            "rainProbabilityMax": daily_raw.get("precipitation_probability_max", [0])[i],
            "precipitationSum": round(daily_raw.get("precipitation_sum", [0])[i], 1),
            "sunrise": daily_raw.get("sunrise", [""])[i].split("T")[-1][:5] if daily_raw.get("sunrise") else "",
            "sunset": daily_raw.get("sunset", [""])[i].split("T")[-1][:5] if daily_raw.get("sunset") else "",
        })

    alerts = []
    if current["temperature"] >= 40:
        alerts.append({
            "id": "extreme-heat",
            "type": "Extreme Heat Warning",
            "severity": "Severe",
            "description": f"Dangerous heat reaching {current['temperature']}°C. Stay hydrated and avoid peak direct sunlight.",
            "validity": "Valid today through evening",
            "source": "Open-Meteo"
        })
    if code in [95, 96, 99]:
        alerts.append({
            "id": "thunderstorm-warning",
            "type": "Severe Thunderstorm Warning",
            "severity": "Severe",
            "description": "Active thunderstorm conditions with lightning and gusty winds.",
            "validity": "Valid next 24 hours",
            "source": "Open-Meteo"
        })

    now_str = datetime.now().strftime("%d %b %Y, %I:%M %p")
    return {
        "location": {
            "name": location_name,
            "state": state,
            "country": country,
            "latitude": lat,
            "longitude": lon,
        },
        "current": current,
        "daily": daily,
        "alerts": alerts,
        "source": "Open-Meteo",
        "updated": now_str
    }
