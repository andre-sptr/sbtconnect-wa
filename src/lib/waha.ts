import { getWahaConfig } from "@/lib/config";
import { normalizeWhatsappNumber } from "@/lib/contact-utils";

type WahaSendResponse = {
  id?: { _serialized?: string };
  _data?: { id?: { _serialized?: string } };
};

type WahaChat = {
  id?: { server?: string; user?: string; _serialized?: string };
  name?: string;
};

/**
 * Resolve a LID chat ID to a phone number by querying WAHA's chat info.
 * WAHA returns the phone number in the `name` field for LID-based chats.
 */
export async function resolvePhoneFromLid(lidChatId: string): Promise<string | null> {
  if (!lidChatId.endsWith("@lid")) return null;

  const config = getWahaConfig();

  try {
    const response = await fetch(
      `${config.url}/api/${encodeURIComponent(config.session)}/chats/${encodeURIComponent(lidChatId)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-Api-Key": config.apiKey,
        },
      }
    );

    if (!response.ok) return null;

    const chat: WahaChat = await response.json();
    if (!chat.name) return null;

    const normalized = normalizeWhatsappNumber(chat.name);
    if (normalized && normalized.endsWith("@c.us")) {
      return normalized;
    }

    return null;
  } catch {
    return null;
  }
}

export async function sendWahaText(input: { chatId: string; text: string }) {
  const config = getWahaConfig();
  const response = await fetch(`${config.url}/api/sendText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Api-Key": config.apiKey,
    },
    body: JSON.stringify({
      session: config.session,
      chatId: input.chatId,
      text: input.text,
    }),
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`WAHA sendText failed ${response.status}: ${responseText.slice(0, 500)}`);
  }

  let json: WahaSendResponse | null = null;
  try {
    json = responseText ? (JSON.parse(responseText) as WahaSendResponse) : null;
  } catch {
    json = null;
  }

  return json?.id?._serialized || json?._data?.id?._serialized || null;
}
