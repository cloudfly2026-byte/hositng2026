<?php
/**
 * Plugin Name: Sunchi Velupi Bridge
 * Plugin URI: https://sunchi.com
 * Description: Conector comercial y pasarela de catálogo en tiempo real entre el sitio WordPress de Sunchi y Velupi Cloud Platform.
 * Version: 1.0.0
 * Author: Sunchi Cloud & Velupi Engineering
 * Author URI: https://velupi.com
 * License: Proprietary
 * Text Domain: sunchi-velupi-bridge
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

define('SUNCHI_VELUPI_BRIDGE_VERSION', '1.0.0');
define('SUNCHI_VELUPI_DEFAULT_API_URL', 'https://api.velupi.com');
define('SUNCHI_VELUPI_DEFAULT_CHECKOUT_URL', 'https://app.velupi.com/cart');

/**
 * 1. Build Safe Checkout URL (Zero-Trust Validation)
 */
function sunchi_get_checkout_url($plan_code = 'wp-starter', $billing_cycle = 'ANNUAL') {
    $base_checkout_url = get_option('sunchi_velupi_checkout_url', SUNCHI_VELUPI_DEFAULT_CHECKOUT_URL);
    $allowed_cycles = array('MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL', 'BIENNIAL');

    $safe_cycle = in_array(strtoupper($billing_cycle), $allowed_cycles, true) ? strtoupper($billing_cycle) : 'ANNUAL';
    $safe_plan = sanitize_key($plan_code);

    return add_query_arg(array(
        'plan'  => $safe_plan,
        'cycle' => $safe_cycle,
    ), esc_url_raw($base_checkout_url));
}

/**
 * 2. Fetch Catalog from Velupi API with Transient Caching
 */
function sunchi_fetch_catalog() {
    $cache_key = 'sunchi_velupi_catalog_cache';
    $cached = get_transient($cache_key);

    if ($cached !== false && is_array($cached)) {
        return $cached;
    }

    $api_url = get_option('sunchi_velupi_api_url', SUNCHI_VELUPI_DEFAULT_API_URL);
    $endpoint = trailingslashit($api_url) . 'catalog/plans';

    $response = wp_remote_get($endpoint, array(
        'timeout'     => 10,
        'sslverify'   => true,
        'headers'     => array(
            'Accept'     => 'application/json',
            'User-Agent' => 'Sunchi-WordPress-Bridge/' . SUNCHI_VELUPI_BRIDGE_VERSION,
        ),
    ));

    if (is_wp_error($response)) {
        // Fallback to static catalog if API is temporarily unreachable
        return sunchi_get_fallback_catalog();
    }

    $status_code = wp_remote_retrieve_response_code($response);
    if ($status_code !== 200) {
        return sunchi_get_fallback_catalog();
    }

    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);

    if (!is_array($data)) {
        return sunchi_get_fallback_catalog();
    }

    // Cache valid catalog for 1 hour (3600 seconds)
    set_transient($cache_key, $data, HOUR_IN_SECONDS);
    return $data;
}

/**
 * Fallback Catalog Definition matching official tiers
 */
function sunchi_get_fallback_catalog() {
    return array(
        array(
            'id' => 'wp-starter',
            'code' => 'wp-starter',
            'name' => 'Hosting Starter',
            'monthlyPrice' => 3.59,
            'annualPrice' => 2.99,
            'currency' => 'USD',
            'popular' => false,
        ),
        array(
            'id' => 'wp-starter',
            'code' => 'wp-starter',
            'name' => 'WordPress Pro',
            'monthlyPrice' => 7.49,
            'annualPrice' => 5.99,
            'currency' => 'USD',
            'popular' => true,
        ),
        array(
            'id' => 'cloud-apps-pro',
            'code' => 'cloud-apps-pro',
            'name' => 'Cloud Apps',
            'monthlyPrice' => 9.99,
            'annualPrice' => 7.99,
            'currency' => 'USD',
            'popular' => false,
        ),
        array(
            'id' => 'vps-dedicated',
            'code' => 'vps-dedicated',
            'name' => 'VPS Pro',
            'monthlyPrice' => 18.99,
            'annualPrice' => 14.99,
            'currency' => 'USD',
            'popular' => false,
        ),
    );
}

