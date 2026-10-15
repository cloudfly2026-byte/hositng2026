<?php
/**
 * Template Name: Servicio - Web Hosting
 *
 * @package Sunchi_Theme
 */

get_header();
?>

<main id="sunchi-hosting-page">
    <section class="sunchi-hero" style="padding-bottom: 40px;">
        <div class="sunchi-container sunchi-hero-grid">
            <div class="sunchi-hero-content">
                <div class="sunchi-pill-badge">
                    <span>⚡</span>
                    <?php esc_html_e('WEB HOSTING DE ALTO RENDIMIENTO', 'sunchi-theme'); ?>
                </div>
                <h1 class="sunchi-hero-title">
                    <?php esc_html_e('Hosting web ultrarrápido y seguro', 'sunchi-theme'); ?>
                </h1>
                <p class="sunchi-hero-desc">
                    <?php esc_html_e('La plataforma perfecta para blogs, sitios corporativos y tiendas online con discos NVMe, SSL gratis y soporte en español 24/7.', 'sunchi-theme'); ?>
                </p>
                <div class="sunchi-hero-buttons">
                    <a href="<?php echo sunchi_get_checkout_url('wp-starter', 'ANNUAL'); ?>" class="sunchi-btn sunchi-btn-primary">
                        <?php esc_html_e('Comenzar con Hosting Starter', 'sunchi-theme'); ?> &rarr;
                    </a>
                </div>
            </div>
            <div class="sunchi-hero-visual">
                <div class="sunchi-category-card" style="padding: 40px; box-shadow: var(--sunchi-shadow-lg); border-color: var(--sunchi-yellow);">
                    <div class="sunchi-category-icon" style="width: 70px; height: 70px;">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
                    </div>
                    <h2>Hosting Starter</h2>
                    <p style="color: var(--sunchi-text-muted); margin: 12px 0;">Desde <strong>$2.99/mes</strong> con facturación anual.</p>
                    <ul class="sunchi-plan-features">
                        <li class="sunchi-plan-feature"><span class="sunchi-check">✔</span> 1 sitio web con tráfico no medido</li>
                        <li class="sunchi-plan-feature"><span class="sunchi-check">✔</span> 10 GB de almacenamiento SSD NVMe</li>
                        <li class="sunchi-plan-feature"><span class="sunchi-check">✔</span> Certificado SSL Let's Encrypt automático</li>
                        <li class="sunchi-plan-feature"><span class="sunchi-check">✔</span> Servidores Nginx de alta velocidad</li>
                    </ul>
                </div>
            </div>
        </div>
    </section>
</main>

<?php
get_footer();
