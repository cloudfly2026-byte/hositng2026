<?php
/**
 * Template Name: Servicio - VPS
 *
 * @package Sunchi_Theme
 */

get_header();
?>

<main id="sunchi-vps-page">
    <section class="sunchi-hero" style="padding-bottom: 40px;">
        <div class="sunchi-container sunchi-hero-grid">
            <div class="sunchi-hero-content">
                <div class="sunchi-pill-badge">
                    <span>🚀</span>
                    <?php esc_html_e('SERVIDORES VIRTUALES DEDICADOS', 'sunchi-theme'); ?>
                </div>
                <h1 class="sunchi-hero-title">
                    <?php esc_html_e('VPS de alto poder con acceso root', 'sunchi-theme'); ?>
                </h1>
                <p class="sunchi-hero-desc">
                    <?php esc_html_e('Rendimiento garantizado sin sobreventa. Control total de tu entorno con recursos dedicados de CPU y RAM, discos NVMe y red de alta velocidad.', 'sunchi-theme'); ?>
                </p>
                <div class="sunchi-hero-buttons">
                    <a href="<?php echo sunchi_get_checkout_url('vps-dedicated', 'ANNUAL'); ?>" class="sunchi-btn sunchi-btn-primary">
                        <?php esc_html_e('Comenzar con VPS Pro', 'sunchi-theme'); ?> &rarr;
                    </a>
                </div>
            </div>
            <div class="sunchi-hero-visual">
                <div class="sunchi-category-card" style="padding: 40px; box-shadow: var(--sunchi-shadow-lg); border-color: var(--sunchi-yellow);">
                    <div class="sunchi-category-icon" style="width: 70px; height: 70px; color: #FFB800;">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
                    </div>
                    <h2>VPS Pro Dedicado</h2>
                    <p style="color: var(--sunchi-text-muted); margin: 12px 0;">Desde <strong>$14.99/mes</strong> con facturación anual.</p>
                    <ul class="sunchi-plan-features">
                        <li class="sunchi-plan-feature"><span class="sunchi-check">✔</span> 4 vCPU y 8 GB RAM Dedicados</li>
                        <li class="sunchi-plan-feature"><span class="sunchi-check">✔</span> 200 GB SSD NVMe de ultra velocidad</li>
                        <li class="sunchi-plan-feature"><span class="sunchi-check">✔</span> Acceso Root Completo por SSH</li>
                        <li class="sunchi-plan-feature"><span class="sunchi-check">✔</span> IPv4 dedicada y cortafuegos avanzado</li>
                    </ul>
                </div>
            </div>
        </div>
    </section>
</main>

<?php
get_footer();
