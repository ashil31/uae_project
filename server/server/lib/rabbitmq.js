// lib/rabbitmq.js
import dotenv from 'dotenv';
dotenv.config(); // make sure env is loaded if not already

import amqplib from 'amqplib';

let connection = null;
let channel = null;

export async function getChannel() {
  if (channel) return channel;

  // Accept either RABBITMQ_URL or RABBIT_URL (your .env used RABBIT_URL)
  const url = process.env.RABBITMQ_URL || process.env.RABBIT_URL;
  if (!url) throw new Error('RABBITMQ_URL (or RABBIT_URL) is not set in env');

  // connect (CloudAMQP typically uses amqps://)
  connection = await amqplib.connect(url, { heartbeat: 60 });
  channel = await connection.createChannel();
  return channel;
}

export async function closeConnection() {
  try {
    await channel?.close();
    await connection?.close();
  } catch (e) {
    console.warn('RabbitMQ close error', e);
  } finally {
    channel = null;
    connection = null;
  }
}
