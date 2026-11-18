const { randomBytes } = require('node:crypto');
const { isObjectIdOrHexString } = require('mongoose');
const User = require('../models/User');
const EmailForwardingAddress = require('../models/EmailForwardingAddress');

const DOMAIN_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

async function createForwardingAddress(userId, domain) {
  // Wait for the unique indexes before allowing concurrent upserts.
  await EmailForwardingAddress.init();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const address = `intern-${randomBytes(16).toString('hex')}@${domain}`;

    try {
      return await EmailForwardingAddress.findOneAndUpdate(
        { UserId: userId },
        { $setOnInsert: { Address: address } },
        { upsert: true, returnDocument: 'after', runValidators: true },
      );
    } catch (error) {
      if (error.code !== 11000) throw error;
      // A concurrent request may already have assigned this user's address.
      const existing = await EmailForwardingAddress.findOne({ UserId: userId });
      if (existing) return existing;
    }
  }

  throw new Error('Could not allocate a unique forwarding address');
}

async function getForwardingAddress(req, res, next) {
  res.set('Cache-Control', 'no-store');

  const userId = req.user.sub;
  if (!isObjectIdOrHexString(userId)) {
    return res.status(401).json({ error: 'Invalid user identity' });
  }

  try {
    if (!(await User.exists({ _id: userId }))) {
      return res.status(404).json({ error: 'User not found' });
    }

    let forwarding = await EmailForwardingAddress.findOne({ UserId: userId });
    if (!forwarding) {
      const domain = process.env.RESEND_INBOUND_DOMAIN?.trim().toLowerCase();
      if (!domain || domain.length > 214 || !DOMAIN_PATTERN.test(domain)) {
        return res.status(503).json({ error: 'Email forwarding domain is unavailable' });
      }

      forwarding = await createForwardingAddress(userId, domain);
    }

    if (!forwarding.Enabled) {
      return res.status(403).json({ error: 'Email forwarding is disabled' });
    }

    return res.status(200).json({ address: forwarding.Address });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getForwardingAddress };
