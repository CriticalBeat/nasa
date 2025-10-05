import { fetchYearWeather } from "../services/nasaApiService";
import MLR from "ml-regression-multivariate-linear";

// Global temperature anomaly
const globalTempAnomaly = {
  1984: 0.25,
  1985: 0.27,
  1986: 0.28,
  1987: 0.3,
  1988: 0.32,
  1989: 0.33,
  1990: 0.35,
  1991: 0.36,
  1992: 0.38,
  1993: 0.39,
  1994: 0.41,
  1995: 0.42,
  1996: 0.44,
  1997: 0.45,
  1998: 0.48,
  1999: 0.49,
  2000: 0.5,
  2001: 0.51,
  2002: 0.53,
  2003: 0.55,
  2004: 0.56,
  2005: 0.58,
  2006: 0.6,
  2007: 0.61,
  2008: 0.63,
  2009: 0.65,
  2010: 0.67,
  2011: 0.68,
  2012: 0.7,
  2013: 0.72,
  2014: 0.74,
  2015: 0.76,
  2016: 0.78,
  2017: 0.8,
  2018: 0.82,
  2019: 0.84,
  2020: 0.86,
  2021: 0.88,
  2022: 0.9,
  2023: 0.95,
  2024: 1.1,
  2025: 1.2,
};

// Convert date string to "MM-DD"
function getMonthDay(dateStr) {
  const d = new Date(dateStr);
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

// Fetch historical data for a **specific calendar day** across all years
async function getSpecificDayData(
  lat,
  lon,
  monthDay,
  startYear = 1984,
  endYear = 2025
) {
  const data = [];
  for (let year = startYear; year <= endYear; year++) {
    const yearData = await fetchYearWeather(year, lat, lon);
    const anomaly = globalTempAnomaly[year] || 1.0;

    // Find only the data for the exact month/day
    const dayData = yearData.find((d) => getMonthDay(d.date) === monthDay);
    if (dayData) data.push({ ...dayData, year, anomaly });
  }
  return data;
}

// Cache models per day
let cachedDayModels = {};
export async function getDayModels(lat, lon, monthDay) {
  if (cachedDayModels[monthDay]) return cachedDayModels[monthDay];

  const historical = await getSpecificDayData(lat, lon, monthDay);

  const targets = [
    "temp_c",
    "temp_max_c",
    "temp_min_c",
    "wind_mps",
    "wind_max_mps",
    "wind_min_mps",
    "pressure_kpa",
    "precip_mm",
    "humidity_percent",
    "cloud_cover_percent",
  ];

  const models = {};
  targets.forEach((target) => {
    const X = historical.map((d) => [d.year, d.anomaly]);
    const y = historical.map((d) => [d[target]]);
    if (X.length >= 2) models[target] = new MLR(X, y); // Only train if ≥2 points
  });

  cachedDayModels[monthDay] = models;
  return models;
}

// Predict weather for a specific date
export async function predictWeather(lat, lon, dateInput) {
  if (!dateInput) return { error: "No date provided" };

  const dateStr =
    typeof dateInput === "string"
      ? dateInput
      : dateInput.toISOString().slice(0, 10);
  const [year] = dateStr.split("-").map(Number);
  const monthDay = dateStr.slice(5); // "MM-DD"

  const dayModels = await getDayModels(lat, lon, monthDay);
  if (!Object.keys(dayModels).length)
    return { error: "Not enough historical data" };

  const anomaly = globalTempAnomaly[year] || 1.3;
  const input = [year, anomaly];

  const predictedDay = { date: dateStr };
  Object.keys(dayModels).forEach((key) => {
    predictedDay[key] = parseFloat(dayModels[key].predict(input)[0].toFixed(2));
  });

  return predictedDay;
}
