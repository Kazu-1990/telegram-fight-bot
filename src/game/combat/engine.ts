import type { CombatState, FighterState, BodyPart, PlayerAction, PotionKey } from "../../types";
import type { Race } from "../../config/constants";
import {
  HP_MAX_BASE,
  MANA_MAX,
  MANA_REGEN_PER_ROUND,
  MANA_PER_ROUND_AFTER_FIRST_ULTIMATE,
  ATTACK_DAMAGE,
  DEFENSE_REFLECT_DAMAGE,
  MAX_POTION_USES_PER_MATCH,
  MAX_ULTIMATE_USES_PER_MATCH,
  ULTIMATES,
  POTIONS,
} from "../../config/constants";
import { getUltimateEffect } from "./ultimates";
import { getArmorDamageReduction, getWeaponDamageBonus } from "./equipment";

// =========================================================
// ساخت وضعیت اولیه
// =========================================================

export function createFighterState(
  id: number | "cpu",
  race: Race,
  opts?: { hpMax?: number; armorKey?: string | null; weaponKey?: string | null }
): FighterState {
  return {
    id,
    race,
    hp: opts?.hpMax ?? HP_MAX_BASE,
    mana: 0,
    hpMax: opts?.hpMax ?? HP_MAX_BASE,
    armorKey: opts?.armorKey ?? null,
    weaponKey: opts?.weaponKey ?? null,
    potionUsesLeft: MAX_POTION_USES_PER_MATCH,
    ultimateUsesLeft: MAX_ULTIMATE_USES_PER_MATCH,
    hasUsedUltimateOnce: false,
    pendingDelayedDamage: [],
    negateNextBodyHit: false,
    pendingAction: null,
  };
}

export function createCombatState(f0: FighterState, f1: FighterState): CombatState {
  return {
    round: 1,
    fighters: [f0, f1],
    isDeathDuel: false,
    deathDuelChoices: [null, null],
    log: [],
  };
}

// =========================================================
// پوشن (اثر فوری، نوبت رو تموم نمیکنه)
// =========================================================

export function usePotion(state: CombatState, fighterIndex: 0 | 1, potionKey: PotionKey): void {
  const fighter = state.fighters[fighterIndex];
  if (fighter.potionUsesLeft <= 0) {
    throw new Error("سقف استفاده از پوشن در این بازی تکمیل شده (حداکثر ۲ بار)");
  }

  const def: any = POTIONS[potionKey];
  if ("hpBonus" in def) {
    fighter.hp = Math.min(fighter.hpMax, fighter.hp + def.hpBonus);
  } else if ("manaBonus" in def) {
    fighter.mana = Math.min(MANA_MAX, fighter.mana + def.manaBonus);
  } else if ("effect" in def && def.effect === "negate_next_body_hit") {
    fighter.negateNextBodyHit = true;
  }

  fighter.potionUsesLeft -= 1;
  state.log.push(`مبارز ${fighter.id} از پوشن ${potionKey} استفاده کرد.`);
}

// =========================================================
// ثبت اکشن اصلی راند (حمله/دفاع/آلتیمیت)
// =========================================================

export function canUseUltimate(fighter: FighterState): boolean {
  return fighter.ultimateUsesLeft > 0 && fighter.mana >= MANA_MAX;
}

export function submitAction(
  state: CombatState,
  fighterIndex: 0 | 1,
  action: PlayerAction,
  target?: BodyPart
): void {
  const fighter = state.fighters[fighterIndex];

  if (action === "attack" || action === "defense") {
    if (!target) throw new Error("برای حمله/دفاع باید یک ناحیه (سر/بدن/پا) انتخاب شود");
    fighter.pendingAction = { action, target };
    return;
  }

  if (action === "ultimate") {
    if (!canUseUltimate(fighter)) {
      throw new Error("مانا کافی نیست یا سقف استفاده از آلتیمیت تکمیل شده");
    }
    fighter.pendingAction = { action: "ultimate" };
    return;
  }

  throw new Error("اکشن نامعتبر - پوشن باید با usePotion جدا فرستاده شود");
}

export function bothFightersReady(state: CombatState): boolean {
  return state.fighters[0].pendingAction !== null && state.fighters[1].pendingAction !== null;
}

// =========================================================
// نتیجه‌ی راند / بازی
// =========================================================

