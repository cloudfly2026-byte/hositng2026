<?php
/**
 * Template Name: Contacto y Soporte
 *
 * @package Sunchi_Theme
 */

get_header();
?>

<main id="sunchi-contact-page" class="sunchi-container" style="padding: 60px 24px;">
    <div class="sunchi-plans-header">
        <div class="sunchi-pill-badge">
            <span>💬</span>
            <?php esc_html_e('ESTAMOS PARA AYUDARTE', 'sunchi-theme'); ?>
        </div>
        <h1><?php esc_html_e('Contáctanos y hablemos de tu proyecto', 'sunchi-theme'); ?></h1>
        <p><?php esc_html_e('Nuestro equipo humano está disponible 24/7 en español para resolver tus dudas.', 'sunchi-theme'); ?></p>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; max-width: 980px; margin-left: auto; margin-right: auto;">
        <!-- Contact Form -->
        <div style="background: #FFFFFF; border: 1px solid var(--sunchi-border); border-radius: 20px; padding: 36px; box-shadow: var(--sunchi-shadow-sm);">
            <form onsubmit="event.preventDefault(); alert('Mensaje enviado. Nuestro equipo te responderá a la brevedad.');">
                <div style="margin-bottom: 20px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--sunchi-dark);">Nombre completo</label>
                    <input type="text" class="sunchi-newsletter-input" style="width: 100%; border-radius: 8px;" placeholder="Tu nombre" required>
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--sunchi-dark);">Correo electrónico</label>
                    <input type="email" class="sunchi-newsletter-input" style="width: 100%; border-radius: 8px;" placeholder="tu@correo.com" required>
                </div>
                <div style="margin-bottom: 24px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--sunchi-dark);">Mensaje</label>
                    <textarea class="sunchi-newsletter-input" style="width: 100%; border-radius: 8px; height: 120px;" placeholder="¿Cómo podemos ayudarte?" required></textarea>
                </div>
                <button type="submit" class="sunchi-btn sunchi-btn-primary sunchi-btn-full">
                    Enviar mensaje &rarr;
                </button>
            </form>
        </div>

        <!-- Info Card -->
        <div style="display: flex; flex-direction: column; gap: 24px; justify-content: center;">
            <div class="sunchi-category-card" style="padding: 28px;">
                <h3>Soporte Técnico Inmediato</h3>
                <p style="color: var(--sunchi-text-muted); margin-top: 6px;">Si ya eres cliente, puedes abrir un ticket de soporte directamente desde tu panel de Velupi.</p>
                <a href="<?php echo sunchi_get_auth_url('login'); ?>" class="sunchi-category-link" style="margin-top: 12px;">Ir al Centro de Soporte &rarr;</a>
            </div>

            <div class="sunchi-category-card" style="padding: 28px;">
                <h3>Ventas y Asesoría Comercial</h3>
                <p style="color: var(--sunchi-text-muted); margin-top: 6px;">¿Necesitas una infraestructura personalizada o migración de múltiples sitios? Escríbenos a <strong>soporte@velupi.com</strong>.</p>
            </div>
        </div>
    </div>
</main>

<?php
get_footer();
