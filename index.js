const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const consumerKey = process.env.CONSUMER_KEY;
const consumerSecret = process.env.CONSUMER_SECRET;
const shortcode = process.env.SHORTCODE;
const passkey = process.env.PASSKEY;

let orders = {};

async function getAccessToken() {
    const auth = Buffer.from(${consumerKey}:${consumerSecret}).toString("base64");

    const response = await axios.get(
        "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
        {
            headers: {
                Authorization: Basic ${auth}
            }
        }
    );

    return response.data.access_token;
}

app.post("/pay", async (req, res) => {
    try {
        const { phone, amount } = req.body;

        const orderId = "ORD" + Date.now();
        orders[orderId] = { phone, amount, status: "pending" };

        const token = await getAccessToken();

        const timestamp = new Date()
            .toISOString()
            .replace(/[-T:\.Z]/g, "")
            .slice(0, 14);

        const password = Buffer.from(shortcode + passkey + timestamp).toString("base64");

        const response = await axios.post(
            "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
            {
                BusinessShortCode: shortcode,
                Password: password,
                Timestamp: timestamp,
                TransactionType: "CustomerPayBillOnline",
                Amount: amount,
                PartyA: phone,
                PartyB: shortcode,
                PhoneNumber: phone,
                CallBackURL: "https://YOUR-RENDER-URL.onrender.com/callback",
                AccountReference: orderId,
                TransactionDesc: "Payment"
            },
            {
                headers: {
                    Authorization: Bearer ${token}
                }
            }
        );

        return res.json({
            success: true,
            orderId,
            data: response.data
        });

    } catch (error) {
        console.log(error.response?.data || error.message);
        return res.status(500).json({ error: "Payment failed" });
    }
});

app.post("/callback", (req, res) => {
    console.log("Callback received:", req.body);

    res.json({ message: "ok" });
});

app.get("/", (req, res) => {
    res.send("MPESA Backend Running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