export type RoundOutcome =
  | { status: "ongoing" }
  | { status: "winner"; winnerIndex: 0 | 1 }
  | { status: "death_duel_start" };

function clampHp(fighter: FighterState): void {
  if (fighter.hp < 0) fighter.hp = 0;
  if (fighter.hp > fighter.hpMax) fighter.hp = fighter.hpMax;
}

function applyDamage(target: FighterState, rawDamage: number, region: BodyPart | null): number {
  // بادیگارد: هر ضربه‌ی مستقیم به بدن رو یک بار خنثی میکنه
  if (region === "body" && target.negateNextBodyHit) {
    target.negateNextBodyHit = false;
    return 0;
  }
  const reduction = getArmorDamageReduction(target.armorKey);
  const finalDamage = Math.max(0, Math.round(rawDamage * (1 - reduction)));
  target.hp -= finalDamage;
  clampHp(target);
  return finalDamage;
}

function applyDelayedDamageTicks(state: CombatState): void {
  for (const fighter of state.fighters) {
    if (fighter.pendingDelayedDamage.length === 0) continue;
    const remaining: typeof fighter.pendingDelayedDamage = [];
    for (const tick of fighter.pendingDelayedDamage) {
      applyDamage(fighter, tick.amountPerRound, null);
      state.log.push(`مبارز ${fighter.id} ${tick.amountPerRound} دمیج تاخیری گرفت.`);
      if (tick.roundsRemaining - 1 > 0) {
        remaining.push({ amountPerRound: tick.amountPerRound, roundsRemaining: tick.roundsRemaining - 1 });
      }
    }
    fighter.pendingDelayedDamage = remaining;
  }
}

function regenMana(fighter: FighterState): void {
  let amount: number;
  if (fighter.ultimateUsesLeft <= 0) {
    amount = 0; // بعد از دومین استفاده، دیگه مانا نمیگیره
  } else if (fighter.hasUsedUltimateOnce) {
    amount = MANA_PER_ROUND_AFTER_FIRST_ULTIMATE; // بعد از اولین استفاده: ۱ مانا در راند
  } else {
    amount = MANA_REGEN_PER_ROUND; // قبل از اولین استفاده: ۲ مانا در راند
  }
  fighter.mana = Math.min(MANA_MAX, fighter.mana + amount);
}

function weaponBonusFor(fighter: FighterState): number {
  return getWeaponDamageBonus(fighter.weaponKey);
}

// اجرای اثر یک اکشن attack/ultimate از "actor" روی "other"
function resolveOffensiveAction(state: CombatState, actor: FighterState, other: FighterState): void {
  const act = actor.pendingAction;
  if (!act) return;

  if (act.action === "attack" && act.target) {
    const otherDefends = other.pendingAction?.action === "defense" && other.pendingAction.target === act.target;
    if (otherDefends) {
      // دفاع درست: دمیج به حمله‌کننده برمیگرده
      const dmg = applyDamage(actor, DEFENSE_REFLECT_DAMAGE, null);
      state.log.push(`مبارز ${other.id} حمله به ${act.target} را دفاع کرد؛ ${dmg} دمیج به مبارز ${actor.id} برگشت.`);
    } else {
      const base = ATTACK_DAMAGE[act.target] + weaponBonusFor(actor);
      const dmg = applyDamage(other, base, act.target);
      state.log.push(`مبارز ${actor.id} به ${act.target} حریف ضربه زد و ${dmg} دمیج وارد کرد.`);
    }
    return;
  }

  if (act.action === "ultimate") {
    const neutralizedBy = ULTIMATES[actor.race].neutralizedBy;
    const otherNeutralizes = other.pendingAction?.action === "defense" && other.pendingAction.target === neutralizedBy;

    if (otherNeutralizes) {
      state.log.push(`مبارز ${other.id} آلتیمیت مبارز ${actor.id} را خنثی کرد.`);
      return;
    }

    const effect = getUltimateEffect(actor.race);
    const dmg = applyDamage(other, effect.damageToDefender + weaponBonusFor(actor), null);
    if (effect.healAttacker > 0) {
      actor.hp = Math.min(actor.hpMax, actor.hp + effect.healAttacker);
    }
    if (effect.delayedDamageToDefender) {
      other.pendingDelayedDamage.push({ ...effect.delayedDamageToDefender });
    }
    state.log.push(`مبارز ${actor.id} آلتیمیت خود را زد و ${dmg} دمیج وارد کرد.`);
    return;
  }
}

