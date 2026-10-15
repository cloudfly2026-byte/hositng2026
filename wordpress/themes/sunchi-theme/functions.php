<?php
/**
 * Sunchi Theme Functions and Definitions
 *
 * @package Sunchi_Theme
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

define('SUNCHI_THEME_VERSION', '1.0.0');

/**
 * 1. Theme Setup
 */
function sunchi_theme_setup() {
    // Make theme available for translation
    load_theme_textdomain('sunchi-theme', get_template_directory() . '/languages');

    // Add default posts and comments RSS feed links to head
    add_theme_support('automatic-feed-links');

    // Let WordPress manage the document title
    add_theme_support('title-tag');

    // Enable support for Post Thumbnails on posts and pages
    add_theme_support('post-thumbnails');

    // Custom Logo Support
    add_theme_support('custom-logo', array(
        'height'      => 80,
        'width'       => 240,
        'flex-height' => true,
        'flex-width'  => true,
    ));

    // HTML5 markup support
    add_theme_support('html5', array(
        'search-form',
        'comment-form',
        'comment-list',
        'gallery',
        'caption',
        'style',
        'script',
    ));

    // Register Navigation Menus
    register_nav_menus(array(
        'primary-menu'     => esc_html__('Header Navigation Menu', 'sunchi-theme'),
        'footer-products'  => esc_html__('Footer Productos', 'sunchi-theme'),
        'footer-resources' => esc_html__('Footer Recursos', 'sunchi-theme'),
        'footer-company'   => esc_html__('Footer Empresa', 'sunchi-theme'),
    ));
}
add_action('after_setup_theme', 'sunchi_theme_setup');

/**
 * 2. Enqueue Styles & Scripts
 */
function sunchi_theme_scripts() {
    // Google Fonts: Poppins (600, 700, 800) & Inter (400, 500, 600, 700)
    wp_enqueue_style(
        'sunchi-google-fonts',
        'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700;800&display=swap',
        array(),
        null
    );

    // Theme Variables Stylesheet
    wp_enqueue_style(
        'sunchi-style',
        get_stylesheet_uri(),
        array(),
        SUNCHI_THEME_VERSION
    );

    // Main Theme Stylesheet
    wp_enqueue_style(
        'sunchi-main-css',
        get_template_directory_uri() . '/assets/css/main.css',
        array('sunchi-style'),
        SUNCHI_THEME_VERSION
    );

    // Client Interactions Script
    wp_enqueue_script(
        'sunchi-main-js',
        get_template_directory_uri() . '/assets/js/main.js',
        array(),
        SUNCHI_THEME_VERSION,
        true
    );
}
add_action('wp_enqueue_scripts', 'sunchi_theme_scripts');

/**
 * 3. Checkout & Velupi Integration Helpers
 */
function sunchi_get_checkout_url($plan_code = 'wp-starter', $billing_cycle = 'ANNUAL') {
    $base_url = get_theme_mod('sunchi_checkout_base_url', 'https://app.velupi.com/cart');
    $allowed_cycles = array('MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL', 'BIENNIAL');

    $safe_cycle = in_array(strtoupper($billing_cycle), $allowed_cycles, true) ? strtoupper($billing_cycle) : 'ANNUAL';
    $safe_plan = sanitize_key($plan_code);

    return add_query_arg(array(
        'plan'  => $safe_plan,
        'cycle' => $safe_cycle,
    ), esc_url($base_url));
}

function sunchi_get_auth_url($action = 'login') {
    if ($action === 'register') {
        return esc_url(get_theme_mod('sunchi_register_url', 'https://app.velupi.com/register'));
    }
    return esc_url(get_theme_mod('sunchi_login_url', 'https://app.velupi.com/login'));
}

/**
 * 4. Customizer Settings
 */
function sunchi_customize_register($wp_customize) {
    // Section: Sunchi Cloud URLs
    $wp_customize->add_section('sunchi_cloud_section', array(
        'title'    => esc_html__('Sunchi Cloud / Velupi Integration', 'sunchi-theme'),
        'priority' => 30,
    ));

    // Setting: Base Checkout URL
    $wp_customize->add_setting('sunchi_checkout_base_url', array(
        'default'           => 'https://app.velupi.com/cart',
        'sanitize_callback' => 'esc_url_raw',
    ));
    $wp_customize->add_control('sunchi_checkout_base_url', array(
        'label'    => esc_html__('URL Base del Carrito de Compra', 'sunchi-theme'),
        'section'  => 'sunchi_cloud_section',
        'type'     => 'url',
    ));

    // Setting: Login URL
    $wp_customize->add_setting('sunchi_login_url', array(
        'default'           => 'https://app.velupi.com/login',
        'sanitize_callback' => 'esc_url_raw',
    ));
    $wp_customize->add_control('sunchi_login_url', array(
        'label'    => esc_html__('URL de Inicio de Sesión', 'sunchi-theme'),
        'section'  => 'sunchi_cloud_section',
        'type'     => 'url',
    ));

    // Setting: Register URL
    $wp_customize->add_setting('sunchi_register_url', array(
        'default'           => 'https://app.velupi.com/register',
        'sanitize_callback' => 'esc_url_raw',
    ));
    $wp_customize->add_control('sunchi_register_url', array(
        'label'    => esc_html__('URL de Registro / Crear Cuenta', 'sunchi-theme'),
        'section'  => 'sunchi_cloud_section',
        'type'     => 'url',
    ));
}
add_action('customize_register', 'sunchi_customize_register');
