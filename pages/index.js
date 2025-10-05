"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Head from "next/head";
import dynamic from "next/dynamic";
import { predictWeather } from "../components/predictWeather";

// Dynamically import Leaflet map to avoid SSR issues
const WeatherMap = dynamic(() => import("../components/map"), { ssr: false });

const DEFAULT_LOCATION = { name: "Ulaanbaatar, MN", lat: 47.921, lon: 106.918 };

export default function Home() {
  const [data, setData] = useState(null);
  const [localTime, setLocalTime] = useState("");
  const [lastUpdate, setLastUpdate] = useState("");
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [inputCity, setInputCity] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [futureDate, setFutureDate] = useState("");
  const [futureData, setFutureData] = useState(null);

  // --- Helper functions ---
  const calculateWCI = ({ temp, wind, humidity, precipitation }) => {
    let score = 100 - Math.abs(temp - 22) * 3;
    score -= Math.max(0, wind - 10) * 1.5;
    score -= Math.max(0, humidity - 70) * 0.5;
    score -= precipitation * 2;
    return Math.min(Math.max(Math.round(score), 0), 100);
  };

  const getWCIGradient = (wci) => {
    if (wci >= 75) return "from-emerald-400 to-sky-400";
    if (wci >= 50) return "from-sky-300 to-indigo-300";
    if (wci >= 25) return "from-yellow-300 to-orange-300";
    return "from-rose-300 to-red-400";
  };

  const getWciLabel = (wci) => {
    if (wci >= 75) return "Hot";
    if (wci >= 50) return "Comfortable";
    if (wci >= 25) return "Cool";
    return "Cold";
  };

  const getAqiLabel = (aqi) => {
    if (aqi === null) return "N/A";
    if (aqi <= 50) return "Good";
    if (aqi <= 100) return "Moderate";
    if (aqi <= 150) return "Unhealthy (Sensitive)";
    if (aqi <= 200) return "Unhealthy";
    if (aqi <= 300) return "Very Unhealthy";
    return "Hazardous";
  };

  const weatherCodeToEmoji = (code) => {
    if ([0].includes(code)) return "☀️";
    if ([1, 2, 3].includes(code)) return "⛅";
    if ([45, 48].includes(code)) return "🌫️";
    if ([51, 53, 55, 61, 63, 65].includes(code)) return "🌧️";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
    if ([95, 96, 99].includes(code)) return "⛈️";
    return "🌡️";
  };

  const weatherCodeToText = (code) => {
    if ([0].includes(code)) return "Clear sky";
    if ([1, 2, 3].includes(code)) return "Partly Cloudy";
    if ([45, 48].includes(code)) return "Fog";
    if ([51, 53, 55, 61, 63, 65].includes(code)) return "Rain";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
    if ([95, 96, 99].includes(code)) return "Thunderstorm";
    return "Unknown";
  };

  // Update local time every minute
  useEffect(() => {
    const interval = setInterval(
      () => setLocalTime(new Date().toLocaleString()),
      60000
    );
    setLocalTime(new Date().toLocaleString());
    return () => clearInterval(interval);
  }, []);

  // --- Fetch Weather & AQI ---
  const fetchWeather = async (coords = location) => {
    try {
      if (inputCity) {
        const geoRes = await fetch(`/api/geocode?name=${inputCity}`);
        const geoJson = await geoRes.json();
        if (geoJson.results?.length) {
          coords = {
            name: `${geoJson.results[0].name}, ${geoJson.results[0].country_code}`,
            lat: geoJson.results[0].latitude,
            lon: geoJson.results[0].longitude,
          };
          setLocation(coords);
        }
      }

      // Weather API
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=sunrise,sunset&hourly=temperature_2m,apparent_temperature,weather_code,precipitation,wind_speed_10m,relative_humidity_2m&current_weather=true&timezone=auto`
      );
      const weatherJson = await weatherRes.json();

      // AQI API
      const aqiRes = await fetch(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${coords.lat}&longitude=${coords.lon}&hourly=us_aqi&timezone=auto`
      );
      const aqiJson = await aqiRes.json();

      const latestAqi =
        aqiJson?.hourly?.us_aqi?.[aqiJson.hourly.us_aqi.length - 1] || null;

      const nowHour = new Date().getHours();
      const hourly = Array.from({ length: 6 }, (_, i) => {
        const idx = Math.min(nowHour + i, weatherJson.hourly.time.length - 1);
        const temp = Math.round(weatherJson.hourly.temperature_2m[idx]);
        const feelsLike = Math.round(
          weatherJson.hourly.apparent_temperature[idx]
        );
        const wind = Math.round(weatherJson.hourly.wind_speed_10m[idx]);
        const humidity = weatherJson.hourly.relative_humidity_2m[idx];
        const precipitation = weatherJson.hourly.precipitation[idx];

        return {
          time:
            i === 0
              ? "Now"
              : `${new Date(weatherJson.hourly.time[idx]).getHours()}:00`,
          temp,
          feelsLike,
          icon: weatherCodeToEmoji(weatherJson.hourly.weather_code[idx]),
          precipitation,
          wind,
          humidity,
          wci: calculateWCI({ temp, wind, humidity, precipitation }),
        };
      });

      const wci = hourly[0].wci;

      setData({
        location: coords.name,
        temperature: Math.round(weatherJson.current_weather.temperature),
        feelsLike: hourly[0].feelsLike,
        condition: weatherCodeToText(weatherJson.current_weather.weathercode),
        wind: Math.round(weatherJson.current_weather.windspeed),
        precipitation: hourly[0].precipitation,
        humidity: hourly[0].humidity,
        wci,
        wciLabel: getWciLabel(wci),
        hourly,
        daily: weatherJson.daily,
        aqi: latestAqi,
        aqiLabel: getAqiLabel(latestAqi),
      });

      setLastUpdate(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Weather fetch error:", err);
    }
  };

  // --- Handle Map Click ---
  const handleMapClick = async ({ lat, lon }) => {
    try {
      const geoRes = await fetch(`/api/geocode?lat=${lat}&lon=${lon}`);
      const geoJson = await geoRes.json();

      let name = `Lat ${lat.toFixed(2)}, Lon ${lon.toFixed(2)}`;
      if (geoJson.results?.length) {
        name = `${geoJson.results[0].name}, ${geoJson.results[0].country_code}`;
      }

      const coords = { name, lat, lon };
      setLocation(coords);
      setInputCity(""); // reset search
    } catch (err) {
      console.error("Map click fetch error:", err);
    }
  };

  // --- Handle Future Prediction using NASA data ---
  const handleFuturePrediction = async () => {
    if (!futureDate) return;
    try {
      const predicted = await predictWeather(
        location.lat,
        location.lon,
        futureDate
      );
      if (predicted?.error) {
        alert(predicted.error);
        return;
      }
      // Map predicted keys to your display structure
      const mapped = {
        temperature: predicted.temp_c,
        feelsLike: predicted.temp_c, // approximate
        condition: "Predicted",
        wind: predicted.wind_mps,
        humidity: predicted.humidity_percent,
        precipitation: predicted.precip_mm,
        aqi: "N/A",
        wci: calculateWCI({
          temp: predicted.temp_c,
          wind: predicted.wind_mps,
          humidity: predicted.humidity_percent,
          precipitation: predicted.precip_mm,
        }),
      };
      mapped.wciLabel = getWciLabel(mapped.wci);
      mapped.aqiLabel = getAqiLabel(mapped.aqi);
      setFutureData(mapped);
    } catch (err) {
      console.error("Future prediction error:", err);
    }
  };

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(() => fetchWeather(), 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [inputCity, location]);

  if (!data)
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500">
        Loading...
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-gray-50 flex flex-col text-black">
      <Head>
        <title>Forecast Force</title>
        <meta name="description" content="Minimalist weather dashboard" />
      </Head>

      {/* Header */}
      <header className="w-full bg-white/80 backdrop-blur-sm shadow-md p-4 flex justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <input
            value={inputCity}
            onChange={(e) => setInputCity(e.target.value)}
            placeholder="Enter city"
            className="p-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-300"
          />
          <button
            onClick={() => fetchWeather()}
            className="px-3 py-2 bg-sky-500 text-white rounded-lg"
          >
            Search
          </button>
        </div>
        <button
          onClick={() => setShowMap(!showMap)}
          className="px-4 py-2 bg-emerald-500 text-white rounded-lg"
        >
          {showMap ? "Hide Map" : "Show Map"}
        </button>
      </header>

      {/* Map */}
      {showMap && (
        <div className="w-full flex justify-center p-4">
          <div className="w-full max-w-6xl">
            <WeatherMap coords={location} setCoords={handleMapClick} />
          </div>
        </div>
      )}

      <main className="flex-1 flex justify-center p-6">
        <div className="w-full max-w-6xl flex flex-col gap-6">
          {/* Current Weather */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">
                  Forecast Force
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  {location.name} • {localTime}
                </p>

                <div className="flex gap-4 mt-2 text-sm text-gray-400">
                  <div>
                    🌅 Sunrise:{" "}
                    {new Date(data.daily.sunrise[0]).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div>
                    🌇 Sunset:{" "}
                    {new Date(data.daily.sunset[0]).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl p-4 sm:p-6 bg-gradient-to-r ${getWCIGradient(
                  data.wci
                )} shadow-md w-full md:w-1/2`}
              >
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/90">
                      Weather Comfort Index
                    </p>
                    <p className="text-xs text-white/80 mt-1">
                      {data.wciLabel}
                    </p>
                  </div>
                  <div className="text-4xl md:text-5xl font-bold text-white">
                    {data.wci}/100
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Weather & AQI */}
            <div className="flex flex-col md:flex-row gap-4">
              {/* Weather */}
              <div className="flex-1 rounded-xl p-6 bg-white shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="text-6xl">{data.hourly[0].icon}</div>
                  <div>
                    <div className="text-4xl font-semibold">
                      {data.temperature}°C
                    </div>
                    <div className="text-sm text-gray-500">
                      Feels like {data.feelsLike}° • {data.condition}
                    </div>
                  </div>
                </div>

                {/* Hourly Forecast */}
                <div className="mt-6 overflow-x-auto">
                  <div className="flex gap-3 items-center">
                    {data.hourly.map((h) => (
                      <motion.div
                        key={h.time}
                        whileHover={{ y: -6 }}
                        className="min-w-[84px] p-3 rounded-xl bg-gray-50 border border-gray-100 text-center"
                      >
                        <div className="text-sm text-gray-500">{h.time}</div>
                        <div className="mt-2 text-lg">{h.icon}</div>
                        <div className="text-sm mt-1">{h.temp}°</div>
                        <div className="text-xs text-gray-400">
                          Feels {h.feelsLike}°
                        </div>
                        <div className="h-2 w-full bg-gray-200 rounded-full mt-1 overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${getWCIGradient(
                              h.wci
                            )}`}
                            style={{ width: `${h.wci}%` }}
                          ></div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* AQI Sidebar */}
              <div className="w-full md:w-1/2 rounded-xl p-6 bg-white shadow-sm border border-gray-100 flex flex-col justify-center items-center">
                <p className="text-sm text-gray-500">Air Quality Index</p>
                <div className="text-2xl font-bold mt-2">{data.aqi}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {data.aqiLabel}
                </div>

                <div className="mt-4 w-full bg-gray-50 rounded-lg p-3 text-center text-sm">
                  <div className="font-medium">What to wear</div>
                  <div className="text-xs text-gray-400">
                    Light jacket recommended • Comfortable for outdoor
                    activities
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs text-gray-400">
              Last updated: {lastUpdate}
            </p>
          </div>

          {/* Future Predictions */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 flex flex-col gap-4">
            <h2 className="text-2xl font-semibold">
              Future Weather Prediction
            </h2>
            <div className="flex gap-3 items-center">
              <input
                type="date"
                value={futureDate}
                onChange={(e) => setFutureDate(e.target.value)}
                className="p-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
              <button
                onClick={handleFuturePrediction}
                className="px-3 py-2 bg-sky-500 text-white rounded-lg"
              >
                Predict
              </button>
            </div>

            {futureData && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl p-4 bg-gray-50 border border-gray-100 flex flex-col items-center">
                  <div className="text-5xl">
                    {weatherCodeToEmoji(futureData.condition)}
                  </div>
                  <div className="text-xl font-bold mt-2">
                    {futureData.temperature}°C
                  </div>
                  <div className="text-sm text-gray-500">
                    Feels like {futureData.feelsLike}°
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {futureData.condition}
                  </div>
                </div>
                <div className="rounded-xl p-4 bg-gray-50 border border-gray-100 flex flex-col items-center">
                  <p className="text-sm text-gray-500">Wind</p>
                  <div className="text-xl font-bold mt-1">
                    {futureData.wind} kph
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Precipitation: {futureData.precipitation} mm
                  </p>
                </div>
                <div className="rounded-xl p-4 bg-gray-50 border border-gray-100 flex flex-col items-center">
                  <p className="text-sm text-gray-500">Humidity / AQI</p>
                  <div className="text-xl font-bold mt-1">
                    {futureData.humidity}% / {futureData.aqi}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {futureData.aqiLabel}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
