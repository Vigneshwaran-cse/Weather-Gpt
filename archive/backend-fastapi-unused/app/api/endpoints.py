"""
FastAPI Router for Weather & Chat Endpoints
"""
from fastapi import APIRouter, HTTPException
from ..schemas.weather import ChatRequest, ChatResponse
from ..services.weather_service import geocode_city, get_realtime_weather
from ..services.gemini_service import generate_ai_weather_response

router = APIRouter(prefix="/api")

@router.get("/geocode")
def geocode(q: str):
    try:
        results = geocode_city(q)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/weather")
def weather(lat: float, lon: float, name: str = "Selected Location", state: str = "", country: str = ""):
    try:
        data = get_realtime_weather(lat, lon, name, state, country)
        return {"data": data}
    except Exception as e:
        raise HTTPException(status_code=503, detail="Unable to retrieve live weather data right now. Please try again.")

@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    # 1. Resolve location
    target_city = req.location or "Chennai"
    try:
        places = geocode_city(target_city)
        if not places:
            raise HTTPException(status_code=404, detail="Location not found")
        top = places[0]
        lat = top["latitude"]
        lon = top["longitude"]
        name = top["name"]
        state = top.get("admin1", "")
        country = top.get("country", "")

        # 2. Retrieve real-time verified weather from Open-Meteo
        weather_data = get_realtime_weather(lat, lon, name, state, country)

        # 3. Ground Gemini in verified data
        reply = generate_ai_weather_response(req.message, weather_data)

        return ChatResponse(
            reply=reply,
            location=weather_data["location"],
            source="Open-Meteo",
            updated=weather_data["updated"],
            alerts=weather_data.get("alerts", [])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
