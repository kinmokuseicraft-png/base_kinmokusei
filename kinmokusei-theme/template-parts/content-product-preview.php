<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
$product = isset( $GLOBALS['product'] ) && $GLOBALS['product'] instanceof WC_Product ? $GLOBALS['product'] : null;
$link    = $product ? $product->get_permalink() : '#';
$title   = $product ? $product->get_name() : '商品名';
$img_id  = $product ? $product->get_image_id() : 0;
?>
<li class="k-product-card">
	<a class="k-product-card__link" href="<?php echo esc_url( $link ); ?>">
		<span class="k-product-card__img-wrap k-scroll-reveal">
			<?php
			if ( $img_id ) {
				echo wp_get_attachment_image( $img_id, 'medium_large', false, array( 'class' => 'k-product-card__img', 'loading' => 'lazy' ) );
			} else {
				$placeholder_src = kinmokusei_get_default_product_placeholder_url();
				if ( $placeholder_src ) {
					echo '<img class="k-product-card__img" src="' . esc_url( $placeholder_src ) . '" alt="" loading="lazy">';
				} else {
					echo '<span class="k-product-card__placeholder"></span>';
				}
			}
			?>
		</span>
		<span class="k-product-card__title"><?php echo esc_html( $title ); ?></span>
	</a>
</li>
