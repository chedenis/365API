// utils/getCoordinates.js
const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();

const getCoordinates = async (address) => {
  const encodedAddress = encodeURIComponent(address);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${process.env.MAPBOX_API_TOKEN}`;

  try {
    const response = await axios.get(url);
    const data = response.data;

    if (data.features && data.features.length > 0) {
      const [longitude, latitude] = data.features[0].geometry.coordinates;
      return { latitude, longitude };
    } else {
      throw new Error("No coordinates found for the given address");
    }
  } catch (error) {
    console.error("Error fetching coordinates from Mapbox:", error);
    throw error;
  }
};

module.exports = getCoordinates;
