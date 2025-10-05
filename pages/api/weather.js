// weather.js
const BASE_URL = "https://api.open-meteo.com/v1/forecast";

/**
 * Fetch weather data from Open-Meteo
 * @param {number} latitude
 * @param {number} longitude
 * @param {string} timezone
 * @returns {Promise<Object>} weather data
 */
export async function getWeather(latitude, longitude, timezone = "auto") {
  try {
    const response = await fetch(
      `${BASE_URL}?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code&current_weather=true&timezone=${timezone}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch weather data");
    }

    const data = await response.json();

    // Simplify data for frontend use
    return {
      current: data.current,
      hourly: data.hourly,
      units: data.hourly_units,
    };
  } catch (error) {
    console.error("Weather API error:", error);
    return null;
  }
}
