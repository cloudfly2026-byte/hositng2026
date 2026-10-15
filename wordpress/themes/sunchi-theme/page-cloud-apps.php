<?php
/**
 * Template Name: Servicio - Cloud Apps
 *
 * @package Sunchi_Theme
 */

get_header();
?>

<main id="sunchi-cloud-apps-page">
    <section class="sunchi-hero" style="padding-bottom: 40px;">
        <div class="sunchi-container sunchi-hero-grid">
            <div class="sunchi-hero-content">
                <div class="sunchi-pill-badge">
                    <span>☁️</span>
                    <?php esc_html_e('APLICACIONES EN LA NUBE', 'sunchi-theme'); ?>
                </div>
                <h1 class="sunchi-hero-title">
                    <?php esc_html_e('Despliega tus apps modernas en segundos', 'sunchi-theme'); ?>
                </h1>
                <p class="sunchi-hero-desc">
                    <?php esc_html_e('Soporte nativo para contenedores Docker, Node.js, Next.js, Python, Django, FastAPI y bases de datos con enrutamiento SSL automático mediante Traefik.', 'sunchi-theme'); ?>
                </p>
                <div class="sunchi-hero-buttons">
                    <a href="<?php echo sunchi_get_checkout_url('cloud-apps-pro', 'ANNUAL'); ?>" class="sunchi-btn sunchi-btn-primary">
                        <?php esc_html_e('Comenzar con Cloud Apps', 'sunchi-theme'); ?> &rarr;
                    </a>
                </div>
            </div>
            <div class="sunchi-hero-visual">
                <div class="sunchi-category-card" style="padding: 40px; box-shadow: var(--sunchi-shadow-lg); border-color: var(--sunchi-blue);">
                    <div class="sunchi-category-icon" style="width: 70px; height: 70px; color: #0284C7;">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>
                    </div>
                    <h2>Cloud Apps Pro</h2>
                    <p style="color: var(--sunchi-text-muted); margin: 12px 0;">Desde <strong>$7.99/mes</strong> con facturación anual.</p>
                    <ul class="sunchi-plan-features">
                        <li class="sunchi-plan-feature"><span class="sunchi-check">✔</span> Despliegues ilimitados en contenedores</li>
                        <li class="sunchi-plan-feature"><span class="sunchi-check">✔</span> 100 GB de almacenamiento SSD</li>
                        <li class="sunchi-plan-feature"><span class="sunchi-check">✔</span> Enrutamiento HTTPS automático</li>
                        <li class="sunchi-plan-feature"><span class="sunchi-check">✔</span> Variables de entorno y secretos seguros</li>
                    </ul>
                </div>
            </div>
        </div>
    </section>
</main>

<?php
get_footer();
