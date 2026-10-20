import { runHestia } from './exec-hestia.mjs';

function sh(label, cmd) {
  console.log('--- ' + label + ' ---');
  try {
    console.log(runHestia(cmd).trim() || '(none)');
  } catch (err) {
    console.log('ERR:', (err.stderr || err.stdout || '').trim());
  }
}

const STAMP = '20261020-radicale';

sh('backup config roundcube', `cp -a /etc/roundcube/config.inc.php /etc/roundcube/config.inc.php.bak-${STAMP} && ls -la /etc/roundcube/config.inc.php.bak-${STAMP}`);
sh('backup plugins list snapshot', `cp -a /etc/roundcube/config.inc.php /root/roundcube-config-before-radicale-${STAMP}.php && echo saved`);
sh('dump roundcube db', `mkdir -p /root/backups && mysqldump --single-transaction --quick --routines --events roundcube > /root/backups/roundcube-${STAMP}.sql 2>/root/backups/roundcube-${STAMP}.err; echo "exit=$?"; ls -la /root/backups/roundcube-${STAMP}.sql; head -c 200 /root/backups/roundcube-${STAMP}.err`);
sh('verify dump content', `grep -c 'CREATE TABLE' /root/backups/roundcube-${STAMP}.sql; grep -o 'CREATE TABLE \`[a-z_]*\`' /root/backups/roundcube-${STAMP}.sql | head -12`);
sh('disk space', `df -h / | tail -1; free -m | head -2`);
