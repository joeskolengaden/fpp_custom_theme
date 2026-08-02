/* =====================================================================
   WinterLights.in — FPP Custom Theme  ::  SKIN ENGINE (custom.js)
   ---------------------------------------------------------------------
   Auto-loaded by FPP on every page (config/custom.js). Responsibilities:
     1. Inject the active skin stylesheet (wl-skin-<id>.css).
     2. Mirror the skin's light/dark mode onto html[data-bs-theme] so
        FPP 9.x Bootstrap components follow the skin.
     3. Inject the WinterLights brand block into the header.
     4. Inject a floating skin picker; persist choice in localStorage.
     5. Apply WinterLights branding (footer link rewrite).
   Pure vanilla JS — no dependency on FPP's jQuery version.
   Works on FPP 5.4 -> 9.x (skin files no-op gracefully on old DOM).
   ===================================================================== */
(function () {
	"use strict";

	// --- config --------------------------------------------------------
	var STORE_KEY = "wlSkin";
	var DEFAULT_SKIN = "midnight";
	var BASE = "api/configfile/";          // FPP serves config files here (relative, proxy-safe)
	var LOGO = BASE + "winterlights_fpp.png";
	var DEFAULT_SKIN_ID = "default";       // this skin means "show native FPP" — see applySkin()

	var SKINS = [
		/* id stays "default" (matches wl-skin-default.css + existing saved
		   localStorage values) — only the display name changed, and this
		   entry moved to the front so it's the first option in the picker. */
		{ id: "default",  name: "Original FPP", desc: "Original FPP look",     mode: "light", swatch: "linear-gradient(135deg,#f5f5f5,#171720)" },
		{ id: "midnight", name: "Midnight", desc: "Modern dark dashboard", mode: "dark",  swatch: "linear-gradient(135deg,#38bdf8,#6366f1)" },
		{ id: "festive",  name: "Festive",  desc: "Bright winter gradient", mode: "light", swatch: "linear-gradient(135deg,#adc4f0,#f5c1e7)" },
		{ id: "minimal",  name: "Minimal",  desc: "Clean & neutral",       mode: "light", swatch: "linear-gradient(135deg,#e6ebf1,#3b6ea8)" },
		{ id: "frost",    name: "Frost",    desc: "Frosted glass",          mode: "dark",  swatch: "linear-gradient(135deg,#7fd8ff,#c9a9ff)" }
	];
	// SKINS above is a fallback list — always available immediately, even if
	// discovery (below) fails or hasn't finished yet. Any wl-skin-<id>.css
	// uploaded through the plugin's own upload form is picked up on the next
	// page load with no further edits needed here.

	function skinById(id) {
		for (var i = 0; i < SKINS.length; i++) if (SKINS[i].id === id) return SKINS[i];
		return SKINS[0];
	}
	function skinByIdStrict(id) {
		for (var i = 0; i < SKINS.length; i++) if (SKINS[i].id === id) return SKINS[i];
		return null;
	}
	function humanize(id) {
		return id.replace(/[-_]+/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
	}
	// FPP's real API (see api/endpoints.json): GET /api/configfile lists
	// every file in /home/fpp/media/config as { ConfigFiles: [...] }.
	function discoverSkins(done) {
		fetch(BASE.replace(/\/$/, ""), { cache: "no-store" })
			.then(function (r) { return r.ok ? r.json() : null; })
			.then(function (data) {
				if (!data || !data.ConfigFiles) { done(); return; }
				var newIds = [];
				for (var i = 0; i < data.ConfigFiles.length; i++) {
					var m = /^wl-skin-(.+)\.css$/.exec(data.ConfigFiles[i]);
					if (m && !skinByIdStrict(m[1])) newIds.push(m[1]);
				}
				if (newIds.length === 0) { done(); return; }
				var pending = newIds.length;
				newIds.forEach(function (id) {
					fetch(BASE + "wl-skin-" + id + ".css", { cache: "no-store" })
						.then(function (r) { return r.ok ? r.text() : ""; })
						.then(function (css) { SKINS.push(parseSkinMeta(id, css)); })
						.catch(function () {})
						.then(function () { if (--pending === 0) done(); });
				});
			})
			.catch(function () { done(); });
	}
	// Best-effort metadata for an auto-discovered skin, parsed straight out
	// of the file's own header comment and --wl-accent/--wl-bg variables —
	// matches the "/* WinterLights skin :: NAME — desc */" convention every
	// skin file already follows, so no extra manifest file is needed.
	function parseSkinMeta(id, css) {
		var descMatch = /WinterLights skin\s*::[^—-]*[—-]\s*([^\n*]+)/i.exec(css);
		var accent  = (/--wl-accent:\s*([^;]+);/.exec(css)  || [null, "#38bdf8"])[1].trim();
		var accent2 = (/--wl-accent-2:\s*([^;]+);/.exec(css) || [null, accent])[1].trim();
		var bgHex   = /--wl-bg:\s*#([0-9a-f]{6})/i.exec(css);
		var mode = "dark";
		if (bgHex) {
			var r = parseInt(bgHex[1].substr(0, 2), 16), g = parseInt(bgHex[1].substr(2, 2), 16), b = parseInt(bgHex[1].substr(4, 2), 16);
			mode = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.5 ? "light" : "dark";
		}
		return {
			id: id,
			name: humanize(id),
			desc: descMatch ? descMatch[1].trim() : "Custom skin",
			mode: mode,
			swatch: "linear-gradient(135deg," + accent + "," + accent2 + ")"
		};
	}
	function getSaved() {
		try { return localStorage.getItem(STORE_KEY) || DEFAULT_SKIN; }
		catch (e) { return DEFAULT_SKIN; }
	}
	function save(id) { try { localStorage.setItem(STORE_KEY, id); } catch (e) {} }

	// FPP itself hardcodes this <link> into every page's <head> (see
	// common/menuHead.inc: href="api/configfile/custom.css?ref=<mtime>") —
	// it's not something we inject, but we CAN find it and toggle it off.
	function findNativeCustomCssLink() {
		var links = document.querySelectorAll('link[rel="stylesheet"][href*="configfile/custom.css"]');
		return links.length ? links[0] : null;
	}
	// Always-on styling for the brand block + skin picker, loaded once and
	// never disabled — otherwise choosing "Default" (which disables the
	// link above) would also leave the picker itself unstyled, with no way
	// to switch back to a themed skin.
	function ensurePickerCss() {
		if (document.getElementById("wl-picker-css")) return;
		var link = document.createElement("link");
		link.id = "wl-picker-css";
		link.rel = "stylesheet";
		link.href = BASE + "wl-picker.css";
		document.head.appendChild(link);
	}

	// --- apply a skin --------------------------------------------------
	// `persist` must be true ONLY for an explicit user choice (clicking a
	// picker option). Every restore-on-page-load call leaves it false —
	// otherwise, a skin not yet in SKINS (discovered ones, before
	// discoverSkins() finishes) falls back to SKINS[0] and saving THAT
	// clobbers the real saved choice in localStorage before discovery
	// ever gets a chance to restore it, permanently reverting to Midnight
	// on the very next page load.
	function applySkin(id, persist) {
		var skin = skinById(id);
		var link = document.getElementById("wl-active-skin");
		if (!link) {
			link = document.createElement("link");
			link.id = "wl-active-skin";
			link.rel = "stylesheet";
			// append last so it overrides custom.css + FPP core
			document.head.appendChild(link);
		}
		link.href = BASE + "wl-skin-" + skin.id + ".css";

		// "Default" means: show native FPP untouched. custom.css itself
		// can't be un-loaded (FPP, not us, put it in <head>), but it CAN be
		// disabled — a real DOM API that fully deactivates a stylesheet
		// without removing it, so re-selecting a themed skin just flips it
		// back on. The skin file above stays loaded regardless, purely so
		// its --wl-* variables exist for the always-on brand/picker to use.
		var nativeCss = findNativeCustomCssLink();
		if (nativeCss) nativeCss.disabled = (skin.id === DEFAULT_SKIN_ID);

		// mirror onto Bootstrap 5.3 theme (FPP 9.x); harmless attribute otherwise
		document.documentElement.setAttribute("data-bs-theme", skin.mode);

		// reflect selection in the picker
		var opts = document.querySelectorAll(".wl-skin-option");
		for (var i = 0; i < opts.length; i++) {
			opts[i].setAttribute("aria-checked", opts[i].getAttribute("data-skin") === skin.id ? "true" : "false");
		}
		if (persist) save(skin.id);
	}

	// --- brand block in the header ------------------------------------
	function injectBrand() {
		if (document.querySelector(".wl-brand")) return;
		var header = document.querySelector(".header") ||
		             document.querySelector("#header") ||
		             document.querySelector("#bodyWrapper");
		if (!header) return;
		var brand = document.createElement("div");
		brand.className = "wl-brand";
		brand.innerHTML =
			'<img src="' + LOGO + '" alt="WinterLights" ' +
			'onerror="this.style.display=\'none\'">' +
			'<span class="wl-wordmark">WinterLights.in</span>';
		if (getComputedStyle(header).position === "static") header.style.position = "relative";
		header.insertBefore(brand, header.firstChild);
	}

	// --- footer / brand link rewrite (carried from original theme) ----
	function applyBranding() {
		var links = document.querySelectorAll('a[href*="falconchristmas.com"]');
		for (var i = 0; i < links.length; i++) {
			// keep FPP credit links elsewhere intact; only retarget the footer "made by" link
			if (/falconchristmas\.com\/?$/.test(links[i].getAttribute("href") || "")) {
				links[i].textContent = "WinterLights.in";
				links[i].setAttribute("href", "https://www.WinterLights.in");
				links[i].setAttribute("target", "_blank");
			}
		}
	}

	// --- floating skin picker -----------------------------------------
	// Rebuilds just the option buttons from the current SKINS array — safe
	// to call again later (e.g. after discoverSkins() finds new files)
	// without touching the widget's own DOM/listeners.
	function renderSkinOptions() {
		var container = document.getElementById("wlSkinOptions");
		if (!container) return;
		var html = "";
		for (var i = 0; i < SKINS.length; i++) {
			var s = SKINS[i];
			html +=
				'<button type="button" class="wl-skin-option" role="radio" ' +
				'aria-checked="false" data-skin="' + s.id + '">' +
				'<span class="wl-swatch" style="background:' + s.swatch + '"></span>' +
				'<span><span class="wl-skin-name">' + s.name + '</span>' +
				'<span class="wl-skin-desc">' + s.desc + '</span></span>' +
				'</button>';
		}
		container.innerHTML = html;
	}

	function injectPicker() {
		if (document.getElementById("wlSkinPicker")) { renderSkinOptions(); return; }

		var wrap = document.createElement("div");
		wrap.id = "wlSkinPicker";

		var toggle = document.createElement("button");
		toggle.id = "wlSkinToggle";
		toggle.type = "button";
		toggle.title = "WinterLights theme";
		toggle.setAttribute("aria-label", "Choose theme skin");
		toggle.innerHTML = '<i class="fas fa-snowflake"></i>';

		var panel = document.createElement("div");
		panel.id = "wlSkinPanel";
		panel.hidden = true;
		panel.innerHTML = '<h4>Theme Skin</h4>' +
			'<div id="wlSkinOptions"></div>' +
			'<div class="wl-foot">' +
			'<a href="https://www.WinterLights.in" target="_blank">WinterLights.in</a></div>';

		wrap.appendChild(panel);
		wrap.appendChild(toggle);
		document.body.appendChild(wrap);

		renderSkinOptions();

		function openPanel()  { panel.hidden = false; panel.classList.remove("wl-closing"); }
		function closePanel() {
			panel.classList.add("wl-closing");
			setTimeout(function () { panel.hidden = true; panel.classList.remove("wl-closing"); }, 180);
		}
		toggle.addEventListener("click", function (e) {
			e.stopPropagation();
			if (panel.hidden) openPanel(); else closePanel();
		});
		panel.addEventListener("click", function (e) {
			var btn = e.target.closest ? e.target.closest(".wl-skin-option") : null;
			if (btn) { applySkin(btn.getAttribute("data-skin"), true); }
			e.stopPropagation();
		});
		document.addEventListener("click", function () { if (!panel.hidden) closePanel(); });
		document.addEventListener("keydown", function (e) {
			if (e.key === "Escape" && !panel.hidden) closePanel();
		});
	}

	// --- boot ----------------------------------------------------------
	function init() {
		ensurePickerCss();       // load before applySkin() so the brand/picker are styled immediately
		applySkin(getSaved());   // sets the link + data-bs-theme ASAP, from the fallback list
		injectBrand();
		applyBranding();
		discoverSkins(function () {
			// runs after any newly-uploaded wl-skin-*.css files are found and
			// their metadata parsed, so the picker lists them immediately
			injectPicker();
			applySkin(getSaved());   // re-apply: corrects the skin if it was a newly-discovered one, and syncs picker checkmarks
		});
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})();
