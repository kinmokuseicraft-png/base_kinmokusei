<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
$shop_url = function_exists( 'wc_get_page_id' ) ? get_permalink( wc_get_page_id( 'shop' ) ) : home_url( '/shop/' );
?>
</main>

<footer class="k-footer" role="contentinfo">
	<div class="k-footer__inner">
		<p class="k-footer__copy"><?php bloginfo( 'name' ); ?></p>
		<a class="k-footer__shop" href="<?php echo esc_url( $shop_url ); ?>">すべての商品を見る</a>
	</div>
</footer>

<?php wp_footer(); ?>
</body>
</html>
