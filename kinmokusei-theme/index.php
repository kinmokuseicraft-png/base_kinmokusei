<?php
get_header();
?>
<div class="k-content k-content--archive">
	<?php if ( have_posts() ) : ?>
		<ul class="k-post-list">
			<?php while ( have_posts() ) : the_post(); ?>
				<li><?php get_template_part( 'template-parts/content', get_post_type() ); ?></li>
			<?php endwhile; ?>
		</ul>
	<?php else : ?>
		<p class="k-content__empty">コンテンツがありません。</p>
	<?php endif; ?>
</div>
<?php
get_footer();
