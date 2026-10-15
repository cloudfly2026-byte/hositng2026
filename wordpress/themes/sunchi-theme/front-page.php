<?php
/**
 * Sunchi Front Page Template (Home)
 * Faithfully reproducing Image 2: Design of Sunchi Main Page
 *
 * @package Sunchi_Theme
 */

get_header();
?>

<main id="sunchi-main-content">
    <!-- 1. HERO SECTION -->
    <section class="sunchi-hero">
        <div class="sunchi-container sunchi-hero-grid">
            <div class="sunchi-hero-content">
                <div class="sunchi-pill-badge">
                    <span>☀️</span>
                    <?php esc_html_e('HOSTING PARA UN MUNDO MÁS BRILLANTE', 'sunchi-theme'); ?>
                </div>

                <h1 class="sunchi-hero-title">
                    <?php esc_html_e('Tu hosting alegre,', 'sunchi-theme'); ?><br>
                    <span><?php esc_html_e('rápido y confiable', 'sunchi-theme'); ?></span>
                </h1>

                <p class="sunchi-hero-desc">
                    <?php esc_html_e('Hosting, WordPress, Cloud Apps y VPS con el rendimiento que necesitas y el soporte que te hace sonreír. Todo en un solo lugar, simple y sin complicaciones.', 'sunchi-theme'); ?>
                </p>

                <div class="sunchi-hero-buttons">
                    <a href="<?php echo esc_url(home_url('/precios/')); ?>" class="sunchi-btn sunchi-btn-primary">
                        <?php esc_html_e('Ver planes', 'sunchi-theme'); ?>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                    </a>
                    <a href="<?php echo sunchi_get_checkout_url('wp-starter', 'ANNUAL'); ?>" class="sunchi-btn sunchi-btn-secondary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                        <?php esc_html_e('Probar ahora', 'sunchi-theme'); ?>
                    </a>
                </div>

                <div class="sunchi-trust-indicators">
                    <div class="sunchi-trust-item">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                        <?php esc_html_e('Activación instantánea', 'sunchi-theme'); ?>
                    </div>
                    <div class="sunchi-trust-item">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                        <?php esc_html_e('Soporte 24/7 en español', 'sunchi-theme'); ?>
                    </div>
                    <div class="sunchi-trust-item">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                        <?php esc_html_e('Garantía de 30 días', 'sunchi-theme'); ?>
                    </div>
                </div>
            </div>

            <!-- Hero 3D Sun Character & Browser Mockup -->
            <div class="sunchi-hero-visual">
                <!-- Floating Badges -->
                <div class="sunchi-floating-badge badge-top-right">
                    <span>⚡</span>
                    <span><?php esc_html_e('Sitios más rápidos y estables', 'sunchi-theme'); ?></span>
                </div>
                <div class="sunchi-floating-badge badge-mid-right">
                    <span>🛡️</span>
                    <span><?php esc_html_e('Seguridad incluida en todos los planes', 'sunchi-theme'); ?></span>
                </div>
                <div class="sunchi-floating-badge badge-bot-right">
                    <span>☁️</span>
                    <span><?php esc_html_e('Soporte humano en español 24/7', 'sunchi-theme'); ?></span>
                </div>

                <div class="sunchi-sun-illustration">
                    <!-- Smiling Sun Graphic -->
                    <div class="sunchi-sun-character">
                        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <!-- Golden sun rays -->
                            <circle cx="100" cy="100" r="70" fill="url(#sun_gradient)"/>
                            <path d="M100 10V25M100 175V190M10 100H25M175 100H190M36 36L47 47M153 153L164 164M36 164L47 153M153 47L164 36" stroke="#FFB800" stroke-width="8" stroke-linecap="round"/>
                            <!-- Cheerful Eyes & Smile -->
                            <ellipse cx="80" cy="90" rx="6" ry="9" fill="#2D1B17"/>
                            <ellipse cx="120" cy="90" rx="6" ry="9" fill="#2D1B17"/>
                            <path d="M78 115C84 130 116 130 122 115" stroke="#2D1B17" stroke-width="6" stroke-linecap="round"/>
                            <!-- Rosy Cheeks -->
                            <circle cx="68" cy="108" r="8" fill="#FF9100" opacity="0.6"/>
                            <circle cx="132" cy="108" r="8" fill="#FF9100" opacity="0.6"/>
                            <defs>
                                <radialGradient id="sun_gradient" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(100 100) scale(70)">
                                    <stop stop-color="#FFD54A"/>
                                    <stop offset="0.75" stop-color="#FFB800"/>
                                    <stop offset="1" stop-color="#FF9100"/>
                                </radialGradient>
                            </defs>
                        </svg>
                    </div>

                    <!-- Browser Mockup Card -->
                    <div class="sunchi-browser-mockup">
                        <div class="sunchi-browser-bar">
                            <span class="sunchi-browser-dot"></span>
                            <span class="sunchi-browser-dot"></span>
                            <span class="sunchi-browser-dot"></span>
                            <div class="sunchi-browser-url">https://tusitio.com</div>
                            <div class="sunchi-badge-score">
                                <span>99/100</span>
                                <span><?php esc_html_e('Rendimiento Excelente', 'sunchi-theme'); ?></span>
                            </div>
                        </div>
                        <div style="height: 100px; background: linear-gradient(135deg, #FFF8ED 0%, #FFFFFF 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #667085; font-size: 0.85rem;">
                            🚀 Tu próximo gran proyecto listo en segundos
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- 2. CATEGORY CARDS SECTION -->
    <section class="sunchi-section-categories">
        <div class="sunchi-container">
            <div class="sunchi-categories-grid">
                <!-- Hosting -->
                <div class="sunchi-category-card">
                    <div class="sunchi-category-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
                    </div>
                    <h3 class="sunchi-category-title"><?php esc_html_e('Hosting', 'sunchi-theme'); ?></h3>
                    <p class="sunchi-category-desc"><?php esc_html_e('Rápido, seguro y perfecto para todo tipo de proyectos.', 'sunchi-theme'); ?></p>
                    <a href="<?php echo esc_url(home_url('/hosting/')); ?>" class="sunchi-category-link">
                        <?php esc_html_e('Ver hosting', 'sunchi-theme'); ?> &rarr;
                    </a>
                </div>

                <!-- WordPress -->
                <div class="sunchi-category-card">
                    <div class="sunchi-category-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18.2A8.2 8.2 0 0 1 3.8 12 8.1 8.1 0 0 1 5.3 7.3l5.3 12.1zm5.2-12a1.6 1.6 0 0 0-.2-.1l-3.3 9.6-1.9-5.7 1.3-3.6a4.8 4.8 0 0 1 2.2-.2zm-8.8 0a1.5 1.5 0 0 1 1.7.1l-2.4 6.8zm11 5.8a8.2 8.2 0 0 1-5.6 5.8l3.4-9.8a8 8 0 0 1 2.2 4z"/></svg>
                    </div>
                    <h3 class="sunchi-category-title"><?php esc_html_e('WordPress', 'sunchi-theme'); ?></h3>
                    <p class="sunchi-category-desc"><?php esc_html_e('Instalación en 1 clic y rendimiento optimizado.', 'sunchi-theme'); ?></p>
                    <a href="<?php echo esc_url(home_url('/wordpress/')); ?>" class="sunchi-category-link">
                        <?php esc_html_e('Ver WordPress', 'sunchi-theme'); ?> &rarr;
                    </a>
                </div>

                <!-- Cloud Apps -->
                <div class="sunchi-category-card">
                    <div class="sunchi-category-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>
                    </div>
                    <h3 class="sunchi-category-title"><?php esc_html_e('Cloud Apps', 'sunchi-theme'); ?></h3>
                    <p class="sunchi-category-desc"><?php esc_html_e('Tus aplicaciones favoritas en la nube, listas en minutos.', 'sunchi-theme'); ?></p>
                    <a href="<?php echo esc_url(home_url('/cloud-apps/')); ?>" class="sunchi-category-link">
                        <?php esc_html_e('Ver cloud apps', 'sunchi-theme'); ?> &rarr;
                    </a>
                </div>

                <!-- VPS -->
                <div class="sunchi-category-card">
                    <div class="sunchi-category-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
                    </div>
                    <h3 class="sunchi-category-title"><?php esc_html_e('VPS', 'sunchi-theme'); ?></h3>
                    <p class="sunchi-category-desc"><?php esc_html_e('Más poder y flexibilidad para proyectos exigentes.', 'sunchi-theme'); ?></p>
                    <a href="<?php echo esc_url(home_url('/vps/')); ?>" class="sunchi-category-link">
                        <?php esc_html_e('Ver VPS', 'sunchi-theme'); ?> &rarr;
                    </a>
                </div>
            </div>
        </div>
    </section>

    <!-- 3. PLANS PREVIEW ("Planes simples y transparentes") -->
    <section class="sunchi-section-plans" id="planes">
        <div class="sunchi-container">
            <div class="sunchi-plans-header">
                <div class="sunchi-pill-badge">
                    <span>📊</span>
                    <?php esc_html_e('PLANES PARA CADA GRAN IDEA', 'sunchi-theme'); ?>
                </div>
                <h2><?php esc_html_e('Planes simples y transparentes', 'sunchi-theme'); ?></h2>
                <p><?php esc_html_e('Todo lo que necesitas para llevar tu proyecto al siguiente nivel. Sin sorpresas, sin letras pequeñas.', 'sunchi-theme'); ?></p>
            </div>

            <div class="sunchi-pricing-grid">
                <!-- Hosting Starter -->
                <div class="sunchi-plan-card">
                    <div class="sunchi-plan-header">
                        <div class="sunchi-plan-icon" style="color: #FF6B00;">
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
                        </div>
                        <h3 class="sunchi-plan-name"><?php esc_html_e('Hosting Starter', 'sunchi-theme'); ?></h3>
                        <p class="sunchi-plan-tagline"><?php esc_html_e('Ideal para comenzar', 'sunchi-theme'); ?></p>
                    </div>

                    <div class="sunchi-plan-pricing">
                        <div class="sunchi-price-amount">
                            <span class="sunchi-price-currency">$</span>
                            <span class="sunchi-price-val">2.99</span>
                            <span class="sunchi-price-period">/<?php esc_html_e('mes', 'sunchi-theme'); ?></span>
                        </div>
                    </div>

                    <ul class="sunchi-plan-features">
                        <li class="sunchi-plan-feature"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> 1 sitio web</li>
                        <li class="sunchi-plan-feature"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> 10 GB SSD</li>
                        <li class="sunchi-plan-feature"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> SSL gratis</li>
                    </ul>

                    <a href="<?php echo sunchi_get_checkout_url('wp-starter', 'ANNUAL'); ?>" class="sunchi-btn sunchi-btn-primary sunchi-btn-full">
                        <?php esc_html_e('Comenzar ahora', 'sunchi-theme'); ?> &rarr;
                    </a>
                </div>

                <!-- WordPress Pro (POPULAR) -->
                <div class="sunchi-plan-card popular">
                    <div class="sunchi-popular-badge"><?php esc_html_e('MÁS POPULAR', 'sunchi-theme'); ?></div>
                    <div class="sunchi-plan-header">
                        <div class="sunchi-plan-icon" style="color: #0284C7;">
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18.2A8.2 8.2 0 0 1 3.8 12 8.1 8.1 0 0 1 5.3 7.3l5.3 12.1zm5.2-12a1.6 1.6 0 0 0-.2-.1l-3.3 9.6-1.9-5.7 1.3-3.6a4.8 4.8 0 0 1 2.2-.2zm-8.8 0a1.5 1.5 0 0 1 1.7.1l-2.4 6.8zm11 5.8a8.2 8.2 0 0 1-5.6 5.8l3.4-9.8a8 8 0 0 1 2.2 4z"/></svg>
                        </div>
                        <h3 class="sunchi-plan-name"><?php esc_html_e('WordPress Pro', 'sunchi-theme'); ?></h3>
                        <p class="sunchi-plan-tagline"><?php esc_html_e('Rendimiento y seguridad', 'sunchi-theme'); ?></p>
                    </div>

                    <div class="sunchi-plan-pricing">
                        <div class="sunchi-price-amount">
                            <span class="sunchi-price-currency">$</span>
                            <span class="sunchi-price-val">5.99</span>
                            <span class="sunchi-price-period">/<?php esc_html_e('mes', 'sunchi-theme'); ?></span>
                        </div>
                    </div>

                    <ul class="sunchi-plan-features">
                        <li class="sunchi-plan-feature"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Sitios ilimitados</li>
                        <li class="sunchi-plan-feature"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> 50 GB SSD</li>
                        <li class="sunchi-plan-feature"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Copias de seguridad</li>
                    </ul>

                    <a href="<?php echo sunchi_get_checkout_url('wp-starter', 'ANNUAL'); ?>" class="sunchi-btn sunchi-btn-primary sunchi-btn-full" style="background: linear-gradient(135deg, #FF6B00 0%, #E85A00 100%);">
                        <?php esc_html_e('Comenzar ahora', 'sunchi-theme'); ?> &rarr;
                    </a>
                </div>

                <!-- Cloud Apps -->
                <div class="sunchi-plan-card">
                    <div class="sunchi-plan-header">
                        <div class="sunchi-plan-icon" style="color: #0284C7;">
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>
                        </div>
                        <h3 class="sunchi-plan-name"><?php esc_html_e('Cloud Apps', 'sunchi-theme'); ?></h3>
                        <p class="sunchi-plan-tagline"><?php esc_html_e('Tus apps en la nube', 'sunchi-theme'); ?></p>
                    </div>

                    <div class="sunchi-plan-pricing">
                        <div class="sunchi-price-amount">
                            <span class="sunchi-price-currency">$</span>
                            <span class="sunchi-price-val">7.99</span>
                            <span class="sunchi-price-period">/<?php esc_html_e('mes', 'sunchi-theme'); ?></span>
                        </div>
                    </div>

                    <ul class="sunchi-plan-features">
                        <li class="sunchi-plan-feature"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Apps ilimitadas</li>
                        <li class="sunchi-plan-feature"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Recursos dedicados</li>
                        <li class="sunchi-plan-feature"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Alta disponibilidad</li>
                    </ul>

                    <a href="<?php echo sunchi_get_checkout_url('cloud-apps-pro', 'ANNUAL'); ?>" class="sunchi-btn sunchi-btn-primary sunchi-btn-full">
                        <?php esc_html_e('Comenzar ahora', 'sunchi-theme'); ?> &rarr;
                    </a>
                </div>

                <!-- VPS Pro -->
                <div class="sunchi-plan-card">
                    <div class="sunchi-plan-header">
                        <div class="sunchi-plan-icon" style="color: #FFB800;">
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
                        </div>
                        <h3 class="sunchi-plan-name"><?php esc_html_e('VPS Pro', 'sunchi-theme'); ?></h3>
                        <p class="sunchi-plan-tagline"><?php esc_html_e('Máximo control', 'sunchi-theme'); ?></p>
                    </div>

                    <div class="sunchi-plan-pricing">
                        <div class="sunchi-price-amount">
                            <span class="sunchi-price-currency">$</span>
                            <span class="sunchi-price-val">14.99</span>
                            <span class="sunchi-price-period">/<?php esc_html_e('mes', 'sunchi-theme'); ?></span>
                        </div>
                    </div>

                    <ul class="sunchi-plan-features">
                        <li class="sunchi-plan-feature"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> CPU dedicada</li>
                        <li class="sunchi-plan-feature"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> SSD NVMe</li>
                        <li class="sunchi-plan-feature"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Acceso root</li>
                    </ul>

                    <a href="<?php echo sunchi_get_checkout_url('vps-dedicated', 'ANNUAL'); ?>" class="sunchi-btn sunchi-btn-primary sunchi-btn-full">
                        <?php esc_html_e('Comenzar ahora', 'sunchi-theme'); ?> &rarr;
                    </a>
                </div>
            </div>
        </div>
    </section>

    <!-- 4. SOCIAL PROOF / TESTIMONIALS ("Clientes que sonríen") -->
    <section class="sunchi-section-testimonials">
        <div class="sunchi-container">
            <div class="sunchi-plans-header">
                <div class="sunchi-pill-badge">
                    <span>❤️</span>
                    <?php esc_html_e('CLIENTES QUE SONRÍEN', 'sunchi-theme'); ?>
                </div>
                <h2><?php esc_html_e('Miles de proyectos confían en Sunchi', 'sunchi-theme'); ?></h2>
                <p><?php esc_html_e('Personas y negocios de todo el mundo ya disfrutan de un hosting rápido, seguro y con un soporte increíble.', 'sunchi-theme'); ?></p>
            </div>

            <div class="sunchi-testimonials-grid">
                <!-- Testimonial 1 -->
                <div class="sunchi-testimonial-card">
                    <div class="sunchi-stars">★★★★★</div>
                    <p class="sunchi-quote">"Sunchi hizo que lanzar mi web fuera súper fácil. El soporte es increíble y todo funciona perfecto."</p>
                    <div class="sunchi-author">
                        <div class="sunchi-avatar"></div>
                        <div class="sunchi-author-info">
                            <h4>María González</h4>
                            <p>Creadora de contenido</p>
                        </div>
                    </div>
                </div>

                <!-- Testimonial 2 -->
                <div class="sunchi-testimonial-card">
                    <div class="sunchi-stars">★★★★★</div>
                    <p class="sunchi-quote">"Rápido, confiable y con un equipo que realmente te ayuda. ¡Totalmente recomendado!"</p>
                    <div class="sunchi-author">
                        <div class="sunchi-avatar"></div>
                        <div class="sunchi-author-info">
                            <h4>Carlos Mendoza</h4>
                            <p>Desarrollador web</p>
                        </div>
                    </div>
                </div>

                <!-- Testimonial 3 -->
                <div class="sunchi-testimonial-card">
                    <div class="sunchi-stars">★★★★★</div>
                    <p class="sunchi-quote">"La mejor experiencia de hosting que he tenido. Mi sitio vuela y el soporte siempre está ahí."</p>
                    <div class="sunchi-author">
                        <div class="sunchi-avatar"></div>
                        <div class="sunchi-author-info">
                            <h4>Ana Torres</h4>
                            <p>Tienda online</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- 5. FINAL CALL TO ACTION -->
    <section class="sunchi-section-cta">
        <div class="sunchi-container sunchi-cta-content">
            <h2><?php esc_html_e('¿Listo para hacer despegar tu proyecto?', 'sunchi-theme'); ?></h2>
            <p><?php esc_html_e('Únete a la nueva era del hosting en la nube. Empieza en menos de 2 minutos con total garantía.', 'sunchi-theme'); ?></p>
            <a href="<?php echo esc_url(home_url('/precios/')); ?>" class="sunchi-btn sunchi-btn-cta">
                <?php esc_html_e('Elegir mi plan ahora', 'sunchi-theme'); ?> &rarr;
            </a>
        </div>
    </section>
</main>

<?php
get_footer();
