const axios = require("axios");
const crypto = require('crypto');

require("dotenv").config();

function generateHmacSignature(timestamp, body, secretKey) {
  const bodyString = JSON.stringify(body);
  const data = timestamp + bodyString;
  return crypto
    .createHmac('sha256', secretKey)
    .update(data)
    .digest('hex');
}

const apiEndpoint = process.env.PLYR_API_ENDPOINT;
const apiKey = process.env.PLYR_API_KEY;
const secretKey = process.env.PLYR_API_SECRET;

console.log('PLYR API CONFIG LOADED', apiEndpoint, apiKey);

async function userLogin(plyrId, otp, expiresIn) {
    const timestamp = Date.now().toString();

    let body = {
        plyrId: plyrId, // Always be a lowercase string (autoconvert)
        otp: otp, // 2FA token
        expiresIn: expiresIn ? expiresIn : null, // In second (integer),  Null = '86400s' << 24 hrs by default
    }

    let hmac = generateHmacSignature(timestamp, body, secretKey);

    try {
        let ret = await axios.post(
            apiEndpoint + "/api/user/login",
            body,
            {
                headers: {
                    apikey: apiKey,
                    signature: hmac,
                    timestamp: timestamp,
                },
            }
        );
        console.log("status", ret.status);
        console.log("ret", ret.data);
        return {success: true, message: ret.data};
    } catch (error) {
        console.log("status", error.response.status);
        console.log(error.response.data);
        return {success: false, message: error.response.data};
    }
}

module.exports = { userLogin };