/**
 * 金杢犀 — ローディング画面（Step 4 でランダム動物・アニメ実装）
 * 依存: svg-animals.js (KinmokuseiAnimals)
 */
(function () {
	'use strict';
	var el = document.getElementById('k-loading');
	var animalEl = document.getElementById('k-loading-animal');
	if (!el) return;
	if (animalEl && typeof KinmokuseiAnimals !== 'undefined') {
		var key = KinmokuseiAnimals.getRandomAnimalKey();
		animalEl.innerHTML = KinmokuseiAnimals.getAnimalSvg(key);
		animalEl.setAttribute('aria-label', key);
	}

	function hide() {
		el.classList.add('is-exit');
		document.body.classList.add('k-loading-done');
		document.body.style.overflow = '';
		setTimeout(function () {
			el.style.display = 'none';
		}, 600);
	}

	document.body.style.overflow = 'hidden';
	if (document.readyState === 'complete') {
		setTimeout(hide, 1200);
	} else {
		window.addEventListener('load', function () {
			setTimeout(hide, 1200);
		});
	}
})();
