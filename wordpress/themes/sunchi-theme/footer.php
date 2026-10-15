<?php
/**
 * Sunchi Theme Footer
 *
 * @package Sunchi_Theme
 */
?>
<footer class="sunchi-footer" id="sunchi-main-footer">
    <div class="sunchi-container">
        <div class="sunchi-footer-grid">
            <!-- Brand Column -->
            <div class="sunchi-footer-brand">
                <a href="<?php echo esc_url(home_url('/')); ?>" rel="home">
                    <?php
                    $logo_src = get_template_directory_uri() . '/assets/images/logo.png';
                    echo '<img src="' . esc_url($logo_src) . '" alt="' . esc_attr(get_bloginfo('name', 'display')) . ' — Sunchi" class="sunchi-logo-img" width="140" height="50">';
                    ?>
                </a>
                <p class="sunchi-footer-slogan"><?php esc_html_e('Hosting que impulsa tus ideas.', 'sunchi-theme'); ?></p>
                <div class="sunchi-social-links">
                    <a href="https://facebook.com" class="sunchi-social-link" aria-label="Facebook" target="_blank" rel="noopener">f</a>
                    <a href="https://x.com" class="sunchi-social-link" aria-label="X" target="_blank" rel="noopener">𝕏</a>
                    <a href="https://instagram.com" class="sunchi-social-link" aria-label="Instagram" target="_blank" rel="noopener">ig</a>
                    <a href="https://youtube.com" class="sunchi-social-link" aria-label="YouTube" target="_blank" rel="noopener">yt</a>
                    <a href="https://linkedin.com" class="sunchi-social-link" aria-label="LinkedIn" target="_blank" rel="noopener">in</a>
                </div>
            </div>

            <!-- Products Column -->
            <div class="sunchi-footer-col">
                <h4><?php esc_html_e('Productos', 'sunchi-theme'); ?></h4>
                <ul class="sunchi-footer-menu">
                    <li><a href="<?php echo esc_url(home_url('/hosting/')); ?>"><?php esc_html_e('Hosting', 'sunchi-theme'); ?></a></li>
                    <li><a href="<?php echo esc_url(home_url('/wordpress/')); ?>"><?php esc_html_e('WordPress', 'sunchi-theme'); ?></a></li>
                    <li><a href="<?php echo esc_url(home_url('/cloud-apps/')); ?>"><?php esc_html_e('Cloud Apps', 'sunchi-theme'); ?></a></li>
                    <li><a href="<?php echo esc_url(home_url('/vps/')); ?>"><?php esc_html_e('VPS', 'sunchi-theme'); ?></a></li>
                </ul>
            </div>

            <!-- Resources Column -->
            <div class="sunchi-footer-col">
                <h4><?php esc_html_e('Recursos', 'sunchi-theme'); ?></h4>
                <ul class="sunchi-footer-menu">
                    <li><a href="<?php echo esc_url(home_url('/blog/')); ?>"><?php esc_html_e('Blog', 'sunchi-theme'); ?></a></li>
                    <li><a href="<?php echo esc_url(home_url('/contacto/')); ?>"><?php esc_html_e('Centro de ayuda', 'sunchi-theme'); ?></a></li>
                    <li><a href="https://status.velupi.com" target="_blank" rel="noopener"><?php esc_html_e('Estado del servicio', 'sunchi-theme'); ?></a></li>
                    <li><a href="<?php echo esc_url(home_url('/afiliados/')); ?>"><?php esc_html_e('Afiliados', 'sunchi-theme'); ?></a></li>
                </ul>
            </div>

            <!-- Company Column -->
            <div class="sunchi-footer-col">
                <h4><?php esc_html_e('Empresa', 'sunchi-theme'); ?></h4>
                <ul class="sunchi-footer-menu">
                    <li><a href="<?php echo esc_url(home_url('/nosotros/')); ?>"><?php esc_html_e('Sobre nosotros', 'sunchi-theme'); ?></a></li>
                    <li><a href="<?php echo esc_url(home_url('/contacto/')); ?>"><?php esc_html_e('Contacto', 'sunchi-theme'); ?></a></li>
                    <li><a href="<?php echo esc_url(home_url('/terminos-y-condiciones/')); ?>"><?php esc_html_e('Términos de servicio', 'sunchi-theme'); ?></a></li>
                    <li><a href="<?php echo esc_url(home_url('/politica-de-privacidad/')); ?>"><?php esc_html_e('Política de privacidad', 'sunchi-theme'); ?></a></li>
                </ul>
            </div>

            <!-- Newsletter Column -->
            <div class="sunchi-footer-col">
                <h4><?php esc_html_e('Recibe novedades y promociones', 'sunchi-theme'); ?></h4>
                <form class="sunchi-newsletter-form" onsubmit="event.preventDefault(); alert('¡Gracias por suscribirte a Sunchi!');">
                    <input type="email" placeholder="<?php esc_attr_e('Tu correo electrónico', 'sunchi-theme'); ?>" class="sunchi-newsletter-input" required>
                    <button type="submit" class="sunchi-btn sunchi-btn-primary" style="padding: 10px 20px;">
                        <?php esc_html_e('Suscribirme', 'sunchi-theme'); ?>
                    </button>
                </form>
            </div>
        </div>

        <!-- Bottom Line -->
        <div class="sunchi-footer-bottom">
            <p>&copy; <?php echo date('Y'); ?> <?php esc_html_e('Sunchi. Todos los derechos reservados.', 'sunchi-theme'); ?></p>
            <p><?php esc_html_e('Hecho con ☀️ para un internet más brillante.', 'sunchi-theme'); ?></p>
        </div>
    </div>
</footer>

<?php wp_footer(); ?>
</body>
</html>
