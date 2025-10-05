// pages/api/nasa-weather.js
import { getNASAWeatherData } from "../../services/nasaApiService";

export default async function handler(req, res) {
  const { lat, lon, start, end } = req.query;

  try {
    const data = await getNASAWeatherData(lat, lon, start, end);
    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch NASA data" });
  }
}
