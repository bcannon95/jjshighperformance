import apn from '@parse/node-apn';

let provider: apn.Provider | null = null;

function normaliseKey(raw: string): string {
  const body = raw
    .replace(/^["']|["']$/g, '')   // strip wrapping quotes
    .replace(/\\n/g, '\n')          // unescape \n literals
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');           // collapse all whitespace
  const lines = body.match(/.{1,64}/g) ?? [];
  return `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----\n`;
}

function getProvider(): apn.Provider {
  if (provider) return provider;

  provider = new apn.Provider({
    token: {
      key:    normaliseKey(process.env.APNS_KEY ?? ''),
      keyId:  process.env.APNS_KEY_ID!,
      teamId: process.env.APNS_TEAM_ID!,
    },
    production: process.env.APNS_PRODUCTION !== 'false',
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
