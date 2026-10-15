<?php
/**
 * Template Name: Servicio - WordPress Hosting
 *
 * @package Sunchi_Theme
 */

get_header();
?>

<main id="sunchi-wordpress-page">
    <section class="sunchi-hero" style="padding-bottom: 40px;">
        <div class="sunchi-container sunchi-hero-grid">
            <div class="sunchi-hero-content">
                <div class="sunchi-pill-badge">
                    <span>🌟</span>
                    <?php esc_html_e('OPTIMIZADO PARA WORDPRESS', 'sunchi-theme'); ?>
                </div>
                <h1 class="sunchi-hero-title">
                    <?php esc_html_e('WordPress Hosting gestionado y seguro', 'sunchi-theme'); ?>
                </h1>
                <p class="sunchi-hero-desc">
                    <?php esc_html_e('Instalación en 1 clic, actualizaciones automáticas, caché a nivel de servidor y copias de seguridad diarias para que tu web vuele.', 'sunchi-theme'); ?>
                </p>
                <div class="sunchi-hero-buttons">
                    <a href="<?php echo sunchi_get_checkout_url('wp-starter', 'ANNUAL'); ?>" class="sunchi-btn sunchi-btn-primary">
                        <?php esc_html_e('Comenzar con WordPress Pro', 'sunchi-theme'); ?> &rarr;
                    </a>
                </div>
            </div>
            <div class="sunchi-hero-visual">
                <div class="sunchi-category-card" style="padding: 40px; box-shadow: var(--sunchi-shadow-lg); border-color: var(--sunchi-primary);">
                    <div class="sunchi-category-icon" style="width: 70px; height: 70px; color: #0284C7;">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18.2A8.2 8.2 0 0 1 3.8 12 8.1 8.1 0 0 1 5.3 7.3l5.3 12.1zm5.2-12a1.6 1.6 0 0 0-.2-.1l-3.3 9.6-1.9-5.7 1.3-3.6a4.8 4.8 0 0 1 2.2-.2zm-8.8 0a1.5 1.5 0 0 1 1.7.1l-2.4 6.8zm11 5.8a8.2 8.2 0 0 1-5.6 5.8l3.4-9.8a8 8 0 0 1 2.2 4z"/></svg>
                    </div>
                    <h2>WordPress Pro</h2>
                    <p style="color: var(--sunchi-text-muted); margin: 12px 0;">Desde <strong>$5.99/mes</strong> con facturación anual.</p>
                    <ul class="sunchi-plan-features">
                        <li class="sunchi-plan-feature"><span class="sunchi-check">✔</span> Sitios web ilimitados</li>
                        <li class="sunchi-plan-feature"><span class="sunchi-check">✔</span> 50 GB de almacenamiento ultra veloz</li>
                        <li class="sunchi-plan-feature"><span class="sunchi-check">✔</span> Copias de seguridad automáticas</li>
                        <li class="sunchi-plan-feature"><span class="sunchi-check">✔</span> Soporte 24/7 prioritario en español</li>
                    </ul>
                </div>
            </div>
        </div>
    </section>
</main>

<?php
get_footer();
