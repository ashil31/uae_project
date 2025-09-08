// workers/emailWorker.js
import dotenv from 'dotenv';
dotenv.config();

import { getChannel } from '../lib/rabbitmq.js';
import nodemailer from 'nodemailer';

const EMAIL_QUEUE = process.env.EMAIL_QUEUE_NAME || 'email_queue';
const MAX_RETRIES = Number(process.env.EMAIL_JOB_MAX_RETRIES || 3);

function createTransporter() {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD must be set in env (App Password).');
    }

    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD
        },
        //if pooling is needed in future
        // pool: true,
        // maxConnections: 5,
        // maxMessages: 100
    });
}

async function startWorker() {
    const transporter = createTransporter();
    const channel = await getChannel();
    await channel.assertQueue(EMAIL_QUEUE, { durable: true });

    channel.prefetch(1);
    console.log('Email worker started - waiting for messages...');

    channel.consume(EMAIL_QUEUE, async (msg) => {
        if (!msg) return;
        let job;
        try {
            job = JSON.parse(msg.content.toString());
        } catch (e) {
            console.error('Invalid job payload - ack & skip', e);
            channel.ack(msg);
            return;
        }

        try {
            if (job.type === 'send-credentials') {
                const html = `
          <div style="font-family: Arial, sans-serif; color:#111; max-width: 600px; margin: auto; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; padding:24px; line-height: 1.6;">
              <h2 style="color: #2c3e50; margin-bottom: 16px; font-size: 22px;">
                Welcome to ${process.env.APP_NAME}
              </h2>

              <p style="margin: 0 0 12px 0;">Hi <strong>${job.name}</strong>,</p>
              <p style="margin: 0 0 20px 0;">
                Your account has been created by the admin. Please use the credentials below to log in:
              </p>

              <table cellpadding="8" cellspacing="0" style="border-collapse: collapse; margin: 16px 0; width: 100%; max-width: 500px;">
                <tr>
                  <td style="font-weight: bold; color: #2c3e50;">Email:</td>
                  <td>${job.to}</td>
                </tr>
                <tr>
                  <td style="font-weight: bold; color: #2c3e50;">Password:</td>
                  <td style="font-family: monospace; background: #f4f4f4; padding: 4px 8px; border-radius: 4px;">${job.plainPassword}</td>
                </tr>
                <tr>
                  <td style="font-weight: bold; color: #2c3e50;">Contact:</td>
                  <td>${job.phone || '—'}</td>
                </tr>
              </table>

              <p style="margin: 20px 0;">
                Please change your password after your first login:<br/>
                <a href="${process.env.APP_URL || 'https://www.ashilpatel.site/'}" 
                   style="color: #ffffff; background: #007BFF; text-decoration: none; padding: 10px 18px; border-radius: 5px; display: inline-block; margin-top: 10px;">
                   Go to Login
                </a>
              </p>

              <hr style="margin: 28px 0; border: none; border-top: 1px solid #ddd;"/>

              <p style="font-size: 13px; color: #555; margin: 0;">
                If you found any query in this, please let us know about it.
              </p>
            </div>
        `;

                await transporter.sendMail({
                    from: process.env.GMAIL_USER,
                    to: job.to,
                    subject: 'Your account credentials',
                    html
                });

                console.log(`Email sent to ${job.to}`);
                channel.ack(msg);
            } else {
                console.warn('Unknown job type:', job.type);
                channel.ack(msg);
            }
        } catch (err) {
            console.error('Failed processing job:', err);

            const headers = msg.properties.headers || {};
            const retries = (headers['x-retries'] || 0) + 1;

            if (retries <= MAX_RETRIES) {
                // re-publish with incremented retry header, then ack the current message
                const payload = Buffer.from(JSON.stringify(job));
                channel.sendToQueue(EMAIL_QUEUE, payload, {
                    persistent: true,
                    headers: { 'x-retries': retries }
                });
                console.log(`Requeued job for ${job.to} (retry ${retries}/${MAX_RETRIES})`);
                channel.ack(msg);
            } else {
                console.error(`Dropping job for ${job.to} after ${retries - 1} retries`);
                channel.ack(msg);
                // Optionally: write a record to DB about failed job for manual investigation
            }
        }
    }, { noAck: false });
}

startWorker().catch(err => {
    console.error('Worker crashed:', err);
    process.exit(1);
});
