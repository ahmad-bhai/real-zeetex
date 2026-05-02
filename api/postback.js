export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // Aapka Realtime Database URL
    const DB_URL = "https://trader-id-d0734-default-rtdb.firebaseio.com/users";

    try {
        // 1. DATA RECEIVE KARNA (Quotex Postback - GET Method)
        if (req.method === 'GET') {
            const { uid, status, sumdep, sumwithdraw, country } = req.query;

            if (!uid) {
                return res.status(400).send("Error: Missing Trader ID");
            }

            const userData = {
                id: uid,
                status: status || 'reg',
                balance: sumdep || "0",
                withdraw: sumwithdraw || "0",
                country: country || "Unknown",
                last_updated: new Date().toISOString()
            };

            // Firebase mein data PUT karna (Automatic folder create ho jayega)
            const saveResponse = await fetch(`${DB_URL}/${uid}.json`, {
                method: 'PUT',
                body: JSON.stringify(userData),
                headers: { 'Content-Type': 'application/json' }
            });

            if (saveResponse.ok) {
                return res.status(200).send("✅ Postback Saved to Firebase Permanent Store");
            } else {
                return res.status(500).send("❌ Firebase Error: Could not save data");
            }
        }

        // 2. DATA VERIFY KARNA (Web Dashboard/Bot - POST Method)
        if (req.method === 'POST') {
            const { checkId } = req.body;

            if (!checkId) {
                return res.status(400).json({ success: false, message: "ID is required" });
            }

            // Firebase se data fetch karna
            const fetchResponse = await fetch(`${DB_URL}/${checkId}.json`);
            const data = await fetchResponse.json();

            if (data) {
                return res.status(200).json({ success: true, ...data });
            } else {
                return res.status(404).json({ success: false, message: "ID not found in database" });
            }
        }

        return res.status(405).send("Method Not Allowed");

    } catch (error) {
        console.error("Critical Error:", error);
        return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
}
