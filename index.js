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

    const res = await axios.get(
        "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
        { headers: { Authorization: Basic ${auth} } }
    );

    return res.data.access_token;
}

app.post("/pay", async (req, res) => {
    const { phone, amount } = req.body;

    const orderId = "ORD" + Date.now();
    orders[orderId] = { phone, amount, status: "pending" };

    const token = await getAccessToken();

    const timestamp = new Date().toISOString().replace(/[-T:\.Z]/g, "").slice(0,14);
    const password = Buffer.from(shortcode + passkey + timestamp).toString("base64");

    try {
        await axios.post(
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
                CallBackURL: "https://REPLACE.onrender.com/callback",
                AccountReference: orderId,
                TransactionDesc: "Payment"
            },
            { headers: { Authorization: Bearer ${token} } }
        );

        res.json({ orderId });

    } catch (err) {
        res.status(500).json(err.response?.data || err.message);
    }
});

app.post("/callback", (req, res) => {
    const stk = req.body.Body.stkCallback;

    if (stk.ResultCode === 0) {
        console.log("✅ Payment success");
    } else {
        console.log("❌ Payment failed");
    }

    res.json({ message: "ok" });
});

app.get("/", (req, res) => {
    res.send("MPESA Backend Running");
});

app.listen(3000, () => console.log("Server running"));