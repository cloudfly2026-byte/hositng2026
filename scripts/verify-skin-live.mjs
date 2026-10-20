import { runHestia } from './exec-hestia.mjs';

function sh(label, cmd) {
  console.log('--- ' + label + ' ---');
  try {
    console.log(runHestia(cmd).trim() || '(empty)');
  } catch (err) {
    console.log('STDERR:', (err.stderr || '').trim());
  }
}

sh('logo img tag', `curl -sk 'http://webmail.cloudfly.com.co/' | grep -o '<img[^>]*id=.logo.[^>]*>'`);

sh('file exists from php', `php -r 'var_dump(realpath("/var/lib/roundcube/skins/velupi/images/logo.svg"));'`);

sh('skin_paths order check', `grep -n 'load_skin(' /var/lib/roundcube/program/include/rcmail_output_html.php | head -5`);

sh('how object logo renders', `grep -n "'logo'" /var/lib/roundcube/program/include/rcmail_output_html.php | head -5`);
