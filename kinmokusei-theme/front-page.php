<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
get_header();

/* ローディング用ラッパー。中身は loading.js が差し替え */
get_template_part( 'template-parts/loading-screen' );
?>

<div class="k-page-content" id="k-page-content">
	<?php get_template_part( 'template-parts/hero' ); ?>

	<section class="k-section k-section--products" aria-label="商品">
		<div class="k-section__inner">
			<h2 class="k-section__title">SHOP</h2>
			<?php if ( function_exists( 'woocommerce_output_product_categories' ) || function_exists( 'wc_get_products' ) ) : ?>
				<ul class="k-product-grid">
					<?php
					if ( function_exists( 'wc_get_products' ) ) {
						$products = wc_get_products( array( 'limit' => 6, 'status' => 'publish' ) );
						foreach ( $products as $product ) {
							setup_postdata( $GLOBALS['post'] );
							$GLOBALS['product'] = $product;
							get_template_part( 'template-parts/content-product-preview' );
						}
						wp_reset_postdata();
					} else {
						// WooCommerce 未導入時はプレースホルダー
						for ( $i = 0; $i < 3; $i++ ) {
							get_template_part( 'template-parts/content-product-preview' );
						}
					}
					?>
				</ul>
			<?php else : ?>
				<ul class="k-product-grid">
					<?php for ( $i = 0; $i < 3; $i++ ) : ?>
						<?php get_template_part( 'template-parts/content-product-preview' ); ?>
					<?php endfor; ?>
				</ul>
			<?php endif; ?>
			<?php
			$shop_url = function_exists( 'wc_get_page_id' ) ? get_permalink( wc_get_page_id( 'shop' ) ) : home_url( '/shop/' );
			?>
			<p class="k-section__cta">
				<a class="k-button" href="<?php echo esc_url( $shop_url ); ?>">すべての商品を見る</a>
			</p>
		</div>
	</section>
</div>

<?php get_footer(); ?>
