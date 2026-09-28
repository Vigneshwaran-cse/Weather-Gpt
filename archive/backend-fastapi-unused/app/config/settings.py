"""
Configuration settings for FastAPI backend.
"""
import os
from pydantic import BaseModel

class Settings(BaseModel):
    app_name: str = "WeatherGPT API"
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    open_meteo_base_url: str = os.getenv("OPEN_METEO_BASE_URL", "https://api.open-meteo.com/v1")
    geocoding_base_url: str = "https://geocoding-api.open-meteo.com/v1"

settings = Settings()
