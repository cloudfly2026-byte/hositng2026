<?php
/**
 * Sunchi Main Template File
 *
 * @package Sunchi_Theme
 */

get_header();
?>

<main class="sunchi-container" style="padding: 60px 24px;">
    <?php if (have_posts()) : ?>
        <header class="sunchi-plans-header">
            <h2><?php esc_html_e('Blog y Novedades Sunchi', 'sunchi-theme'); ?></h2>
            <p><?php esc_html_e('Consejos, tutoriales y noticias del mundo del hosting y la nube.', 'sunchi-theme'); ?></p>
        </header>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; margin-top: 40px;">
            <?php while (have_posts()) : the_post(); ?>
                <article id="post-<?php the_ID(); ?>" <?php post_class('sunchi-category-card'); ?>>
                    <?php if (has_post_thumbnail()) : ?>
                        <div style="margin-bottom: 16px; border-radius: 8px; overflow: hidden;">
                            <?php the_post_thumbnail('medium_large'); ?>
                        </div>
                    <?php endif; ?>

                    <h3 class="sunchi-category-title"><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h3>
                    <div class="sunchi-category-desc" style="margin-top: 8px;">
                        <?php the_excerpt(); ?>
                    </div>
                    <a href="<?php the_permalink(); ?>" class="sunchi-category-link">
                        <?php esc_html_e('Leer más', 'sunchi-theme'); ?> &rarr;
                    </a>
                </article>
            <?php endwhile; ?>
        </div>

        <div style="margin-top: 40px; text-align: center;">
            <?php the_posts_pagination(); ?>
        </div>
    <?php else : ?>
        <div style="text-align: center; padding: 60px 0;">
            <h2><?php esc_html_e('No se encontraron artículos', 'sunchi-theme'); ?></h2>
            <p><?php esc_html_e('Pronto publicaremos nuevos contenidos para ti.', 'sunchi-theme'); ?></p>
        </div>
    <?php endif; ?>
</main>

<?php
get_footer();
