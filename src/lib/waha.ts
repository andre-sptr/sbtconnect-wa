import { getWahaConfig } from "@/lib/config";

type WahaSendResponse = {
  id?: { _serialized?: string };
  _data?: { id?: { _serialized?: string } };
};

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
