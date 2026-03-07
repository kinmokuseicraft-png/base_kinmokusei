/**
 * 金杢犀 — スクロール連動：モノクロ→カラー（花紫風）
 * .k-scroll-reveal がビューポートに入ったら is-revealed を付与
 */
(function () {
	'use strict';
	var els = document.querySelectorAll('.k-scroll-reveal');
	if (!els.length) return;

	var observer = new IntersectionObserver(
		function (entries) {
			entries.forEach(function (entry) {
				if (entry.isIntersecting) {
					entry.target.classList.add('is-revealed');
				}
			});
		},
		{
			root: null,
			rootMargin: '0px 0px -8% 0px',
			threshold: 0.1
		}
	);

	els.forEach(function (el) {
		observer.observe(el);
	});
})();
