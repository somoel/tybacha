import { Expo, type ExpoPushMessage } from 'expo-server-sdk';
import type { RowDataPacket } from 'mysql2';
import { pool } from '../db/pool.js';

const expo = new Expo();

interface PushTokenRow extends RowDataPacket {
  token_expo: string;
}

export async function sendPushToUser(input: {
  idUsuario: number;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  const [rows] = await pool.query<PushTokenRow[]>(
    `select token_expo
     from token_push_dispositivo
     where id_usuario = :idUsuario and activo = 1`,
    { idUsuario: input.idUsuario },
  );

  const messages: ExpoPushMessage[] = rows
    .filter((row) => Expo.isExpoPushToken(row.token_expo))
    .map((row) => ({
      to: row.token_expo,
      title: input.title,
      body: input.body,
      data: input.data,
      sound: 'default',
      channelId: 'default',
      priority: 'high',
    }));

  if (messages.length === 0) return;

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    await expo.sendPushNotificationsAsync(chunk);
  }
}
