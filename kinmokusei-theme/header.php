<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
$shop_url = function_exists( 'wc_get_page_id' ) ? get_permalink( wc_get_page_id( 'shop' ) ) : home_url( '/shop/' );
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<link rel="profile" href="https://gmpg.org/xfn/11">
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;500;600&family=Noto+Sans+JP:wght@300;400;500&display=swap" rel="stylesheet">
	<?php wp_head(); ?>
</head>
<body <?php body_class( 'kinmokusei-body' ); ?>>
<?php wp_body_open(); ?>

<header class="k-header" id="k-header" role="banner">
	<div class="k-header__inner">
		<a class="k-header__logo" href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php bloginfo( 'name' ); ?></a>
		<nav class="k-header__nav" aria-label="<?php esc_attr_e( 'Main navigation', 'kinmokusei' ); ?>">
			<a class="k-header__link k-header__link--shop" href="<?php echo esc_url( $shop_url ); ?>">SHOP</a>
		</nav>
	</div>
</header>

<main class="k-main" id="k-main">
