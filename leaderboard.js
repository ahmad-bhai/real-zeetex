const https = require("https");

const FIREBASE_BASE_URL = "https://leaderboard-fa467-default-rtdb.firebaseio.com/users";

// Helper function to decode URL-encoded text safely
function decodeText(str) {
  if (!str) return "";
  try {
    return decodeURIComponent(str);
  } catch (e) {
    return str;
  }
}

// Helper to sanitize and decode single user object
function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: decodeText(user.name),
    username: user.username ? decodeText(user.username) : "",
    country: decodeText(user.country),
    profit: typeof user.profit === "number" ? user.profit : parseFloat(user.profit || 0),
  };
}

// Helper to make HTTPS GET request to Firebase
function fetchFirebaseData(url) {
  return new Promise((resolve) => {
    https
      .get(url, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve(null);
          }
        });
      })
      .on("error", (err) => {
        console.error("Firebase Fetch Error:", err);
        resolve(null);
      });
  });
}

module.exports = async (req, res) => {
  // Enable CORS so your future Web Version can access this API easily
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const { id } = req.query;

    // 1. Single User Fetching: /api/leaderboard?id=7476086614
    if (id) {
      const userUrl = `${FIREBASE_BASE_URL}/${id}.json`;
      const userData = await fetchFirebaseData(userUrl);

      if (!userData) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: sanitizeUser(userData),
      });
    }

    // 2. Full Leaderboard Fetching: /api/leaderboard
    const allUsersUrl = `${FIREBASE_BASE_URL}.json`;
    const rawData = await fetchFirebaseData(allUsersUrl);

    if (!rawData) {
      return res.status(200).json({
        success: true,
        count: 0,
        leaderboard: [],
      });
    }

    // Convert Firebase object to array, decode fields, and sort by Profit (Descending)
    const formattedLeaderboard = Object.keys(rawData)
      .map((key) => sanitizeUser(rawData[key]))
      .filter(Boolean)
      .sort((a, b) => b.profit - a.profit);

    return res.status(200).json({
      success: true,
      count: formattedLeaderboard.length,
      leaderboard: formattedLeaderboard,
    });
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};
