// controllers/addTailor.js
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import User from '../../models/user.js';
import { getChannel } from '../../lib/rabbitmq.js';

const SALT_ROUNDS = Number(process.env.SALT_ROUNDS || 10);
const EMAIL_QUEUE = process.env.EMAIL_QUEUE_NAME || 'email_queue';

function generateRandomPassword(length = 12) {
  return crypto.randomBytes(Math.ceil(length * 0.75))
    .toString('base64')
    .replace(/\+/g, '0')
    .replace(/\//g, '0')
    .slice(0, length);
}

const addTailor = async (req, res) => {
  try {
    const { name, email, phone, skillLevel, role } = req.body;

    if (!email) return res.status(400).json({ message: 'Email is required.' });
    if (!name) return res.status(400).json({ message: 'Name is required.' });
    if (!phone) return res.status(400).json({ message: 'Phone number is required.' });
    if (!role) {
      return res.status(400).json({ message: 'Role must be either Tailor or MasterTailor.' });
    }

    const displayName = name.trim();
    const normalizedEmail = String(email).toLowerCase().trim();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(409).json({ message: 'A user with that email already exists.' });

    // generate password & hash
    const plainPassword = generateRandomPassword(12);
    const hashed = await bcrypt.hash(plainPassword, SALT_ROUNDS);

    const userPayload = {
      email: normalizedEmail,
      password: hashed,
      displayName,
      username: displayName.split(' ').join('').toLowerCase(),
      firstName: displayName.split(' ')[0].toLowerCase(),
      role: role,
      skillLevel: skillLevel || undefined,
      phone: phone ? String(phone) : undefined,
      provider: 'local',
      isEmailVerified: false,
    };

    const user = new User(userPayload);
    await user.save();

    // enqueue email job
    try {
      const channel = await getChannel();
      await channel.assertQueue(EMAIL_QUEUE, { durable: true });

      const jobPayload = {
        type: 'send-credentials',
        to: normalizedEmail,
        name: displayName,
        plainPassword,
        phone: phone,
        userId: user._id.toString(),
        createdAt: new Date().toISOString(),
      };

      channel.sendToQueue(EMAIL_QUEUE, Buffer.from(JSON.stringify(jobPayload)), { persistent: true });
    } catch (queueErr) {
      console.error('Failed to enqueue email job:', queueErr);
      // Option: rollback user creation on queue failure. We keep the user and notify admin.
      const userObj = user.toObject();
      delete userObj.password;
      delete userObj.refreshToken;
      return res.status(201).json({
        message: 'User created but failed to queue credentials email. Check CloudAMQP/worker.',
        user: userObj
      });
    }

    const safeUser = user.toObject();
    delete safeUser.password;
    delete safeUser.refreshToken;

    return res.status(201).json({
      message: 'Tailor created and email job queued.',
      user: safeUser
    });
  } catch (err) {
    console.error('addTailor error:', err);
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue || {})[0];
      return res.status(409).json({ message: `${field || 'Field'} already exists.` });
    }
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export default addTailor;
