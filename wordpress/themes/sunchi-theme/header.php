<?php
/**
 * Sunchi Theme Header
 *
 * @package Sunchi_Theme
 */
?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="profile" href="https://gmpg.org/xfn/11">
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>

<header class="sunchi-header" id="sunchi-main-header">
    <div class="sunchi-container sunchi-nav-wrapper">
        <!-- Brand Logo -->
        <a href="<?php echo esc_url(home_url('/')); ?>" class="sunchi-logo-link" rel="home">
            <?php
            if (has_custom_logo()) {
                the_custom_logo();
            } else {
                $logo_src = get_template_directory_uri() . '/assets/images/logo.png';
                echo '<img src="' . esc_url($logo_src) . '" alt="' . esc_attr(get_bloginfo('name', 'display')) . ' — Sunchi Hosting" class="sunchi-logo-img" width="160" height="56">';
            }
            ?>
        </a>

        <!-- Desktop Navigation -->
        <nav class="sunchi-nav" aria-label="<?php esc_attr_e('Navegación principal', 'sunchi-theme'); ?>">
            <?php
            if (has_nav_menu('primary-menu')) {
                wp_nav_menu(array(
                    'theme_location' => 'primary-menu',
                    'container'      => false,
                    'menu_class'     => 'sunchi-nav-menu',
                    'fallback_cb'    => false,
                ));
            } else {
                // Canonical Default Links matching design reference
                ?>
                <ul class="sunchi-nav-menu">
                    <li><a href="<?php echo esc_url(home_url('/')); ?>" class="sunchi-nav-link <?php echo is_front_page() ? 'active' : ''; ?>"><?php esc_html_e('Inicio', 'sunchi-theme'); ?></a></li>
                    <li><a href="<?php echo esc_url(home_url('/hosting/')); ?>" class="sunchi-nav-link"><?php esc_html_e('Hosting', 'sunchi-theme'); ?></a></li>
                    <li><a href="<?php echo esc_url(home_url('/wordpress/')); ?>" class="sunchi-nav-link"><?php esc_html_e('WordPress', 'sunchi-theme'); ?></a></li>
                    <li><a href="<?php echo esc_url(home_url('/cloud-apps/')); ?>" class="sunchi-nav-link"><?php esc_html_e('Cloud Apps', 'sunchi-theme'); ?></a></li>
                    <li><a href="<?php echo esc_url(home_url('/vps/')); ?>" class="sunchi-nav-link"><?php esc_html_e('VPS', 'sunchi-theme'); ?></a></li>
                    <li><a href="<?php echo esc_url(home_url('/precios/')); ?>" class="sunchi-nav-link <?php echo is_page('precios') ? 'active' : ''; ?>"><?php esc_html_e('Precios', 'sunchi-theme'); ?></a></li>
                    <li><a href="<?php echo esc_url(home_url('/contacto/')); ?>" class="sunchi-nav-link"><?php esc_html_e('Contacto', 'sunchi-theme'); ?></a></li>
                </ul>
                <?php
            }
            ?>
        </nav>

        <!-- Actions: Search + Auth -->
        <div class="sunchi-header-actions">
            <button class="sunchi-search-btn" aria-label="<?php esc_attr_e('Buscar en el sitio', 'sunchi-theme'); ?>" onclick="alert('Buscador activo');">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
            </button>

            <a href="<?php echo esc_url(function_exists('sunchi_get_auth_url') ? sunchi_get_auth_url('login') : 'https://app.velupi.com/login'); ?>" class="sunchi-link-login">
                <?php esc_html_e('Iniciar sesión', 'sunchi-theme'); ?>
            </a>

            <a href="<?php echo esc_url(function_exists('sunchi_get_auth_url') ? sunchi_get_auth_url('register') : 'https://app.velupi.com/register'); ?>" class="sunchi-btn sunchi-btn-primary">
                <?php esc_html_e('Crear cuenta', 'sunchi-theme'); ?>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
            </a>

            <!-- Mobile Hamburger Toggle -->
            <button class="sunchi-mobile-toggle" aria-label="<?php esc_attr_e('Abrir menú móvil', 'sunchi-theme'); ?>" aria-expanded="false">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            </button>
        </div>
    </div>
</header>
