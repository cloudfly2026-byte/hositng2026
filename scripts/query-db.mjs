import { execSync } from 'node:child_process';

const sql = `SELECT * FROM plans;\nSELECT * FROM plan_versions;\n`;
const cmd = `plink -batch -hostkey "ssh-ed25519 255 SHA256:bTgaIzwlklC6Lw0zsIM2UU25jo0+Abx0vvAfqn2Cd/c" -pw Elian20200916 root@169.58.220.244 "docker exec -i velupi-postgres psql -U velupi_user -d velupi_production"`;

const res = execSync(cmd, { encoding: 'utf-8', input: sql });
console.log(res);
