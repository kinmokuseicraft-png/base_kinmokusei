<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<article class="k-post">
	<h2 class="k-post__title"><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
	<?php the_excerpt(); ?>
</article>
