<?php
/**
 * Sunchi Single Post Template
 *
 * @package Sunchi_Theme
 */

get_header();
?>

<main class="sunchi-container" style="padding: 60px 24px; max-width: 860px;">
    <?php while (have_posts()) : the_post(); ?>
        <article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
            <header style="margin-bottom: 24px;">
                <div class="sunchi-pill-badge" style="margin-bottom: 12px;">
                    <?php echo get_the_date(); ?>
                </div>
                <h1 style="font-size: 2.6rem; color: #2D1B17;"><?php the_title(); ?></h1>
            </header>

            <?php if (has_post_thumbnail()) : ?>
                <div style="margin-bottom: 30px; border-radius: 16px; overflow: hidden;">
                    <?php the_post_thumbnail('large'); ?>
                </div>
            <?php endif; ?>

            <div class="sunchi-single-content" style="font-size: 1.1rem; line-height: 1.8; color: #344054;">
                <?php the_content(); ?>
            </div>
        </article>
    <?php endwhile; ?>
</main>

<?php
get_footer();
