// backend/services/novaPostService.js
const axios = require("axios");

const NOVA_API_KEY = process.env.NOVAPOST_API_KEY; 
let cachedToken = null;
let tokenExpiresAt = 0;

async function getToken() {
  const now = Date.now();

  if (cachedToken && now < tokenExpiresAt) {
    return cachedToken;
  }

  const { data } = await axios.post(
    "https://api-stage.novapost.com/v1/auth/token",
    {},
    {
      headers: {
        "X-API-Key": NOVA_API_KEY,
      },
    }
  );

  cachedToken = data.token;
  tokenExpiresAt = now + 50 * 60 * 1000; // 50 хвилин

  return cachedToken;
}

exports.getCities = async (search = "") => {
  const token = await getToken();

  const { data } = await axios.get(
    "https://api-stage.novapost.com/v2/dictionaries/Settlements",
    {
      params: { search },
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return data.data;
};

exports.getWarehouses = async (cityRef) => {
  const token = await getToken();

  const { data } = await axios.get(
    "https://api-stage.novapost.com/v2/dictionaries/Offices",
    {
      params: { settlementRef: cityRef },
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return data.data;
};
