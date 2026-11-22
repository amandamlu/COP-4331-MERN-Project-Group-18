const { Resend } = require('resend');

let client;

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  client ??= new Resend(apiKey);
  return client;
}

module.exports = { getResendClient };
