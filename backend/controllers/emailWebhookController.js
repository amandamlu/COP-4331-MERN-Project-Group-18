const { getResendClient } = require('../services/resendClient');
const EmailImport = require('../models/EmailImport');
const { resolveImportOwner, savePendingImport } = require('../services/emailImportService');

async function receiveEmail(req, res) {
  const resend = getResendClient();
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!resend || !webhookSecret) {
    return res.status(503).json({ error: 'Email webhook is unavailable' });
  }

  if (!Buffer.isBuffer(req.body)) {
    return res.status(400).json({ error: 'Expected an application/json request body' });
  }

  let event;
  try {
    event = resend.webhooks.verify({
      payload: req.body.toString('utf8'),
      headers: {
        id: req.get('svix-id'),
        timestamp: req.get('svix-timestamp'),
        signature: req.get('svix-signature'),
      },
      webhookSecret,
    });
  } catch {
    return res.status(400).json({ error: 'Invalid webhook signature or payload' });
  }

  if (event?.type !== 'email.received') {
    return res.sendStatus(200);
  }

  const emailId = event.data?.email_id;
  if (typeof emailId !== 'string' || !emailId.trim()) {
    return res.status(400).json({ error: 'Missing email ID' });
  }

  let userId;
  try {
    if (await EmailImport.exists({ ResendEmailId: emailId })) return res.sendStatus(200);

    userId = await resolveImportOwner(event.data.to);
    if (!userId) return res.sendStatus(200);
  } catch {
    console.warn('Could not resolve Resend email import');
    return res.status(503).json({ error: 'Email import is temporarily unavailable' });
  }

  let email;
  try {
    const { data, error } = await resend.emails.receiving.get(
      emailId,
      {},
      { signal: AbortSignal.timeout(5000) },
    );
    if (error || !data) throw new Error('Resend did not return an email');
    email = data;
  } catch {
    // A non-2xx response lets Resend retry a failed retrieval.
    console.warn('Resend inbound email retrieval failed');
    return res.status(502).json({ error: 'Could not retrieve inbound email' });
  }

  try {
    if (await savePendingImport({ userId, emailId, email })) {
      console.info('Resend inbound email saved as a pending import');
    }
    return res.sendStatus(200);
  } catch {
    console.warn('Could not save Resend email import');
    return res.status(503).json({ error: 'Email import is temporarily unavailable' });
  }
}

module.exports = { receiveEmail };