/**
 * 3. Shortcodes for Gutenberg & Block Editor Integration
 */
function sunchi_checkout_button_shortcode($atts) {
    $a = shortcode_atts(array(
        'plan'  => 'wp-starter',
        'cycle' => 'ANNUAL',
        'text'  => 'Comenzar ahora',
        'class' => 'sunchi-btn sunchi-btn-primary',
    ), $atts);

    $url = sunchi_get_checkout_url($a['plan'], $a['cycle']);
    return sprintf(
        '<a href="%s" class="%s">%s &rarr;</a>',
        esc_url($url),
        esc_attr($a['class']),
        esc_html($a['text'])
    );
}
add_shortcode('sunchi_checkout_button', 'sunchi_checkout_button_shortcode');

/**
 * 4. Admin Settings Page (Ajustes -> Sunchi Bridge)
 */
function sunchi_velupi_bridge_menu() {
    add_options_page(
        'Sunchi Velupi Bridge',
        'Sunchi Bridge',
        'manage_options',
        'sunchi-velupi-bridge',
        'sunchi_velupi_bridge_settings_page'
    );
}
add_action('admin_menu', 'sunchi_velupi_bridge_menu');

function sunchi_velupi_bridge_register_settings() {
    register_setting('sunchi_bridge_options', 'sunchi_velupi_api_url', array(
        'type' => 'string',
        'sanitize_callback' => 'esc_url_raw',
        'default' => SUNCHI_VELUPI_DEFAULT_API_URL,
    ));
    register_setting('sunchi_bridge_options', 'sunchi_velupi_checkout_url', array(
        'type' => 'string',
        'sanitize_callback' => 'esc_url_raw',
        'default' => SUNCHI_VELUPI_DEFAULT_CHECKOUT_URL,
    ));
}
add_action('admin_init', 'sunchi_velupi_bridge_register_settings');

function sunchi_velupi_bridge_settings_page() {
    if (!current_user_can('manage_options')) {
        return;
    }
    ?>
    <div class="wrap">
        <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
        <p>Configuración del conector transaccional entre Sunchi y Velupi Cloud Platform.</p>
        <form action="options.php" method="post">
            <?php
            settings_fields('sunchi_bridge_options');
            do_settings_sections('sunchi_bridge_options');
            ?>
            <table class="form-table">
                <tr>
                    <th scope="row"><label for="sunchi_velupi_api_url">URL de Velupi API</label></th>
                    <td>
                        <input name="sunchi_velupi_api_url" type="url" id="sunchi_velupi_api_url" value="<?php echo esc_attr(get_option('sunchi_velupi_api_url', SUNCHI_VELUPI_DEFAULT_API_URL)); ?>" class="regular-text">
                        <p class="description">Endpoint base de la API del Control Plane (ej: <code>https://api.velupi.com</code>).</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="sunchi_velupi_checkout_url">URL del Carrito de Compra</label></th>
                    <td>
                        <input name="sunchi_velupi_checkout_url" type="url" id="sunchi_velupi_checkout_url" value="<?php echo esc_attr(get_option('sunchi_velupi_checkout_url', SUNCHI_VELUPI_DEFAULT_CHECKOUT_URL)); ?>" class="regular-text">
                        <p class="description">URL del carrito de Velupi al que se dirigirán los botones "Comenzar ahora" (ej: <code>https://app.velupi.com/cart</code>).</p>
                    </td>
                </tr>
            </table>
            <?php submit_button('Guardar configuración'); ?>
        </form>
    </div>
    <?php
}
