// =========================================================
// تایید initData که تلگرام به مینی‌اپ میده
// بدون این چک، هر کسی میتونه با ساختن یه initData ساختگی
// جای یک بازیکن دیگه اکشن بزنه - این حیاتی‌ترین بخش امنیتی مینی‌اپه
// الگوریتم رسمی تلگرام: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
// =========================================================

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

export interface VerifiedWebAppUser {
  userId: number;
  firstName?: string;
}

// maxAgeSeconds: بعد از این مدت initData رو منقضی در نظر میگیریم (پیش‌فرض ۱ روز)
export async function verifyTelegramWebAppInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 86400
): Promise<VerifiedWebAppUser | null> {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  // secret_key = HMAC_SHA256(bot_token, key="WebAppData")
  const secretKey = await hmacSha256(new TextEncoder().encode("WebAppData"), botToken);
  const computedHashBytes = await hmacSha256(secretKey, dataCheckString);
  const computedHash = bytesToHex(computedHashBytes);

  if (computedHash !== hash) return null;

  const authDate = Number(params.get("auth_date") ?? "0");
  if (!authDate || Date.now() / 1000 - authDate > maxAgeSeconds) return null;

  const userJson = params.get("user");
  if (!userJson) return null;

  const user = JSON.parse(userJson);
  if (typeof user.id !== "number") return null;

  return { userId: user.id, firstName: user.first_name };
}