function finalizeUltimateUsage(fighter: FighterState): void {
  if (fighter.pendingAction?.action === "ultimate") {
    fighter.ultimateUsesLeft -= 1;
    fighter.hasUsedUltimateOnce = true;
    fighter.mana = 0; // بعد از استفاده، نوار مانا خالی میشه تا دوباره پر شود
  }
}

function checkMatchEnd(state: CombatState): RoundOutcome {
  const [f0, f1] = state.fighters;
  const f0Dead = f0.hp <= 0;
  const f1Dead = f1.hp <= 0;

  if (f0Dead && f1Dead) {
    return state.isDeathDuel ? { status: "ongoing" } : { status: "death_duel_start" };
  }
  if (f0Dead) return { status: "winner", winnerIndex: 1 };
  if (f1Dead) return { status: "winner", winnerIndex: 0 };
  return { status: "ongoing" };
}

// =========================================================
// حل کردن یک راند کامل - وقتی هر دو مبارز pendingAction دارن صدا زده میشه
// =========================================================

export function resolveRound(state: CombatState): RoundOutcome {
  if (!bothFightersReady(state)) {
    throw new Error("هنوز هر دو مبارز اکشن خودشون رو ثبت نکردن");
  }

  const [f0, f1] = state.fighters;

  // ۱) اثرات تاخیری راندهای قبل (زهر/آتش) رو اول اعمال کن
  applyDelayedDamageTicks(state);
  let outcome = checkMatchEnd(state);
  if (outcome.status !== "ongoing") {
    clearPendingActions(state);
    return outcome;
  }

  // ۲) اکشن‌های این راند رو حل کن (هر دو سمت مستقل بررسی میشه)
  resolveOffensiveAction(state, f0, f1);
  resolveOffensiveAction(state, f1, f0);

  // ۳) مصرف مانا/سقف آلتیمیت رو نهایی کن
  finalizeUltimateUsage(f0);
  finalizeUltimateUsage(f1);

  // ۴) ریجن مانا برای راند بعد
  regenMana(f0);
  regenMana(f1);

  outcome = checkMatchEnd(state);

  clearPendingActions(state);
  state.round += 1;

  if (outcome.status === "death_duel_start") {
    state.isDeathDuel = true;
    state.deathDuelChoices = [null, null];
    state.log.push("هر دو مبارز هم‌زمان صفر شدند! بازی وارد دوئل مرگ می‌شود.");
  }

  return outcome;
}

function clearPendingActions(state: CombatState): void {
  state.fighters[0].pendingAction = null;
  state.fighters[1].pendingAction = null;
}

// =========================================================
// دوئل مرگ - سنگ (مشت) کاغذ (دفاع) قیچی (جادو)
// مشت > جادو، جادو > دفاع، دفاع > مشت
// =========================================================

export type DeathDuelChoice = "punch" | "defense" | "magic";

export function submitDeathDuelChoice(state: CombatState, fighterIndex: 0 | 1, choice: DeathDuelChoice): void {
  if (!state.isDeathDuel) throw new Error("بازی در حالت دوئل مرگ نیست");
  state.deathDuelChoices[fighterIndex] = choice;
}

// null یعنی هنوز نتیجه معلوم نشده (یا تای شده و باید دوباره انتخاب کنن)
export function resolveDeathDuel(state: CombatState): 0 | 1 | null {
  const [c0, c1] = state.deathDuelChoices;
  if (!c0 || !c1) return null;

  state.deathDuelChoices = [null, null];

  if (c0 === c1) {
    state.log.push("دوئل مرگ مساوی شد؛ دوباره انتخاب کنید.");
    return null;
  }

  const beats: Record<DeathDuelChoice, DeathDuelChoice> = {
    punch: "magic",
    magic: "defense",
    defense: "punch",
  };

  const winnerIndex: 0 | 1 = beats[c0] === c1 ? 0 : 1;
  state.log.push(`مبارز ${state.fighters[winnerIndex].id} دوئل مرگ را برد!`);
  return winnerIndex;
}
