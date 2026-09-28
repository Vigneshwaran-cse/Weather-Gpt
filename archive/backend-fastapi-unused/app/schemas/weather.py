"""
Pydantic Schemas for WeatherGPT
"""
from typing import List, Optional
from pydantic import BaseModel

class ChatRequest(BaseModel):
    message: str
    location: Optional[str] = "Chennai"

class LocationInfo(BaseModel):
    name: str
    state: Optional[str] = ""
    country: Optional[str] = ""
    latitude: float
    longitude: float

class CurrentWeatherModel(BaseModel):
    temperature: float
    feelsLike: float
    humidity: float
    windSpeed: float
    windDirection: float
    precipitation: float
    rainProbability: float
    weatherCode: int
    condition: str
    isDay: bool
    timestamp: str

class DailyForecastModel(BaseModel):
    date: str
    dayOfWeek: str
    weatherCode: int
    condition: str
    tempMax: float
    tempMin: float
    rainProbabilityMax: float
    precipitationSum: float
    sunrise: str
    sunset: str

class AlertModel(BaseModel):
    id: str
    type: str
    severity: str
    description: str
    validity: str
    source: str

class ChatResponse(BaseModel):
    reply: str
    location: LocationInfo
    source: str = "Open-Meteo"
    updated: str
    alerts: List[AlertModel] = []
