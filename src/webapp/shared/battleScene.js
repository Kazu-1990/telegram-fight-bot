// =========================================================
// موتور نمایش صحنه‌ی مبارزه - انیمیشن فریم به فریم، HUD، افکت جایگزین
// برای دشمنانی که فقط idle دارن (شبیه فلش/تکون به‌جای انیمیشن کامل)
//
// این فایل به characterAssets.js نیاز داره (باید قبلش لود بشه)
// =========================================================

(function () {
  const FRAME_DURATION_MS = 160;
  const ACTION_ANIMATION_ROUNDS = 2; // چندبار فریم‌های حمله/دفاع/آلتیمیت تکرار بشن قبل برگشت به idle

  function getAssetEntry(kind, key) {
    const A = window.GameAssets;
    if (kind === "race") return A.RACE_ASSETS[key];
    if (kind === "forest-enemy") return A.FOREST_ENEMY_ASSETS[key];
    if (kind === "dungeon-enemy") return A.DUNGEON_ENEMY_ASSETS[key];
    return null;
  }

  function buildPlaceholder(label, color) {
    const div = document.createElement("div");
    div.className = "bs-placeholder";
    div.style.background = color || "#444";
    div.textContent = label || "?";
    return div;
  }

  class FighterSlot {
    constructor(rootEl, side) {
      this.side = side; // "left" | "right"
      this.root = rootEl;
      this.entry = null;
      this.currentAction = "idle";
      this.frameTimer = null;
      this.frameIndex = 0;

      this.root.innerHTML = `
        <div class="bs-gear-row">
          <div class="bs-gear bs-gear-armor"></div>
          <div class="bs-gear bs-gear-weapon"></div>
        </div>
        <div class="bs-sprite-wrap"></div>
        <div class="bs-name-tag"></div>
      `;
      this.spriteWrap = this.root.querySelector(".bs-sprite-wrap");
      this.armorBox = this.root.querySelector(".bs-gear-armor");
      this.weaponBox = this.root.querySelector(".bs-gear-weapon");
      this.nameTag = this.root.querySelector(".bs-name-tag");
    }

    setCharacter(kind, key, label) {
      this.entry = getAssetEntry(kind, key);
      this.kind = kind;
      this.key = key;
      this.nameTag.textContent = label || (this.entry ? this.entry.label : key || "?");
      this.playAction("idle");
    }

    setGear(armorKey, weaponKey) {
      this._setGearBox(this.armorBox, armorKey);
      this._setGearBox(this.weaponBox, weaponKey);
    }

    _setGearBox(box, key) {
      box.innerHTML = "";
      if (!key) {
        box.classList.add("bs-gear-empty");
        return;
      }
      box.classList.remove("bs-gear-empty");
      const iconUrl = window.GameAssets.GEAR_ICONS[key];
      const img = document.createElement("img");
      img.src = iconUrl || "";
      img.alt = key;
      img.onerror = () => {
        box.innerHTML = "";
        box.appendChild(buildPlaceholder(key.slice(0, 2).toUpperCase(), "#333"));
      };
      box.appendChild(img);
    }

    // action: idle | attack | defend | hit | ultimate
    playAction(action) {
      clearTimeout(this.frameTimer);
      this.currentAction = action;
      this.frameIndex = 0;

      const frames = this.entry?.frames?.[action];

      if (!frames || frames.length === 0) {
        // این کاراکتر (معمولاً دشمن CPU) فریم اختصاصی برای این اکشن نداره
        // به‌جای انیمیشن واقعی، یه جلوه‌ی ساده (تکون/فلش) میزنیم و روی idle می‌مونیم
        this._renderFrame(this.entry?.frames?.idle?.[0], this.entry?.label, this.entry?.color);
        this._playFallbackEffect(action);
        return;
      }

      this._cycleFrames(frames, action === "idle" ? Infinity : ACTION_ANIMATION_ROUNDS, () => {
        if (action !== "idle") this.playAction("idle");
      });
    }

    _cycleFrames(frames, maxLoops, onDone) {
      let loops = 0;
      const step = () => {
        this._renderFrame(frames[this.frameIndex % frames.length], this.entry?.label, this.entry?.color);
        this.frameIndex++;
        if (this.frameIndex % frames.length === 0) loops++;
        if (loops >= maxLoops) {
          onDone && onDone();
          return;
        }
        this.frameTimer = setTimeout(step, FRAME_DURATION_MS);
      };
      step();
    }

    _renderFrame(src, label, color) {
      this.spriteWrap.innerHTML = "";
      if (!src) {
        this.spriteWrap.appendChild(buildPlaceholder(label, color));
        return;
      }
      const img = document.createElement("img");
      img.className = "bs-sprite";
      img.src = src;
      img.onerror = () => {
        this.spriteWrap.innerHTML = "";
        this.spriteWrap.appendChild(buildPlaceholder(label, color));
      };
      this.spriteWrap.appendChild(img);
    }

    _playFallbackEffect(action) {
      const el = this.spriteWrap;
      el.classList.remove("bs-fx-lunge", "bs-fx-shake", "bs-fx-pulse");
      // ری‌فلو اجباری تا انیمیشن دوباره از اول اجرا بشه حتی اگه پشت‌سرهم صدا زده بشه
      void el.offsetWidth;
      if (action === "attack" || action === "ultimate") el.classList.add("bs-fx-lunge");
      else if (action === "defend") el.classList.add("bs-fx-pulse");
      else if (action === "hit") el.classList.add("bs-fx-shake");
    }

    flashHit() {
      const el = this.spriteWrap;
      el.classList.remove("bs-fx-flash");
      void el.offsetWidth;
      el.classList.add("bs-fx-flash");
    }
  }

  class BattleScene {
    constructor(rootEl) {
      this.root = rootEl;
      this.root.classList.add("bs-root");
      this.root.innerHTML = `
        <div class="bs-hud-row">
          <div class="bs-hud bs-hud-left"></div>
          <div class="bs-hud bs-hud-right"></div>
        </div>
        <div class="bs-stage">
          <div class="bs-fighter bs-fighter-left"></div>
          <div class="bs-fighter bs-fighter-right"></div>
        </div>
      `;
      this.stage = this.root.querySelector(".bs-stage");
      this.hudLeft = this.root.querySelector(".bs-hud-left");
      this.hudRight = this.root.querySelector(".bs-hud-right");
      this.left = new FighterSlot(this.root.querySelector(".bs-fighter-left"), "left");
      this.right = new FighterSlot(this.root.querySelector(".bs-fighter-right"), "right");
    }

    setBackground(bgKey) {
      const url = window.GameAssets.BACKGROUNDS[bgKey];
      if (url) {
        this.root.style.backgroundImage = `url(${url})`;
      }
      this.root.classList.add("bs-bg-fallback"); // رنگ ساده اگه عکس بک‌گراند نبود، از CSS میاد
    }

    slot(side) {
      return side === "left" ? this.left : this.right;
    }

    updateHud(side, { level, hp, hpMax, mana, manaMax, label }) {
      const hudEl = side === "left" ? this.hudLeft : this.hudRight;
      const hpPct = Math.max(0, Math.min(100, (hp / hpMax) * 100));
      const manaMaxDisplay = manaMax ?? 8;
      let manaDots = "";
      for (let i = 0; i < manaMaxDisplay; i++) {
        manaDots += `<span class="bs-mana-dot ${i < mana ? "filled" : ""}"></span>`;
      }
      hudEl.innerHTML = `
        <div class="bs-hud-name">${label ?? ""} <span class="bs-hud-level">Lv.${level ?? "-"}</span></div>
        <div class="bs-hp-bar"><div class="bs-hp-fill" style="width:${hpPct}%"></div></div>
        <div class="bs-hp-text">${Math.max(0, hp)}/${hpMax}</div>
        ${mana !== undefined ? `<div class="bs-mana-row">${manaDots}</div>` : ""}
      `;
    }

    playSound(key) {
      const url = window.GameAssets.SOUND_EFFECTS[key];
      if (!url) return;
      try {
        const audio = new Audio(url);
        audio.volume = 0.6;
        audio.play().catch(() => {}); // اگه فایل نبود یا مرورگر اجازه نداد، بی‌سروصدا رد شو
      } catch {
        // نادیده بگیر - صدا اختیاریه
      }
    }
  }

  window.BattleScene = BattleScene;
})();
