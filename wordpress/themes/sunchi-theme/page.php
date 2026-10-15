<?php
/**
 * Sunchi Default Page Template
 *
 * @package Sunchi_Theme
 */

get_header();
?>

<main class="sunchi-container" style="padding: 60px 24px; max-width: 900px;">
    <?php while (have_posts()) : the_post(); ?>
        <article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
            <header style="margin-bottom: 30px;">
                <h1 style="font-size: 2.5rem; color: #2D1B17; margin-bottom: 12px;"><?php the_title(); ?></h1>
            </header>

            <div class="sunchi-page-content" style="font-size: 1.05rem; line-height: 1.8; color: #344054;">
                <?php the_content(); ?>
            </div>
        </article>
    <?php endwhile; ?>
</main>

<?php
get_footer();
