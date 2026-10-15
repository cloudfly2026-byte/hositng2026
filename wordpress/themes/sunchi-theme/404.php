<?php
/**
 * Sunchi 404 Template
 *
 * @package Sunchi_Theme
 */

get_header();
?>

<main class="sunchi-container" style="padding: 100px 24px; text-align: center;">
    <div class="sunchi-pill-badge" style="margin-bottom: 16px;">
        <span>☀️</span>
        <?php esc_html_e('PÁGINA NO ENCONTRADA', 'sunchi-theme'); ?>
    </div>
    <h1 style="font-size: 5rem; color: #FF6B00; margin-bottom: 12px;">404</h1>
    <h2 style="font-size: 2rem; color: #2D1B17; margin-bottom: 20px;">
        <?php esc_html_e('¡Ups! Esta página se fue a tomar el sol', 'sunchi-theme'); ?>
    </h2>
    <p style="color: #667085; font-size: 1.1rem; max-width: 500px; margin: 0 auto 30px auto;">
        <?php esc_html_e('No te preocupes, puedes volver al inicio o revisar nuestros planes de hosting.', 'sunchi-theme'); ?>
    </p>
    <a href="<?php echo esc_url(home_url('/')); ?>" class="sunchi-btn sunchi-btn-primary">
        <?php esc_html_e('Volver al inicio', 'sunchi-theme'); ?> &rarr;
    </a>
</main>

<?php
get_footer();
