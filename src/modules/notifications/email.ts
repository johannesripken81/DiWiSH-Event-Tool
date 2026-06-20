export type EmailMessage = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
};

export type EmailSendResult = {
  id?: string;
};

export type SendEmail = (message: EmailMessage) => Promise<EmailSendResult>;

export type ResendEmailConfig = {
  apiKey: string;
};

export function getResendEmailConfig(
  env: NodeJS.ProcessEnv = process.env,
): ResendEmailConfig | null {
  const apiKey = env.RESEND_API_KEY?.trim();

  return apiKey ? { apiKey } : null;
}

export async function sendResendEmail(
  message: EmailMessage,
  config = getResendEmailConfig(),
): Promise<EmailSendResult> {
  if (!config) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: message.from,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
      ...(message.replyTo ? { reply_to: message.replyTo } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Resend email request failed with ${response.status}: ${body}`,
    );
  }

  const result = (await response.json().catch(() => ({}))) as {
    id?: string;
  };

  return { id: result.id };
}
