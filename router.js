// ── SPA-Style Router ──
// Intercepts internal link clicks, fetches new page via XHR,
// and swaps content without full reload. Starfield, menu, and music persist.
(function () {
    var transitioning = false;

    function getDir(url) {
        return url.substring(0, url.lastIndexOf('/') + 1);
    }

    function absolutizeCssUrls(cssText, baseUrl) {
        if (!cssText) return cssText;

        return cssText.replace(/url\((['"]?)([^)'"]+)\1\)/g, function (match, quote, assetUrl) {
            var trimmed = assetUrl.trim();
            if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('http:') || trimmed.startsWith('https:') || trimmed.startsWith('//') || trimmed.startsWith('#')) {
                return match;
            }

            try {
                return 'url("' + new URL(trimmed, baseUrl).href + '")';
            } catch (e) {
                return match;
            }
        });
    }

    function isInternalLink(a) {
        if (!a.href) return false;
        if (a.target === '_blank') return false;
        if (a.getAttribute('data-no-router')) return false;
        if (a.getAttribute('href').startsWith('#')) return false;
        if (a.getAttribute('href').startsWith('mailto:')) return false;
        // Same origin check (works for both http and file)
        var cur = location.protocol + '//' + location.host;
        if (!a.href.startsWith(cur) && location.protocol !== 'file:') return false;
        // For file://, just check it ends in .html
        if (location.protocol === 'file:' && !a.href.endsWith('.html')) return false;
        return true;
    }

    function loadPage(url, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onload = function () {
            if (xhr.status === 200 || xhr.status === 0) {
                callback(null, xhr.responseText);
            } else {
                callback(new Error('HTTP ' + xhr.status));
            }
        };
        xhr.onerror = function () { callback(new Error('XHR failed')); };
        xhr.send();
    }

    function navigate(url, pushToHistory) {
        if (transitioning) return;
        transitioning = true;

        var pageWrap = document.querySelector('.page-wrap');
        if (!pageWrap) { location.href = url; return; }

        // Fade out
        pageWrap.style.transition = 'opacity 0.2s ease';
        pageWrap.style.opacity = '0';

        loadPage(url, function (err, html) {
            if (err) { location.href = url; return; }

            var parser = new DOMParser();
            var doc = parser.parseFromString(html, 'text/html');

            var newPageWrap = doc.querySelector('.page-wrap');
            var newTitle = doc.querySelector('title');
            var newStyle = doc.querySelector('head style');
            var curStyle = document.querySelector('head style');

            if (!newPageWrap) { location.href = url; return; }

            // Fix relative paths in new content
            var newBase = getDir(url);
            var curBase = getDir(location.href);

            if (newBase !== curBase) {
                var imgs = newPageWrap.querySelectorAll('img[src]');
                for (var i = 0; i < imgs.length; i++) {
                    var src = imgs[i].getAttribute('src');
                    if (src && !src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('/') && !src.startsWith('file:')) {
                        try { imgs[i].setAttribute('src', new URL(src, url).href); } catch (e) { }
                    }
                }
                var links = newPageWrap.querySelectorAll('a[href]');
                for (var j = 0; j < links.length; j++) {
                    var href = links[j].getAttribute('href');
                    if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('/') && !href.startsWith('file:')) {
                        try { links[j].setAttribute('href', new URL(href, url).href); } catch (e) { }
                    }
                }
            }

            setTimeout(function () {
                // Swap style
                if (newStyle && curStyle) {
                    curStyle.textContent = absolutizeCssUrls(newStyle.textContent, url);
                }

                // Load page-specific stylesheets from new page
                var newLinks = doc.querySelectorAll('link[rel="stylesheet"]');
                newLinks.forEach(function (link) {
                    var href = link.getAttribute('href');
                    if (!href) return;
                    // Skip CDN links (already global) and check if already loaded
                    if (href.startsWith('http')) return;
                    var absHref = new URL(href, url).href;
                    var exists = document.querySelector('link[href="' + href + '"], link[href="' + absHref + '"]');
                    if (!exists) {
                        var newLink = document.createElement('link');
                        newLink.rel = 'stylesheet';
                        newLink.href = absHref;
                        document.head.appendChild(newLink);
                    }
                });

                // Swap content
                pageWrap.innerHTML = newPageWrap.innerHTML;

                // Update title
                if (newTitle) document.title = newTitle.textContent;

                // Push to history
                if (pushToHistory) {
                    history.pushState({ url: url }, '', url);
                }

                // Scroll to top
                window.scrollTo(0, 0);

                // Re-init fade-in observers
                var obs = new IntersectionObserver(function (entries) {
                    entries.forEach(function (e) {
                        if (e.isIntersecting) e.target.classList.add('v');
                    });
                }, { threshold: 0.12 });
                document.querySelectorAll('.page-wrap .f').forEach(function (el) { obs.observe(el); });

                // Re-init gallery if navigating to gallery page
                var isGallery = url.indexOf('gallery') !== -1;
                if (isGallery && document.getElementById('masonry-gallery')) {
                    // Ensure Masonry.js is loaded
                    if (typeof window.initMasonry === 'function') {
                        window.initMasonry('masonry-gallery', {
                            animateFrom: 'bottom',
                            blurToFocus: true,
                            scaleOnHover: true,
                            hoverScale: 0.95,
                            stagger: 0.03,
                            duration: 0.5
                        });
                    } else {
                        // Load Masonry.js dynamically
                        var masonryBase = url.replace(/gallery\.html.*$/, '');
                        var script = document.createElement('script');
                        script.src = masonryBase + 'Masonry.js';
                        script.onload = function () {
                            if (typeof window.initMasonry === 'function') {
                                window.initMasonry('masonry-gallery', {
                                    animateFrom: 'bottom',
                                    blurToFocus: true,
                                    scaleOnHover: true,
                                    hoverScale: 0.95,
                                    stagger: 0.03,
                                    duration: 0.5
                                });
                            }
                        };
                        document.body.appendChild(script);
                    }
                }

                // Fade in
                pageWrap.style.opacity = '0';
                pageWrap.style.transition = 'opacity 0.3s ease';
                requestAnimationFrame(function () {
                    pageWrap.style.opacity = '1';
                });

                transitioning = false;
            }, 220);
        });
    }

    // Intercept clicks
    document.addEventListener('click', function (e) {
        var a = e.target.closest('a');
        if (!a) return;
        if (!isInternalLink(a)) return;

        // Bubble menu links — close menu first, then navigate
        if (a.classList.contains('bubble-pill')) {
            e.preventDefault();
            var closeBtn = document.getElementById('menu-toggle');
            if (closeBtn && closeBtn.classList.contains('open')) {
                closeBtn.click();
            }
            setTimeout(function () { navigate(a.href, true); }, 350);
            return;
        }

        e.preventDefault();
        navigate(a.href, true);
    });

    // Handle back/forward
    window.addEventListener('popstate', function () {
        navigate(location.href, false);
    });

    // Set initial state
    history.replaceState({ url: location.href }, '', location.href);
})();
