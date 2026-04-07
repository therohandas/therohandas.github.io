// -- Background Music --
// Simple text line with play/pause button at bottom-left.
(function () {
    'use strict';
    var KEY_PLAYING = 'bgm_playing';
    var KEY_TRACK = 'bgm_track';
    var KEY_TIME = 'bgm_time';
    var KEY_VOL = 'bgm_vol';

    var scripts = document.getElementsByTagName('script');
    var lastScript = scripts[scripts.length - 1];
    var src = lastScript.getAttribute('src') || '';
    var prefix = src.indexOf('../') === 0 ? '../' : '';
    var musicDir = prefix + 'music/';

    function nameFromFile(f) { return f.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '); }
    function parse(e) { return typeof e === 'string' ? { file: e, artist: '' } : { file: e.file, artist: e.artist || '' }; }

    var _pending = false;
    window.startBgMusic = function () { _pending = true; };

    var xhr = new XMLHttpRequest();
    xhr.open('GET', musicDir + 'playlist.json', true);
    xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 400) {
            try { var l = JSON.parse(xhr.responseText); if (l.length) boot(l); }
            catch (e) { boot([{ file: 'bg_music.mp3', artist: '' }]); }
        } else { boot([{ file: 'bg_music.mp3', artist: '' }]); }
    };
    xhr.onerror = function () { boot([{ file: 'bg_music.mp3', artist: '' }]); };
    xhr.send();

    function boot(playlist) {
        playlist = playlist.map(parse);
        var idx = parseInt(localStorage.getItem(KEY_TRACK) || '0', 10);
        if (idx >= playlist.length) idx = 0;

        var audio = document.createElement('audio');
        audio.id = 'bg-music';
        audio.preload = 'auto';
        audio.volume = parseFloat(localStorage.getItem(KEY_VOL) || '0.5');
        document.body.appendChild(audio);

        var wasPlaying = localStorage.getItem(KEY_PLAYING) === '1';
        var t = playlist[idx];

        var el = document.createElement('div');
        el.id = 'mp';
        el.innerHTML =
            '<div class="mp-row">' +
            '<span class="mp-eq"><span></span><span></span><span></span></span>' +
            '<span class="mp-song" id="mp-song">' + nameFromFile(t.file) + '</span>' +
            '<span class="mp-sep">\u00b7</span>' +
            '<span class="mp-artist" id="mp-artist">' + (t.artist || '') + '</span>' +
            '<button class="mp-pp" id="mp-pp" title="Play / Pause">' +
            '<svg class="mp-ic-play" viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><polygon points="8,4 20,12 8,20"/></svg>' +
            '<svg class="mp-ic-pause" viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><rect x="5" y="4" width="4.5" height="16" rx="1"/><rect x="14.5" y="4" width="4.5" height="16" rx="1"/></svg>' +
            '</button>' +
            '<button class="mp-pp" id="mp-nxt" title="Next"><svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><polygon points="5,4 15,12 5,20"/><rect x="16" y="5" width="3" height="14" rx=".5"/></svg></button>' +
            '</div>' +
            '<div class="mp-progress"><div class="mp-progress-fill" id="mp-pfill"></div></div>';
        document.body.appendChild(el);

        var css = document.createElement('style');
        css.textContent =
            '#mp{position:fixed;bottom:14px;left:16px;z-index:90;display:flex;flex-direction:column;gap:3px;font-family:"Inter","Outfit",sans-serif;opacity:0;animation:mpIn .5s .6s forwards;cursor:default;user-select:none;width:310px}' +
            '.mp-row{display:flex;align-items:center;gap:6px;width:100%;overflow:hidden}' +
            '#mp *{box-sizing:border-box;margin:0;padding:0}' +
            '@keyframes mpIn{to{opacity:1}}' +
            '.mp-eq{display:flex;align-items:flex-end;gap:1.5px;height:10px;flex-shrink:0}' +
            '.mp-eq span{width:2.5px;border-radius:1px;background:#e8863a}' +
            '.mp-eq span:nth-child(1){height:3px;animation:eq1 .8s ease-in-out infinite alternate}' +
            '.mp-eq span:nth-child(2){height:7px;animation:eq2 .6s ease-in-out infinite alternate}' +
            '.mp-eq span:nth-child(3){height:5px;animation:eq3 .7s ease-in-out infinite alternate}' +
            '@keyframes eq1{to{height:8px}}@keyframes eq2{to{height:3px}}@keyframes eq3{to{height:9px}}' +
            '#mp:not(.playing) .mp-eq span{animation-play-state:paused;opacity:.35}' +
            '.mp-song{font-size:.65rem;font-weight:500;color:rgba(255,255,255,.4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:color .2s}' +
            '.mp-sep{font-size:.5rem;color:rgba(255,255,255,.15);flex-shrink:0}' +
            '.mp-artist{font-size:.58rem;font-weight:500;color:rgba(255,255,255,.3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:color .2s}' +
            '#mp:hover .mp-song{color:rgba(255,255,255,.6)}' +
            '#mp:hover .mp-artist{color:rgba(255,255,255,.5)}' +
            '.mp-pp{border:none;background:rgba(255,255,255,.06);color:rgba(255,255,255,.4);width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .2s,color .2s,transform .15s;flex-shrink:0}' +
            '.mp-pp:hover{background:rgba(255,255,255,.12);color:rgba(255,255,255,.8)}' +
            '.mp-pp:active{transform:scale(.85)}' +
            '.mp-ic-play,.mp-ic-pause{display:none;line-height:0}' +
            '#mp.playing .mp-ic-pause{display:flex}' +
            '#mp:not(.playing) .mp-ic-play{display:flex}' +
            '.mp-progress{width:100%;height:1.5px;border-radius:1px;background:rgba(255,255,255,.06);overflow:hidden}' +
            '.mp-progress-fill{height:100%;width:0%;border-radius:1px;background:linear-gradient(90deg,#e8863a,rgba(232,134,58,.15));transition:width .3s linear}' +
            '@media(max-width:500px){#mp{left:10px;bottom:10px}}';
        document.head.appendChild(css);

        var songEl = document.getElementById('mp-song');
        var artistEl = document.getElementById('mp-artist');
        var ppBtn = document.getElementById('mp-pp');

        function ui() { el.classList.toggle('playing', !audio.paused); }
        function setUI() {
            var t = playlist[idx];
            songEl.textContent = nameFromFile(t.file);
            artistEl.textContent = t.artist || '';
        }

        function loadTrack(i, autoplay) {
            if (i >= playlist.length) i = 0;
            if (i < 0) i = playlist.length - 1;
            idx = i;
            audio.src = musicDir + playlist[idx].file;
            localStorage.setItem(KEY_TRACK, String(idx));
            setUI();
            if (autoplay) audio.play().catch(function () { });
        }

        ppBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (audio.paused) { audio.play().catch(function () { }); localStorage.setItem(KEY_PLAYING, '1'); }
            else { audio.pause(); localStorage.setItem(KEY_PLAYING, '0'); }
        });
        document.getElementById('mp-nxt').addEventListener('click', function (e) {
            e.stopPropagation();
            loadTrack(idx + 1, true);
        });

        audio.addEventListener('play', ui);
        audio.addEventListener('pause', ui);
        audio.addEventListener('ended', function () { loadTrack(idx + 1, true); });

        loadTrack(idx, false);
        ui();

        if (wasPlaying) {
            var saved = parseFloat(localStorage.getItem(KEY_TIME) || '0');
            var go = function () { audio.currentTime = saved; audio.play().catch(function () { }); };
            if (audio.readyState >= 2) go();
            else audio.addEventListener('canplay', function f() { audio.removeEventListener('canplay', f); go(); });
        }
        window.addEventListener('beforeunload', function () {
            localStorage.setItem(KEY_PLAYING, audio.paused ? '0' : '1');
            localStorage.setItem(KEY_TIME, String(audio.currentTime));
        });

        window.startBgMusic = function () {
            localStorage.setItem(KEY_PLAYING, '1');
            audio.play().catch(function () { });
        };
        if (_pending) { _pending = false; window.startBgMusic(); }
    }
})();
