export default async function handler(req, res) {
  const { name } = req.query;

  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${name}`
    );
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("Geocode API error:", error);
    res.status(500).json({ error: "Failed to fetch geocoding data" });
  }
}
