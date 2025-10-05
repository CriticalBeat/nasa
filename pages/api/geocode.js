// pages/api/geocode.js
export default async function handler(req, res) {
  const { name, lat, lon } = req.query;

  let url;
  if (name) {
    url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      name
    )}&count=1`;
  } else if (lat && lon) {
    url = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=en`;
  } else {
    return res.status(400).json({ error: "Provide name or lat/lon" });
  }

  try {
    const r = await fetch(url);
    const data = await r.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Geocoding failed" });
  }
}
