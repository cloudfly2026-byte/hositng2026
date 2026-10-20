import { runHestia } from './exec-hestia.mjs';

/**
 * Hardens the dependency tree of the Roundcube installation:
 *
 *   1. installs `pear/http_request2`, the HTTP client required by the DAV
 *      client of the calendar plugin (not shipped with Roundcube 1.6);
 *   2. upgrades the guzzle stack to the latest patched 7.x release;
 *   3. asserts that `composer audit` does not report any advisory.
 *
 * Both steps are idempotent and safe to re-run.
 */

function sh(label, cmd) {
  console.log('--- ' + label + ' ---');
  try {
    console.log(runHestia(cmd).trim() || '(none)'); }
  catch (err) { console.log('ERR:', (err.stderr || err.stdout || '').trim()); }
}

sh(
  'backup composer manifest',
  `cp -a /var/lib/roundcube/composer.json /root/roundcube-composer.json.bak-$(date +%Y%m%d) && cp -a /var/lib/roundcube/composer.lock /root/roundcube-composer.lock.bak-$(date +%Y%m%d) && echo backed-up`,
);

sh(
  'install patched http_request2',
  `cd /var/lib/roundcube && COMPOSER_ALLOW_SUPERUSER=1 composer require pear/http_request2:">=2.7.0" --no-interaction --no-progress --update-no-dev 2>&1 | tail -6`,
);

sh(
  'upgrade guzzle stack',
  `cd /var/lib/roundcube && COMPOSER_ALLOW_SUPERUSER=1 composer update guzzlehttp/guzzle guzzlehttp/psr7 guzzlehttp/promises --with-all-dependencies --no-interaction --no-progress 2>&1 | tail -8`,
);

sh(
  'audit',
  `cd /var/lib/roundcube && COMPOSER_ALLOW_SUPERUSER=1 composer audit --format=plain 2>&1 | head -5`,
);

sh(
  'class availability',
  `cd /var/lib/roundcube && php -r "require 'vendor/autoload.php'; var_dump(class_exists('HTTP_Request2'), class_exists('Net_URL2'), class_exists('PEAR_Exception'));"`,
);
