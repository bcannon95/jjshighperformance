import apn from 'apn';

let provider: apn.Provider | null = null;

function getProvider(): apn.Provider {
  if (provider) return provider;

  const key = (process.env.APNS_KEY ?? '').replace(/\\n/g, '\n');

  provider = new apn.Provider({
    token: {
      key,
      keyId: process.env.APNS_KEY_ID!,
      teamId: process.env.APNS_TEAM_ID!,
    },
    production: process.env.NODE_ENV === 'production',
  });

  return provider;
}

export type ApnsPayload = {
  title: string;
  body: string;
  url?: string;
  conversationId?: number;
};

export async function sendApnsNotification(
  deviceTokens: string[],
  payload: ApnsPayload,
): Promise<{ sent: number; failed: string[] }> {
  if (deviceTokens.length === 0) return { sent: 0, failed: [] };

  const p = getProvider();
  const note = new apn.Notification();
  note.expiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour TTL
  note.badge = 1;
  note.sound = 'default';
  note.alert = { title: payload.title, body: payload.body };
  note.topic = process.env.APNS_BUNDLE_ID!;
  note.payload = { url: payload.url ?? '/messages', conversationId: payload.conversationId };

  const result = await p.send(note, deviceTokens);

  const failed = result.failed.map((f) => f.device);
  const sent = result.sent.length;

  return { sent, failed };
}
