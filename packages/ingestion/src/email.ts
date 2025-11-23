import { simpleParser, ParsedMail } from 'mailparser';
import { ImapFlow, ImapFlowOptions } from 'imapflow';

export interface EmailParseResult {
  subject: string;
  text: string;
  html?: string;
  from?: string;
  to?: string;
}

export async function parseEml(emlContent: Buffer | string): Promise<EmailParseResult> {
  const parsed: ParsedMail = await simpleParser(emlContent);
  return {
    subject: parsed.subject || '',
    text: parsed.text || '',
    html: parsed.html as string | undefined,
    from: parsed.from?.text,
    to: parsed.to?.text
  };
}

export async function fetchLatestEmail(options: ImapFlowOptions): Promise<EmailParseResult> {
  const client = new ImapFlow(options);
  await client.connect();
  try {
    await client.mailboxOpen('INBOX');
    const lock = await client.getMailboxLock('INBOX');
    try {
      const message = await client.fetchOne('*', { source: true });
      if (!message || !message.source) {
        throw new Error('No messages available');
      }
      return parseEml(message.source as Buffer);
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}
