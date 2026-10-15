<?php
/**
 * Template Name: Planes y Precios
 * Template Post Type: page
 *
 * Faithfully reproducing Image 1: Design of Sunchi Pricing & Plans Page
 *
 * @package Sunchi_Theme
 */

get_header();
?>

<main id="sunchi-pricing-content">
    <!-- 1. HERO PRECIOS -->
    <section class="sunchi-hero" style="padding-bottom: 50px;">
        <div class="sunchi-container sunchi-hero-grid">
            <div class="sunchi-hero-content">
                <div class="sunchi-pill-badge">
                    <span>📊</span>
                    <?php esc_html_e('PLANES PARA CADA GRAN IDEA', 'sunchi-theme'); ?>
                </div>

                <h1 class="sunchi-hero-title">
                    <?php esc_html_e('Planes y precios', 'sunchi-theme'); ?>
                </h1>

                <p class="sunchi-hero-desc">
                    <?php esc_html_e('Elige el plan perfecto para tu proyecto y lleva tus ideas al siguiente nivel.', 'sunchi-theme'); ?>
                </p>

                <div class="sunchi-trust-indicators" style="border-top: none; padding-top: 0;">
                    <div class="sunchi-trust-item">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                        <?php esc_html_e('Sin sorpresas en la factura', 'sunchi-theme'); ?>
                    </div>
                    <div class="sunchi-trust-item">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                        <?php esc_html_e('Activa en minutos y empieza hoy', 'sunchi-theme'); ?>
                    </div>
                    <div class="sunchi-trust-item">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                        <?php esc_html_e('Soporte humano en español 24/7', 'sunchi-theme'); ?>
                    </div>
                </div>
            </div>

            <!-- Sun Character with Browser Preview -->
            <div class="sunchi-hero-visual">
                <div class="sunchi-sun-illustration">
                    <div class="sunchi-sun-character">
                        <!-- Playful smiling sun bag character -->
                        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <!-- Bag handles -->
                            <path d="M75 55C75 40 125 40 125 55" stroke="#FF6B00" stroke-width="8" stroke-linecap="round"/>
                            <!-- Sun bag body -->
                            <rect x="40" y="55" width="120" height="110" rx="28" fill="url(#sun_bag_grad)"/>
                            <!-- Beaming Rays -->
                            <path d="M100 15V28M175 45L163 55M25 45L37 55M185 110H170M30 110H15M170 170L158 158M30 170L42 158" stroke="#FFB800" stroke-width="6" stroke-linecap="round"/>
                            <!-- Cheerful face -->
                            <ellipse cx="80" cy="100" rx="5" ry="8" fill="#2D1B17"/>
                            <ellipse cx="120" cy="100" rx="5" ry="8" fill="#2D1B17"/>
                            <path d="M82 120C88 135 112 135 118 120" stroke="#2D1B17" stroke-width="5" stroke-linecap="round"/>
                            <circle cx="70" cy="115" r="7" fill="#FF9100" opacity="0.6"/>
                            <circle cx="130" cy="115" r="7" fill="#FF9100" opacity="0.6"/>
                            <defs>
                                <linearGradient id="sun_bag_grad" x1="40" y1="55" x2="160" y2="165" gradientUnits="userSpaceOnUse">
                                    <stop stop-color="#FFD54A"/>
                                    <stop offset="0.6" stop-color="#FFB800"/>
                                    <stop offset="1" stop-color="#FF6B00"/>
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>

                    <div class="sunchi-browser-mockup" style="margin-top: -30px;">
                        <ul style="list-style: none; display: flex; flex-direction: column; gap: 8px; font-size: 0.9rem; font-weight: 600; color: #2D1B17;">
                            <li style="display: flex; align-items: center; gap: 8px;"><span style="color: #16A34A;">✔</span> <?php esc_html_e('Rápido', 'sunchi-theme'); ?></li>
                            <li style="display: flex; align-items: center; gap: 8px;"><span style="color: #16A34A;">✔</span> <?php esc_html_e('Seguro', 'sunchi-theme'); ?></li>
                            <li style="display: flex; align-items: center; gap: 8px;"><span style="color: #16A34A;">✔</span> <?php esc_html_e('Confiable', 'sunchi-theme'); ?></li>
                            <li style="display: flex; align-items: center; gap: 8px;"><span style="color: #16A34A;">✔</span> <?php esc_html_e('Siempre online', 'sunchi-theme'); ?></li>
                        </ul>
                        <div style="font-family: cursive, sans-serif; color: #FF6B00; font-size: 0.85rem; margin-top: 10px; text-align: right;">
                            <?php esc_html_e('Tu próxima gran idea empieza aquí', 'sunchi-theme'); ?> ✍
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- 2. BILLING SWITCHER & SAVINGS TAG -->
    <section class="sunchi-section-plans" style="padding-top: 20px;">
        <div class="sunchi-container">
            <div class="sunchi-billing-toggle-wrapper">
                <div class="sunchi-billing-switcher">
                    <button type="button" class="sunchi-billing-btn" data-cycle="MONTHLY">
                        <?php esc_html_e('Pago mensual', 'sunchi-theme'); ?>
                    </button>
                    <button type="button" class="sunchi-billing-btn active" data-cycle="ANNUAL">
                        <?php esc_html_e('Pago anual', 'sunchi-theme'); ?>
                    </button>
                </div>

                <div class="sunchi-savings-tag">
                    <span>🏷️</span>
                    <span><?php esc_html_e('Ahorra hasta 20% con el pago anual', 'sunchi-theme'); ?></span>
                </div>
            </div>

            <!-- 3. DETAILED 4 PRICING CARDS -->
            <div class="sunchi-pricing-grid">
                <!-- Hosting Starter -->
                <div class="sunchi-plan-card">
                    <div class="sunchi-plan-header">
                        <div class="sunchi-plan-icon" style="color: #FF6B00;">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
                        </div>
                        <h3 class="sunchi-plan-name"><?php esc_html_e('Hosting Starter', 'sunchi-theme'); ?></h3>
                        <p class="sunchi-plan-tagline"><?php esc_html_e('Ideal para comenzar', 'sunchi-theme'); ?></p>
                    </div>

                    <div class="sunchi-plan-pricing">
                        <div class="sunchi-price-amount">
                            <span class="sunchi-price-currency">$</span>
                            <span class="sunchi-price-val" data-monthly="3.59" data-annual="2.99">2.99</span>
                            <span class="sunchi-price-period">/<?php esc_html_e('mes', 'sunchi-theme'); ?></span>
                        </div>
                        <div class="sunchi-annual-note">
                            $28.68/año (<span><?php esc_html_e('ahorras 17%', 'sunchi-theme'); ?></span>)
                        </div>
                    </div>

                    <ul class="sunchi-plan-features">
                        <li class="sunchi-plan-feature"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> 1 sitio web</li>
                        <li class="sunchi-plan-feature"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> 10 GB de almacenamiento</li>
                        <li class="sunchi-plan-feature"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> SSL gratis</li>
                        <li class="sunchi-plan-feature"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Backups automáticos</li>
                        <li class="sunchi-plan-feature"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Email profesional</li>
                        <li class="sunchi-plan-feature"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Soporte 24/7 en español</li>
                    </ul>

                    <a href="<?php echo sunchi_get_checkout_url('wp-starter', 'ANNUAL'); ?>" class="sunchi-btn sunchi-btn-primary sunchi-btn-full sunchi-plan-cta" data-plan="wp-starter">
                        <?php esc_html_e('Comenzar ahora', 'sunchi-theme'); ?> &rarr;
                    </a>
                </div>

                <!-- WordPress Pro (POPULAR) -->
                <div class="sunchi-plan-card popular">
                    <div class="sunchi-popular-badge"><?php esc_html_e('MÁS POPULAR', 'sunchi-theme'); ?></div>
                    <div class="sunchi-plan-header">
                        <div class="sunchi-plan-icon" style="color: #0284C7;">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18.2A8.2 8.2 0 0 1 3.8 12 8.1 8.1 0 0 1 5.3 7.3l5.3 12.1zm5.2-12a1.6 1.6 0 0 0-.2-.1l-3.3 9.6-1.9-5.7 1.3-3.6a4.8 4.8 0 0 1 2.2-.2zm-8.8 0a1.5 1.5 0 0 1 1.7.1l-2.4 6.8zm11 5.8a8.2 8.2 0 0 1-5.6 5.8l3.4-9.8a8 8 0 0 1 2.2 4z"/></svg>
                        </div>
                        <h3 class="sunchi-plan-name"><?php esc_html_e('WordPress Pro', 'sunchi-theme'); ?></h3>
                        <p class="sunchi-plan-tagline"><?php esc_html_e('Rendimiento y seguridad', 'sunchi-theme'); ?></p>
                    </div>

                    <div class="sunchi-plan-pricing">
                        <div class="sunchi-price-amount">
                            <span class="sunchi-price-currency">$</span>
                            <span class="sunchi-price-val" data-monthly="7.49" data-annual="5.99">5.99</span>
                            <span class="sunchi-price-period">/<?php esc_html_e('mes', 'sunchi-theme'); ?></span>
                        </div>
                        <div class="sunchi-annual-note">
                            $57.48/año (<span><?php esc_html_e('ahorras 20%', 'sunchi-theme'); ?></span>)
                        </div>
                    </div>

                    <ul class="sunchi-plan-features">
                        <li class="sunchi-plan-feature"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Sitios web ilimitados</li>
                        <li class="sunchi-plan-feature"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> 50 GB de almacenamiento</li>
                        <li class="sunchi-plan-feature"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> SSL gratis</li>
                        <li class="sunchi-plan-feature"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Backups automáticos</li>
                        <li class="sunchi-plan-feature"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Email profesional</li>
                        <li class="sunchi-plan-feature"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Soporte 24/7 prioritario</li>
                    </ul>

                    <a href="<?php echo sunchi_get_checkout_url('wp-starter', 'ANNUAL'); ?>" class="sunchi-btn sunchi-btn-primary sunchi-btn-full sunchi-plan-cta" data-plan="wp-starter">
                        <?php esc_html_e('Comenzar ahora', 'sunchi-theme'); ?> &rarr;
                    </a>
                </div>

                <!-- Cloud Apps -->
                <div class="sunchi-plan-card">
                    <div class="sunchi-plan-header">
                        <div class="sunchi-plan-icon" style="color: #0284C7;">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>
                        </div>
                        <h3 class="sunchi-plan-name"><?php esc_html_e('Cloud Apps', 'sunchi-theme'); ?></h3>
                        <p class="sunchi-plan-tagline"><?php esc_html_e('Tus apps en la nube', 'sunchi-theme'); ?></p>
                    </div>

                    <div class="sunchi-plan-pricing">
                        <div class="sunchi-price-amount">
                            <span class="sunchi-price-currency">$</span>
                            <span class="sunchi-price-val" data-monthly="9.99" data-annual="7.99">7.99</span>
                            <span class="sunchi-price-period">/<?php esc_html_e('mes', 'sunchi-theme'); ?></span>
                        </div>
                        <div class="sunchi-annual-note">
                            $76.68/año (<span><?php esc_html_e('ahorras 20%', 'sunchi-theme'); ?></span>)
                        </div>
                    </div>

                    <ul class="sunchi-plan-features">
                        <li class="sunchi-plan-feature"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Apps ilimitadas</li>
                        <li class="sunchi-plan-feature"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> 100 GB de almacenamiento</li>
                        <li class="sunchi-plan-feature"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> SSL gratis</li>
                        <li class="sunchi-plan-feature"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Backups automáticos</li>
                        <li class="sunchi-plan-feature"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Email profesional</li>
                        <li class="sunchi-plan-feature"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Soporte 24/7 prioritario</li>
                    </ul>

                    <a href="<?php echo sunchi_get_checkout_url('cloud-apps-pro', 'ANNUAL'); ?>" class="sunchi-btn sunchi-btn-primary sunchi-btn-full sunchi-plan-cta" data-plan="cloud-apps-pro">
                        <?php esc_html_e('Comenzar ahora', 'sunchi-theme'); ?> &rarr;
                    </a>
                </div>

                <!-- VPS Pro -->
                <div class="sunchi-plan-card">
                    <div class="sunchi-plan-header">
                        <div class="sunchi-plan-icon" style="color: #FFB800;">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
                        </div>
                        <h3 class="sunchi-plan-name"><?php esc_html_e('VPS Pro', 'sunchi-theme'); ?></h3>
                        <p class="sunchi-plan-tagline"><?php esc_html_e('Máximo control', 'sunchi-theme'); ?></p>
                    </div>

                    <div class="sunchi-plan-pricing">
                        <div class="sunchi-price-amount">
                            <span class="sunchi-price-currency">$</span>
                            <span class="sunchi-price-val" data-monthly="18.99" data-annual="14.99">14.99</span>
                            <span class="sunchi-price-period">/<?php esc_html_e('mes', 'sunchi-theme'); ?></span>
                        </div>
                        <div class="sunchi-annual-note">
                            $143.88/año (<span><?php esc_html_e('ahorras 20%', 'sunchi-theme'); ?></span>)
                        </div>
                    </div>

                    <ul class="sunchi-plan-features">
                        <li class="sunchi-plan-feature"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Recursos dedicados</li>
                        <li class="sunchi-plan-feature"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> 200 GB de almacenamiento</li>
                        <li class="sunchi-plan-feature"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> SSL gratis</li>
                        <li class="sunchi-plan-feature"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Backups automáticos</li>
                        <li class="sunchi-plan-feature"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Acceso root</li>
                        <li class="sunchi-plan-feature"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Soporte 24/7 prioritario</li>
                    </ul>

                    <a href="<?php echo sunchi_get_checkout_url('vps-dedicated', 'ANNUAL'); ?>" class="sunchi-btn sunchi-btn-primary sunchi-btn-full sunchi-plan-cta" data-plan="vps-dedicated">
                        <?php esc_html_e('Comenzar ahora', 'sunchi-theme'); ?> &rarr;
                    </a>
                </div>
            </div>
        </div>
    </section>

    <!-- 4. COMPARISON TABLE ("Compara todos los planes") -->
    <section class="sunchi-section-comparison">
        <div class="sunchi-container">
            <h2 style="font-size: 2.2rem; margin-bottom: 28px; text-align: center;"><?php esc_html_e('Compara todos los planes', 'sunchi-theme'); ?></h2>

            <div class="sunchi-table-container">
                <table class="sunchi-comparison-table">
                    <thead>
                        <tr>
                            <th><?php esc_html_e('Características', 'sunchi-theme'); ?></th>
                            <th class="sunchi-cell-center"><?php esc_html_e('Hosting Starter', 'sunchi-theme'); ?></th>
                            <th class="sunchi-cell-center" style="color: #FF6B00;"><?php esc_html_e('WordPress Pro', 'sunchi-theme'); ?></th>
                            <th class="sunchi-cell-center"><?php esc_html_e('Cloud Apps', 'sunchi-theme'); ?></th>
                            <th class="sunchi-cell-center"><?php esc_html_e('VPS Pro', 'sunchi-theme'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong><?php esc_html_e('Sitios web', 'sunchi-theme'); ?></strong></td>
                            <td class="sunchi-cell-center">1 sitio web</td>
                            <td class="sunchi-cell-center">Sitios web ilimitados</td>
                            <td class="sunchi-cell-center">Apps ilimitadas</td>
                            <td class="sunchi-cell-center">Recursos dedicados</td>
                        </tr>
                        <tr>
                            <td><strong><?php esc_html_e('Almacenamiento SSD', 'sunchi-theme'); ?></strong></td>
                            <td class="sunchi-cell-center">10 GB</td>
                            <td class="sunchi-cell-center">50 GB</td>
                            <td class="sunchi-cell-center">100 GB</td>
                            <td class="sunchi-cell-center">200 GB</td>
                        </tr>
                        <tr>
                            <td><strong><?php esc_html_e('SSL gratis', 'sunchi-theme'); ?></strong></td>
                            <td class="sunchi-cell-center sunchi-check">✔</td>
                            <td class="sunchi-cell-center sunchi-check">✔</td>
                            <td class="sunchi-cell-center sunchi-check">✔</td>
                            <td class="sunchi-cell-center sunchi-check">✔</td>
                        </tr>
                        <tr>
                            <td><strong><?php esc_html_e('Backups automáticos', 'sunchi-theme'); ?></strong></td>
                            <td class="sunchi-cell-center sunchi-check">✔</td>
                            <td class="sunchi-cell-center sunchi-check">✔</td>
                            <td class="sunchi-cell-center sunchi-check">✔</td>
                            <td class="sunchi-cell-center sunchi-check">✔</td>
                        </tr>
                        <tr>
                            <td><strong><?php esc_html_e('Cuentas de email', 'sunchi-theme'); ?></strong></td>
                            <td class="sunchi-cell-center sunchi-check">✔</td>
                            <td class="sunchi-cell-center sunchi-check">✔</td>
                            <td class="sunchi-cell-center sunchi-check">✔</td>
                            <td class="sunchi-cell-center sunchi-check">✔</td>
                        </tr>
                        <tr>
                            <td><strong><?php esc_html_e('Soporte en español', 'sunchi-theme'); ?></strong></td>
                            <td class="sunchi-cell-center">24/7 en español</td>
                            <td class="sunchi-cell-center">24/7 prioritario</td>
                            <td class="sunchi-cell-center">24/7 prioritario</td>
                            <td class="sunchi-cell-center">24/7 prioritario</td>
                        </tr>
                        <tr>
                            <td><strong>CPU / RAM</strong></td>
                            <td class="sunchi-cell-center">—</td>
                            <td class="sunchi-cell-center">—</td>
                            <td class="sunchi-cell-center">—</td>
                            <td class="sunchi-cell-center">CPU y RAM dedicados</td>
                        </tr>
                        <tr>
                            <td><strong><?php esc_html_e('Acceso root', 'sunchi-theme'); ?></strong></td>
                            <td class="sunchi-cell-center">—</td>
                            <td class="sunchi-cell-center">—</td>
                            <td class="sunchi-cell-center">—</td>
                            <td class="sunchi-cell-center sunchi-check">✔</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </section>

    <!-- 5. FAQS SECTION ("¿Tienes dudas?") -->
    <section class="sunchi-section-faqs">
        <div class="sunchi-container">
            <div class="sunchi-plans-header">
                <div class="sunchi-pill-badge">
                    <span>💡</span>
                    <?php esc_html_e('PREGUNTAS FRECUENTES', 'sunchi-theme'); ?>
                </div>
                <h2><?php esc_html_e('¿Tienes dudas?', 'sunchi-theme'); ?></h2>
                <p><?php esc_html_e('Aquí respondemos las preguntas más comunes sobre nuestros planes y servicios.', 'sunchi-theme'); ?></p>
            </div>

            <div class="sunchi-faqs-grid">
                <!-- FAQ 1 -->
                <div class="sunchi-faq-item">
                    <button class="sunchi-faq-question" aria-expanded="false">
                        <span><?php esc_html_e('¿Puedo cambiar de plan después?', 'sunchi-theme'); ?></span>
                        <span class="sunchi-faq-icon">&rsaquo;</span>
                    </button>
                    <div class="sunchi-faq-answer">
                        <p><?php esc_html_e('Sí, puedes mejorar o cambiar tu plan en cualquier momento desde tu panel de control de Sunchi con solo un par de clics, pagando únicamente la diferencia prorrateada.', 'sunchi-theme'); ?></p>
                    </div>
                </div>

                <!-- FAQ 2 -->
                <div class="sunchi-faq-item">
                    <button class="sunchi-faq-question" aria-expanded="false">
                        <span><?php esc_html_e('¿Ofrecen reembolso?', 'sunchi-theme'); ?></span>
                        <span class="sunchi-faq-icon">&rsaquo;</span>
                    </button>
                    <div class="sunchi-faq-answer">
                        <p><?php esc_html_e('Contamos con una garantía de satisfacción de 30 días. Si el servicio no cumple tus expectativas, te reembolsamos el 100% de tu dinero sin preguntas complicadas.', 'sunchi-theme'); ?></p>
                    </div>
                </div>

                <!-- FAQ 3 -->
                <div class="sunchi-faq-item">
                    <button class="sunchi-faq-question" aria-expanded="false">
                        <span><?php esc_html_e('¿El dominio está incluido?', 'sunchi-theme'); ?></span>
                        <span class="sunchi-faq-icon">&rsaquo;</span>
                    </button>
                    <div class="sunchi-faq-answer">
                        <p><?php esc_html_e('Puedes conectar cualquier dominio que ya poseas o registrar uno nuevo durante la configuración de tu servicio en Velupi Cloud Platform.', 'sunchi-theme'); ?></p>
                    </div>
                </div>

                <!-- FAQ 4 -->
                <div class="sunchi-faq-item">
                    <button class="sunchi-faq-question" aria-expanded="false">
                        <span><?php esc_html_e('¿Incluyen migración de mi sitio?', 'sunchi-theme'); ?></span>
                        <span class="sunchi-faq-icon">&rsaquo;</span>
                    </button>
                    <div class="sunchi-faq-answer">
                        <p><?php esc_html_e('¡Totalmente gratis! Nuestro equipo técnico se encarga de transferir tus archivos, bases de datos y correos sin cortes en tu servicio actual.', 'sunchi-theme'); ?></p>
                    </div>
                </div>

                <!-- FAQ 5 -->
                <div class="sunchi-faq-item">
                    <button class="sunchi-faq-question" aria-expanded="false">
                        <span><?php esc_html_e('¿Qué métodos de pago aceptan?', 'sunchi-theme'); ?></span>
                        <span class="sunchi-faq-icon">&rsaquo;</span>
                    </button>
                    <div class="sunchi-faq-answer">
                        <p><?php esc_html_e('Aceptamos tarjetas de crédito y débito Visa, Mastercard, transferencias bancarias PSE, Nequi y pagos en efectivo mediante nuestra pasarela segura Wompi.', 'sunchi-theme'); ?></p>
                    </div>
                </div>

                <!-- FAQ 6 -->
                <div class="sunchi-faq-item">
                    <button class="sunchi-faq-question" aria-expanded="false">
                        <span><?php esc_html_e('¿Puedo contratar varios servicios?', 'sunchi-theme'); ?></span>
                        <span class="sunchi-faq-icon">&rsaquo;</span>
                    </button>
                    <div class="sunchi-faq-answer">
                        <p><?php esc_html_e('Por supuesto. Desde tu cuenta puedes administrar múltiples sitios WordPress, aplicaciones en Node.js o Python y servidores VPS de forma unificada.', 'sunchi-theme'); ?></p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- 6. FINAL CTA BANNER -->
    <section class="sunchi-section-cta">
        <div class="sunchi-container sunchi-cta-content">
            <h2><?php esc_html_e('¿Listo para empezar?', 'sunchi-theme'); ?></h2>
            <p><?php esc_html_e('Empieza hoy mismo y descubre por qué miles de usuarios eligen el hosting más alegre y veloz.', 'sunchi-theme'); ?></p>
            <a href="<?php echo sunchi_get_checkout_url('wp-starter', 'ANNUAL'); ?>" class="sunchi-btn sunchi-btn-cta">
                <?php esc_html_e('Comenzar ahora', 'sunchi-theme'); ?> &rarr;
            </a>
        </div>
    </section>
</main>

<?php
get_footer();
