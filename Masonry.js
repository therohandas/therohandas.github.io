/* Masonry Gallery — CSS Column-Based
   No cropping, images show at natural aspect ratios
   GSAP scroll reveals + lightbox
   
   Robust version: handles SPA navigation, image errors,
   GSAP availability, and fetch retries. */

(function () {
    'use strict';

    var expandSVG = '<svg viewBox="0 0 24 24"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';

    // ═══════════════════════════════════════
    //  LIGHTBOX
    // ═══════════════════════════════════════

    var lightbox = null;
    var lbImg = null;
    var lbCounter = null;
    var lbItems = [];
    var lbIndex = 0;
    var lbTouchStartX = 0;

    function createLightbox() {
        if (lightbox) return; // prevent duplicates
        lightbox = document.createElement('div');
        lightbox.className = 'gallery-lightbox';
        lightbox.innerHTML =
            '<button class="gallery-lb-close" aria-label="Close">\u2715</button>' +
            '<button class="gallery-lb-nav gallery-lb-prev" aria-label="Previous">\u2039</button>' +
            '<button class="gallery-lb-nav gallery-lb-next" aria-label="Next">\u203A</button>' +
            '<img class="gallery-lightbox-img" alt="" />' +
            '<div class="gallery-lb-counter"></div>';
        document.body.appendChild(lightbox);

        lbImg = lightbox.querySelector('.gallery-lightbox-img');
        lbCounter = lightbox.querySelector('.gallery-lb-counter');

        lightbox.querySelector('.gallery-lb-close').addEventListener('click', closeLightbox);
        lightbox.addEventListener('click', function (e) {
            if (e.target === lightbox) closeLightbox();
        });
        lightbox.querySelector('.gallery-lb-prev').addEventListener('click', function (e) {
            e.stopPropagation(); navigateLB(-1);
        });
        lightbox.querySelector('.gallery-lb-next').addEventListener('click', function (e) {
            e.stopPropagation(); navigateLB(1);
        });

        // Touch swipe support for mobile lightbox
        lightbox.addEventListener('touchstart', function (e) {
            lbTouchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        lightbox.addEventListener('touchend', function (e) {
            var dx = e.changedTouches[0].screenX - lbTouchStartX;
            if (Math.abs(dx) > 50) {
                navigateLB(dx > 0 ? -1 : 1);
            }
        }, { passive: true });

        document.addEventListener('keydown', function (e) {
            if (!lightbox || !lightbox.classList.contains('active')) return;
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') navigateLB(-1);
            if (e.key === 'ArrowRight') navigateLB(1);
        });
    }

    function openLightbox(items, index) {
        createLightbox();
        lbItems = items;
        lbIndex = index;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
        showLBImage();

        if (typeof gsap !== 'undefined') {
            gsap.fromTo(lightbox, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.out' });
            gsap.fromTo(lbImg,
                { scale: 0.85, opacity: 0, y: 30 },
                { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.2)', delay: 0.05 }
            );
        } else {
            lightbox.style.opacity = '1';
            lbImg.style.opacity = '1';
        }
    }

    function closeLightbox() {
        if (typeof gsap !== 'undefined') {
            gsap.to(lbImg, { scale: 0.9, opacity: 0, duration: 0.25, ease: 'power2.in' });
            gsap.to(lightbox, {
                opacity: 0, duration: 0.3, delay: 0.05, ease: 'power2.in',
                onComplete: function () {
                    lightbox.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        } else {
            lightbox.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    function navigateLB(dir) {
        if (!lbItems.length) return;
        lbIndex = (lbIndex + dir + lbItems.length) % lbItems.length;

        if (typeof gsap !== 'undefined') {
            gsap.to(lbImg, {
                opacity: 0, x: dir * -40, duration: 0.18, ease: 'power2.in',
                onComplete: function () {
                    showLBImage();
                    gsap.fromTo(lbImg,
                        { opacity: 0, x: dir * 40 },
                        { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' }
                    );
                }
            });
        } else {
            showLBImage();
        }
    }

    function showLBImage() {
        lbImg.src = lbItems[lbIndex].img;
        lbCounter.textContent = (lbIndex + 1) + ' / ' + lbItems.length;
    }

    // ═══════════════════════════════════════
    //  FETCH WITH RETRY
    // ═══════════════════════════════════════

    function fetchWithRetry(url, retries, delay) {
        return fetch(url).then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r;
        }).catch(function (err) {
            if (retries > 0) {
                return new Promise(function (resolve) {
                    setTimeout(function () {
                        resolve(fetchWithRetry(url, retries - 1, delay * 1.5));
                    }, delay);
                });
            }
            throw err;
        });
    }

    // ═══════════════════════════════════════
    //  RESOLVE PATHS (SPA-safe)
    // ═══════════════════════════════════════

    // Resolve a relative path against the *actual* page that gallery.html lives on,
    // not the current browser URL (which may differ under SPA routing).
    function resolveGalleryBase() {
        // Try to find the <link> to Masonry.css — its href tells us where the gallery lives
        var links = document.querySelectorAll('link[rel="stylesheet"]');
        for (var i = 0; i < links.length; i++) {
            if (links[i].href && links[i].href.indexOf('Masonry.css') !== -1) {
                return links[i].href.replace(/Masonry\.css.*$/, '');
            }
        }
        // Fallback: use the page's own script src
        var scripts = document.querySelectorAll('script[src]');
        for (var j = 0; j < scripts.length; j++) {
            if (scripts[j].src && scripts[j].src.indexOf('Masonry.js') !== -1) {
                return scripts[j].src.replace(/Masonry\.js.*$/, '');
            }
        }
        // Last resort: current location
        return '';
    }

    // ═══════════════════════════════════════
    //  MAIN
    // ═══════════════════════════════════════

    // Track active gallery instance for cleanup
    var activeObservers = [];

    window.initMasonry = function (containerId, options) {
        var opts = Object.assign({
            folder: 'img/gallery',
            jsonPath: 'gallery.json'
        }, options || {});

        var container = document.getElementById(containerId);
        if (!container) return console.error('Gallery container not found:', containerId);

        // Cleanup previous observers if re-initializing (SPA navigation)
        activeObservers.forEach(function (obs) {
            try { obs.disconnect(); } catch (e) { }
        });
        activeObservers = [];

        // Loading placeholder
        container.innerHTML = '<div class="gallery-sections">' +
            '<div class="g-card" style="opacity:1;transform:none"><div class="g-card-img loading" style="min-height:300px"></div></div>' +
            '<div class="g-card" style="opacity:1;transform:none"><div class="g-card-img loading" style="min-height:250px"></div></div>' +
            '<div class="g-card" style="opacity:1;transform:none"><div class="g-card-img loading" style="min-height:200px"></div></div>' +
            '<div class="g-card" style="opacity:1;transform:none"><div class="g-card-img loading" style="min-height:280px"></div></div>' +
            '</div>';

        // Build an absolute URL for gallery.json so it works after SPA navigation
        var base = resolveGalleryBase();
        var jsonUrl = base ? base + opts.jsonPath : opts.jsonPath;
        var imgBase = base ? base + opts.folder + '/' : opts.folder + '/';

        fetchWithRetry(jsonUrl, 2, 800)
            .then(function (r) { return r.json(); })
            .then(function (filenames) {
                if (!filenames || !filenames.length) {
                    throw new Error('Empty gallery data');
                }
                container.innerHTML = '';
                var items = filenames.map(function (name, i) {
                    return {
                        id: String(i + 1),
                        img: imgBase + encodeURIComponent(name),
                        filename: name
                    };
                });
                buildGallery(container, items);
            })
            .catch(function (err) {
                console.error('Gallery:', err);
                container.innerHTML =
                    '<p style="text-align:center;color:rgba(255,255,255,.4);padding:4rem 0;">' +
                    'Failed to load gallery. ' +
                    '<a href="javascript:void(0)" onclick="initMasonry(\'' + containerId + '\')" ' +
                    'style="color:var(--blue-light, #60a5fa);text-decoration:underline;cursor:pointer;">Try again</a>' +
                    '</p>';
            });
    };

    function buildGallery(container, items) {
        var wrapper = document.createElement('div');
        wrapper.className = 'gallery-sections';

        var cards = [];
        var loadedCount = 0;
        var totalCount = items.length;

        items.forEach(function (item, i) {
            var card = document.createElement('div');
            card.className = 'g-card';

            var imgDiv = document.createElement('div');
            imgDiv.className = 'g-card-img loading';

            var imgEl = document.createElement('img');
            imgEl.alt = '';
            imgEl.loading = i < 6 ? 'eager' : 'lazy';
            imgEl.decoding = i < 6 ? 'sync' : 'async';
            imgEl.className = 'g-img';

            // Handle successful load
            imgEl.onload = function () {
                imgDiv.classList.remove('loading');
                loadedCount++;
            };

            // Handle failed load — remove the card entirely instead of showing broken image
            imgEl.onerror = function () {
                imgDiv.classList.remove('loading');
                card.style.display = 'none';
                loadedCount++;
                console.warn('Gallery: failed to load image:', item.img);
            };

            // Set src AFTER attaching event handlers
            imgEl.src = item.img;

            var expandIcon = document.createElement('div');
            expandIcon.className = 'g-card-expand';
            expandIcon.innerHTML = expandSVG;

            imgDiv.appendChild(imgEl);
            imgDiv.appendChild(expandIcon);
            card.appendChild(imgDiv);

            // Click → lightbox (only if image loaded successfully)
            card.addEventListener('click', function () {
                if (card.style.display === 'none') return;
                // Build list of visible items for lightbox navigation
                var visibleItems = items.filter(function (_, idx) {
                    return cards[idx] && cards[idx].style.display !== 'none';
                });
                var visibleIndex = visibleItems.indexOf(item);
                if (visibleIndex === -1) visibleIndex = 0;
                openLightbox(visibleItems, visibleIndex);
            });

            wrapper.appendChild(card);
            cards.push(card);
        });

        container.appendChild(wrapper);

        // ── Scroll-triggered reveal ──
        if (typeof gsap !== 'undefined') {
            var revealObserver = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    revealObserver.unobserve(entry.target);

                    gsap.to(entry.target, {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        duration: 0.65,
                        ease: 'power3.out'
                    });
                });
            }, { threshold: 0.05, rootMargin: '0px 0px -20px 0px' });

            activeObservers.push(revealObserver);

            cards.forEach(function (card) {
                revealObserver.observe(card);
            });
        } else {
            // No GSAP — just show cards immediately with CSS transition
            cards.forEach(function (card, i) {
                setTimeout(function () {
                    card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0) scale(1)';
                }, i * 40);
            });
        }
    }
})();
