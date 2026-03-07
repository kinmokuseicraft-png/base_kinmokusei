<?php
/**
 * 金杢犀 テーマ用 functions.php
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'KINMOKUSEI_THEME_VERSION', '1.0.0' );
define( 'KINMOKUSEI_THEME_DIR', get_template_directory() );
define( 'KINMOKUSEI_THEME_URI', get_template_directory_uri() );

require_once KINMOKUSEI_THEME_DIR . '/inc/enqueue.php';

/**
 * デフォルトのヒーロー画像URL（未設定時用）。assets/images/hero-kinmokusei.jpg を配置すると使用される。
 */
function kinmokusei_get_default_hero_url() {
	$path = KINMOKUSEI_THEME_DIR . '/assets/images/hero-kinmokusei.jpg';
	return file_exists( $path ) ? KINMOKUSEI_THEME_URI . '/assets/images/hero-kinmokusei.jpg' : '';
}

/**
 * 商品プレースホルダー画像URL。assets/images/product-pen-placeholder.jpg を配置すると使用される。
 */
function kinmokusei_get_default_product_placeholder_url() {
	$path = KINMOKUSEI_THEME_DIR . '/assets/images/product-pen-placeholder.jpg';
	return file_exists( $path ) ? KINMOKUSEI_THEME_URI . '/assets/images/product-pen-placeholder.jpg' : '';
}

add_theme_support( 'title-tag' );
$default_header = kinmokusei_get_default_hero_url();
add_theme_support( 'custom-header', array_merge(
	array(
		'width'       => 1920,
		'height'      => 1080,
		'flex-height' => true,
		'flex-width'  => true,
	),
	$default_header ? array( 'default-image' => $default_header ) : array()
) );
add_theme_support( 'post-thumbnails' );
add_theme_support( 'html5', array( 'search-form', 'comment-form', 'comment-list', 'gallery', 'caption' ) );
