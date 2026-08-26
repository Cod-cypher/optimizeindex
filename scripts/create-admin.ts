/**
 * Creates (or updates the password of) an admin account.
 *
 *   npm run admin -- you@example.com "a long passphrase" "Your Name"
 *
 * Run once on the server after deploying. There is no self-signup route and no
 * password-reset email — this script is the only way an account comes into
 * existence, which is the intent for a two-person tool.
 *
 * Passing the password as an argument means it lands in your shell history.
 * On a shared box, prefix the command with a space (most shells then skip the
 * history entry) or change the password again afterwards.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../server/auth";

const prisma = new PrismaClient();

async function main() {
  const [emailRaw, password, name] = process.argv.slice(2);

  if (!emailRaw || !password) {
    console.error("Usage: npm run admin -- <email> <password> [name]");
    process.exit(1);
  }

  const email = emailRaw.trim().toLowerCase();

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error(`"${emailRaw}" does not look like an email address.`);
    process.exit(1);
  }

  // 12 is not arbitrary: this account can read every prospect's business data
  // and the site is reachable from the open internet.
  if (password.length < 12) {
    console.error("Password must be at least 12 characters.");
    process.exit(1);
  }

  const passwordHash = hashPassword(password);

  const existing = await prisma.adminUser.findUnique({ where: { email } });

  if (existing) {
    await prisma.adminUser.update({
      where: { email },
      // Reactivate too — otherwise resetting a disabled account's password
      // would leave it unable to log in, with no obvious reason why.
      data: { passwordHash, isActive: true, ...(name ? { name } : {}) },
    });
    console.log(`Password updated for ${email}.`);
    console.log("Existing sessions stay valid until they expire.");
  } else {
    await prisma.adminUser.create({
      data: { email, passwordHash, name: name || null },
    });
    console.log(`Admin account created: ${email}`);
  }

  console.log("Sign in at /admin");
}

main()
  .catch((err) => {
    console.error("[create-admin] failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
