
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const sid = process.env.TWILIO_ACCOUNT_SID;
const token = process.env.TWILIO_AUTH_TOKEN;

const format = (number) => {
    const clean = number.replace(/\s/g, "");
    return clean.startsWith("whatsapp:")
        ? clean
        : `whatsapp:${clean.startsWith("+") ? clean : "+" + clean}`;
};

async function test() {
    if (!sid || !token) throw new Error("Twilio credentials missing");

    const from = format(process.env.TWILIO_WHATSAPP_NUMBER);
    const to = format(process.env.WHATSAPP_TEST_TO);

    const form = new URLSearchParams({
        From: from,
        To: to,
        Body: "CareLocker direct API test. WhatsApp delivery verification."
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
            {
                method: "POST",
                headers: {
                    Authorization:
                        "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: form.toString(),
                signal: controller.signal
            }
        );

        const result = await response.json();

        console.log("HTTP STATUS:", response.status);
        console.log("MESSAGE SID:", result.sid || "None");
        console.log("MESSAGE STATUS:", result.status || "None");
        console.log("ERROR CODE:", result.code || "None");
        console.log("ERROR MESSAGE:", result.message || "None");

    } finally {
        clearTimeout(timer);
    }
}

test().catch(error => console.error("TEST FAILED:", error.message));
