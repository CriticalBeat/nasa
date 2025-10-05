import axios from "axios";

const NASA_API_BASE = "https://power.larc.nasa.gov/api/temporal/daily/point";

const PARAMETERS = [
  "T2M",
  "T2M_MAX",
  "T2M_MIN",
  "WS10M",
  "WS10M_MAX",
  "WS10M_MIN",
  "PS",
  "PRECTOTCORR",
  "RH2M",
  "QV2M",
  "T2MDEW",
  "ALLSKY_SFC_SW_DWN",
  "ALLSKY_SFC_LW_DWN",
  "CLRSKY_SFC_SW_DWN",
  "ALLSKY_SFC_PAR_TOT",
  "CLOUD_AMT",
].join(",");

export async function getNASAWeatherData(
  lat = 47.92,
  lon = 106.92,
  startDate,
  endDate
) {
  try {
    if (!startDate || !endDate) {
      const today = new Date();
      const end = today.toISOString().slice(0, 10).replace(/-/g, "");
      const start = new Date(today.setDate(today.getDate() - 30))
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "");
      startDate = start;
      endDate = end;
    }
    const params = {
      parameters: PARAMETERS,
      community: "RE",
      longitude: lon,
      latitude: lat,
      start: startDate,
      end: endDate,
      format: "JSON",
    };
    const res = await axios.get(NASA_API_BASE, { params });
    const data = res.data;
    if (!data.properties?.parameter) return getSampleData();
    return transformNASAData(data);
  } catch {
    return getSampleData();
  }
}

export async function fetchYearWeather(year, lat, lon) {
  try {
    const startDate = `${year}0101`;
    const endDate = `${year}1231`;
    const params = {
      parameters: PARAMETERS,
      community: "RE",
      longitude: lon,
      latitude: lat,
      start: startDate,
      end: endDate,
      format: "JSON",
    };
    const res = await axios.get(NASA_API_BASE, { params });
    const data = res.data;
    if (!data.properties?.parameter) return [];
    const temps = data.properties.parameter.T2M;
    const dates = Object.keys(temps);
    return dates.map((date) => ({
      date: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`,
      temp_c: temps[date],
      temp_max_c: data.properties.parameter.T2M_MAX[date],
      temp_min_c: data.properties.parameter.T2M_MIN[date],
      wind_mps: data.properties.parameter.WS10M[date],
      wind_max_mps: data.properties.parameter.WS10M_MAX[date],
      wind_min_mps: data.properties.parameter.WS10M_MIN[date],
      pressure_kpa: data.properties.parameter.PS[date],
      precip_mm: data.properties.parameter.PRECTOTCORR[date],
      humidity_percent: data.properties.parameter.RH2M[date],
      specific_humidity: data.properties.parameter.QV2M[date],
      dew_point_c: data.properties.parameter.T2MDEW[date],
      solar_radiation_kwh: data.properties.parameter.ALLSKY_SFC_SW_DWN[date],
      longwave_radiation_kwh: data.properties.parameter.ALLSKY_SFC_LW_DWN[date],
      clear_sky_solar_kwh: data.properties.parameter.CLRSKY_SFC_SW_DWN[date],
      par_total: data.properties.parameter.ALLSKY_SFC_PAR_TOT[date],
      cloud_cover_percent: data.properties.parameter.CLOUD_AMT[date],
    }));
  } catch {
    return [];
  }
}

function transformNASAData(nasaData) {
  const p = nasaData.properties.parameter;
  return {
    temperature: p.T2M
      ? Object.entries(p.T2M).map(([date, value]) => ({
          date,
          value,
          unit: "°C",
        }))
      : [],
    precipitation: p.PRECTOTCORR
      ? Object.entries(p.PRECTOTCORR).map(([date, value]) => ({
          date,
          value,
          unit: "mm",
        }))
      : [],
    windSpeed: p.WS10M
      ? Object.entries(p.WS10M).map(([date, value]) => ({
          date,
          value,
          unit: "m/s",
        }))
      : [],
  };
}

function getSampleData() {
  return {
    temperature: [
      { date: "20250101", value: 5, unit: "°C" },
      { date: "20250102", value: 6, unit: "°C" },
    ],
    precipitation: [
      { date: "20250101", value: 2, unit: "mm" },
      { date: "20250102", value: 0, unit: "mm" },
    ],
    windSpeed: [
      { date: "20250101", value: 3, unit: "m/s" },
      { date: "20250102", value: 4, unit: "m/s" },
    ],
  };
}
