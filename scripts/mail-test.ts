/**
 * Verifies SMTP credentials, and optionally sends one real test message.
 *
 *   npm run mail:test              — connect and authenticate only, sends nothing
 *   npm run mail:test -- --send    — also send a test email to the lead recipients
 *
 * Exists because the alternative way to test outbound mail is to submit the
 * real form, which writes a junk row to the production database and burns a
 * lead record to answer a question about SMTP.
 *
 * Never prints SMTP_PASS.
 */

import 'dotenv/config';
import nodemailer from 'nodemailer';

const HOST = process.env.SMTP_HOST || '';
const PORT = Number(process.env.SMTP_PORT || 587);
const USER = process.env.SMTP_USER || '';
const PASS = process.env.SMTP_PASS || '';
const SECURE = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : PORT === 465;
const FROM = process.env.MAIL_FROM || USER;

const TO = ['ali@optimizeindex.com', 'contact@optimizeindex.com'];

function mask(v: string): string {
  if (!v) return '(unset)';
  return v.length <= 4 ? '****' : `${v.slice(0, 2)}${'*'.repeat(6)}${v.slice(-2)}`;
}

async function main() {
  console.log('\nSMTP configuration');
  console.log(`  SMTP_HOST    ${HOST || '(unset)'}`);
  console.log(`  SMTP_PORT    ${PORT}`);
  console.log(`  SMTP_SECURE  ${SECURE}  ${process.env.SMTP_SECURE ? '' : '(derived from port)'}`);
  console.log(`  SMTP_USER    ${USER || '(unset)'}`);
  console.log(`  SMTP_PASS    ${mask(PASS)}`);
  console.log(`  MAIL_FROM    ${FROM || '(unset)'}`);

  const missing = [
    ['SMTP_HOST', HOST],
    ['SMTP_USER', USER],
    ['SMTP_PASS', PASS],
    ['MAIL_FROM', FROM],
  ]
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length > 0) {
    console.error(`\nFAIL  missing: ${missing.join(', ')}`);
    console.error('Add them to .env — see .env.example for the full list.');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host: HOST,
    port: PORT,
    secure: SECURE,
    auth: { user: USER, pass: PASS },
  });

  process.stdout.write('\nConnecting and authenticating... ');
  try {
    await transporter.verify();
    console.log('OK');
  } catch (err) {
    console.log('FAILED');
    console.error(`\n${(err as Error).message}\n`);
    console.error('Common causes:');
    console.error('  - wrong SMTP_PORT / SMTP_SECURE pair (465 = true, 587 = false)');
    console.error('  - the mailbox needs an app password rather than the login password');
    console.error('  - the host firewalls outbound 587/465');
    process.exit(1);
  }

  if (!process.argv.includes('--send')) {
    console.log('\nCredentials are good. Re-run with --send to deliver a test message.\n');
    return;
  }

  process.stdout.write(`Sending test message to ${TO.join(', ')}... `);
  try {
    const info = await transporter.sendMail({
      from: FROM,
      to: TO.join(', '),
      subject: 'OptimizeIndex SMTP test',
      text: 'If you are reading this, lead notifications will arrive at this address.',
    });
    console.log('OK');
    console.log(`  messageId  ${info.messageId}`);
    if (info.rejected?.length) console.log(`  rejected   ${info.rejected.join(', ')}`);
    console.log('');
  } catch (err) {
    console.log('FAILED');
    console.error(`\n${(err as Error).message}\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
