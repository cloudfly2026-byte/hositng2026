import { execSync } from 'node:child_process';

const sql = `
INSERT INTO users (id, email, "fullName", "emailVerified", "passwordHash", "createdAt", "updatedAt")
VALUES (
  'usr-velupi-superadmin',
  'admin@velupi.com',
  'Velupi Super Administrator',
  true,
  '$argon2id$v=19$m=16384,t=3,p=1$d7b037ca4956f0b8b4622c608505d781$739ac947a218219c146d118ce8f11ff8dbd8608f3fd8f648b9e97c979ea25f04',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  "fullName" = EXCLUDED."fullName",
  "emailVerified" = true,
  "passwordHash" = EXCLUDED."passwordHash",
  "updatedAt" = NOW();

INSERT INTO organizations (id, name, slug, "ownerUserId", "isInternalPilot", "createdAt", "updatedAt")
VALUES (
  'org-velupi-internal',
  'Velupi Cloud Platform',
  'velupi-internal',
  'usr-velupi-superadmin',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  "isInternalPilot" = true,
  "updatedAt" = NOW();

INSERT INTO memberships (id, "userId", "organizationId", role, "createdAt")
VALUES (
  'mem-velupi-superadmin',
  'usr-velupi-superadmin',
  'org-velupi-internal',
  'SUPER_ADMIN',
  NOW()
)
ON CONFLICT ("userId", "organizationId") DO UPDATE SET
  role = 'SUPER_ADMIN';

SELECT id, email, "fullName", "emailVerified" FROM users WHERE email = 'admin@velupi.com';
SELECT id, name, slug FROM organizations WHERE id = 'org-velupi-internal';
SELECT id, "userId", "organizationId", role FROM memberships WHERE "userId" = 'usr-velupi-superadmin';
`;
const sshPw = process.env.VPS_SSH_PASSWORD || process.env.SSH_PASSWORD || '';
const cmd = `plink -batch -hostkey "ssh-ed25519 255 SHA256:bTgaIzwlklC6Lw0zsIM2UU25jo0+Abx0vvAfqn2Cd/c" -pw ${sshPw} root@169.58.220.244 "docker exec -i velupi-postgres psql -U velupi_user -d velupi_production"`;

const res = execSync(cmd, { encoding: 'utf-8', input: sql });
console.log(res);
