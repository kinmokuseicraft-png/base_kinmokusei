<?php
/**
 * 金杢犀 — CSS/JS のエンキュー
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function kinmokusei_enqueue_assets() {
	$v = KINMOKUSEI_THEME_VERSION;
	$uri = KINMOKUSEI_THEME_URI;

	wp_enqueue_style(
		'kinmokusei-main',
		$uri . '/assets/css/main.css',
		array(),
		$v
	);

	// ローディング用（動物SVG + ランダム表示）。front-page のみ、または全ページ
	wp_enqueue_script(
		'kinmokusei-animals',
		$uri . '/assets/js/svg-animals.js',
		array(),
		$v,
		true
	);

	wp_enqueue_script(
		'kinmokusei-loading',
		$uri . '/assets/js/loading.js',
		array( 'kinmokusei-animals' ),
		$v,
		true
	);

	// スクロール連動（モノクロ→カラー）は Step 4 で追加
	wp_enqueue_script(
		'kinmokusei-scroll-animation',
		$uri . '/assets/js/scroll-animation.js',
		array(),
		$v,
		true
	);
}

add_action( 'wp_enqueue_scripts', 'kinmokusei_enqueue_assets' );
