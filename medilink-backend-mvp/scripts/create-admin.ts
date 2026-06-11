import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as readline from 'readline';

const prisma = new PrismaClient();

function prompt(question: string, hidden = false): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  }) as readline.Interface & {
    output: NodeJS.WritableStream;
    stdoutMuted?: boolean;
    _writeToOutput?: (value: string) => void;
  };

  if (hidden) {
    rl.stdoutMuted = true;
    rl._writeToOutput = function writeToOutput(value: string) {
      if (rl.stdoutMuted && value.trim() !== '') return;
      rl.output.write(value);
    };
  }

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer.trim());
    });
  });
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function assertValidEmail(email: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Email invalide.');
  }
}

function assertStrongPassword(password: string) {
  const failures = [
    password.length >= 12,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  if (failures < 5) {
    throw new Error('Mot de passe trop faible: 12 caracteres minimum avec majuscule, minuscule, chiffre et symbole.');
  }
}

async function confirmProductionRun() {
  if (process.env.NODE_ENV !== 'production') return;

  const confirmation = await prompt('Production: taper CREATE MEDILINK ADMIN pour continuer: ');
  if (confirmation !== 'CREATE MEDILINK ADMIN') {
    throw new Error('Operation annulee.');
  }
}

async function main() {
  await confirmProductionRun();

  const email = normalizeEmail(await prompt('Email admin: '));
  assertValidEmail(email);

  const password = await prompt('Mot de passe admin: ', true);
  const passwordConfirmation = await prompt('Confirmer le mot de passe: ', true);

  if (password !== passwordConfirmation) {
    throw new Error('Les mots de passe ne correspondent pas.');
  }

  assertStrongPassword(password);

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true, status: true, emailVerified: true, deletedAt: true },
  });

  if (existingUser) {
    console.log(`Compte existant: ${existingUser.email} (${existingUser.role}, ${existingUser.status})`);
    const confirmation = (await prompt('Promouvoir/reactiver ce compte en admin et remplacer son mot de passe ? Taper YES: ')).trim();
    if (confirmation !== 'YES') {
      console.log('Operation annulee.');
      return;
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = existingUser
    ? await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          passwordHash,
          role: UserRole.MEDILINK_ADMIN,
          status: UserStatus.ACTIVE,
          emailVerified: true,
          deletedAt: null,
        },
      })
    : await prisma.user.create({
        data: {
          email,
          passwordHash,
          role: UserRole.MEDILINK_ADMIN,
          status: UserStatus.ACTIVE,
          emailVerified: true,
        },
      });

  await prisma.auditLog.create({
    data: {
      actorUserId: null,
      action: existingUser ? 'admin.bootstrap_promoted' : 'admin.bootstrap_created',
      entityType: 'user',
      entityId: user.id,
      metadata: {
        email: user.email,
        role: user.role,
        source: 'scripts/create-admin.ts',
      },
    },
  });

  console.log(`Compte admin pret: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
