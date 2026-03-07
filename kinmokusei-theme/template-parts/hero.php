<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
$shop_url = function_exists( 'wc_get_page_id' ) ? get_permalink( wc_get_page_id( 'shop' ) ) : home_url( '/shop/' );
?>
<section class="k-hero" aria-label="メインビジュアル">
	<div class="k-hero__inner">
		<div class="k-hero__image-wrap">
			<?php
			$hero_src = get_header_image() ?: kinmokusei_get_default_hero_url();
			if ( $hero_src ) :
				?>
				<img class="k-hero__image k-scroll-reveal" src="<?php echo esc_url( $hero_src ); ?>" alt="" width="1920" height="1080">
			<?php else : ?>
				<div class="k-hero__placeholder"></div>
			<?php endif; ?>
		</div>
		<div class="k-hero__text">
			<h1 class="k-hero__title"><?php bloginfo( 'name' ); ?></h1>
			<p class="k-hero__lead"><?php bloginfo( 'description' ); ?></p>
			<a class="k-hero__cta k-button" href="<?php echo esc_url( $shop_url ); ?>">ショップを見る</a>
		</div>
	</div>
</section>
