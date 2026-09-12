import type { FighterState, BodyPart, PlayerAction } from "../../types";
import { ATTACK_DAMAGE, DEFENSE_REFLECT_DAMAGE, MANA_MAX } from "../../config/constants";
import { getUltimateEffect } from "./ultimates";
import { getWeaponDamageBonus } from "./equipment";
import type { EnemyDefinition } from "../forest/enemies";
import type { DungeonEnemyDefinition } from "../dungeon/enemies";
import type { DeathDuelChoice } from "./engine";

export interface CpuState {
  definition: EnemyDefinition | DungeonEnemyDefinition;
  hp: number;
  hpMax: number;
  isVulnerable: boolean; // false فقط برای شبح تا اولین دفاع موفق پلیر
  pendingDelayedDamage: { amountPerRound: number; roundsRemaining: number }[];
}

export interface PveCombatState {
  round: number;
  player: FighterState;
  cpu: CpuState;
  log: string[];
  isDeathDuel: boolean;
}

export function createCpuState(definition: EnemyDefinition | DungeonEnemyDefinition): CpuState {
  const untouchable = (definition as DungeonEnemyDefinition).untouchableUntilFirstPlayerDefense === true;
  return {
    definition,
    hp: definition.hpMax,
    hpMax: definition.hpMax,
    isVulnerable: !untouchable,
    pendingDelayedDamage: [],
  };
}

export type PveOutcome =
  | { status: "ongoing" }
  | { status: "player_won" }
  | { status: "player_lost" }
  | { status: "death_duel_start" };

function clamp(value: number, max: number): number {
  return Math.max(0, Math.min(max, value));
}

function weightedRandomTarget(distribution: Record<BodyPart, number>): BodyPart {
  const roll = Math.random();
  let acc = 0;
  for (const part of ["head", "body", "leg"] as BodyPart[]) {
    acc += distribution[part] ?? 0;
    if (roll <= acc) return part;
  }
  return "body"; // fallback برای خطای گرد کردن
}

// شانس اینکه CPU حمله‌ی پلیر به یک ناحیه‌ی خاص رو دفع کنه
function rollCpuDefends(cpu: CpuState, target: BodyPart): boolean {
  const def = cpu.definition;
  if (def.flatDefenseChance !== undefined) return Math.random() < def.flatDefenseChance;
  const chance = def.defenseByRegion?.[target] ?? 0;
  return Math.random() < chance;
}

function applyDelayedDamageTicks(state: PveCombatState): void {
  // دمیج تاخیریِ روی خود پلیر (مثلا اگه دشمنی زهر میداد - فعلا دشمنای فعلی این اثر رو ندارن ولی برای آینده آماده‌ست)
  const remainingPlayer: typeof state.player.pendingDelayedDamage = [];
  for (const tick of state.player.pendingDelayedDamage) {
    state.player.hp = clamp(state.player.hp - tick.amountPerRound, state.player.hpMax);
    state.log.push(`شما ${tick.amountPerRound} دمیج تاخیری گرفتید.`);
    if (tick.roundsRemaining - 1 > 0) remainingPlayer.push({ ...tick, roundsRemaining: tick.roundsRemaining - 1 });
  }
  state.player.pendingDelayedDamage = remainingPlayer;

  // دمیج تاخیری روی CPU (مثلا از آلتیمیت الف/ویچر پلیر)
  const remainingCpu: typeof state.cpu.pendingDelayedDamage = [];
  for (const tick of state.cpu.pendingDelayedDamage) {
    state.cpu.hp = clamp(state.cpu.hp - tick.amountPerRound, state.cpu.hpMax);
    state.log.push(`دشمن ${tick.amountPerRound} دمیج تاخیری گرفت.`);
    if (tick.roundsRemaining - 1 > 0) remainingCpu.push({ ...tick, roundsRemaining: tick.roundsRemaining - 1 });
  }
  state.cpu.pendingDelayedDamage = remainingCpu;
}

function checkOutcome(state: PveCombatState): PveOutcome {
  const cpuDead = state.cpu.hp <= 0;
  const playerDead = state.player.hp <= 0;

  if (cpuDead && playerDead) {
    return state.isDeathDuel ? { status: "ongoing" } : { status: "death_duel_start" };
  }
  if (cpuDead) return { status: "player_won" };
  if (playerDead) return { status: "player_lost" };
  return { status: "ongoing" };
}

// اکشن اصلی: پلیر action میفرسته (پوشن مجاز نیست)، CPU همیشه خودکار حمله میکنه
export function resolvePveRound(
  state: PveCombatState,
  playerAction: { action: PlayerAction; target?: BodyPart }
): PveOutcome {
  if (state.isDeathDuel) {
    throw new Error("در حالت دوئل مرگ، از resolvePveDeathDuelChoice استفاده کن");
  }

  // ۱) دمیج‌های تاخیری راند قبل
  applyDelayedDamageTicks(state);
  let outcome = checkOutcome(state);
  if (outcome.status !== "ongoing") return outcome;

  // ۲) این راند CPU چه ناحیه‌ای رو هدف میگیره
  const cpuTarget = weightedRandomTarget(state.cpu.definition.attackDistribution);

  if (playerAction.action === "defense" && playerAction.target) {
    if (playerAction.target === cpuTarget) {
      // دفاع درست: دمیج به دشمن برمیگرده، پلیر این راند آسیب نمیبینه
      state.cpu.hp = clamp(state.cpu.hp - DEFENSE_REFLECT_DAMAGE, state.cpu.hpMax);
      state.log.push(`شما حمله‌ی دشمن به ${cpuTarget} را دفاع کردید؛ ${DEFENSE_REFLECT_DAMAGE} دمیج به او برگشت.`);

      // اگه شبح بود و هنوز غیرقابل‌ضربه بود، از این لحظه قابل مبارزه میشه
      if (!state.cpu.isVulnerable) {
        state.cpu.isVulnerable = true;
        state.log.push("دفاع موفق باعث شد جسم دشمن پدیدار شود؛ از این به بعد قابل ضربه زدن است.");
      }
    } else {
      const dmg = ATTACK_DAMAGE[cpuTarget];
      state.player.hp = clamp(state.player.hp - dmg, state.player.hpMax);
      state.log.push(`دفاع شما اشتباه بود؛ دشمن به ${cpuTarget} شما ${dmg} دمیج زد.`);
    }
  } else if (playerAction.action === "attack" && playerAction.target) {
    if (!state.cpu.isVulnerable) {
      state.log.push("این دشمن هنوز قابل ضربه زدن نیست.");
    } else if (rollCpuDefends(state.cpu, playerAction.target)) {
      const reflected = DEFENSE_REFLECT_DAMAGE;
      state.player.hp = clamp(state.player.hp - reflected, state.player.hpMax);
      state.log.push(`دشمن حمله‌ی شما به ${playerAction.target} را دفع کرد؛ ${reflected} دمیج به شما برگشت.`);
    } else {
      const dmg = ATTACK_DAMAGE[playerAction.target] + getWeaponDamageBonus(state.player.weaponKey);
      state.cpu.hp = clamp(state.cpu.hp - dmg, state.cpu.hpMax);
      state.log.push(`شما به ${playerAction.target} دشمن ضربه زدید و ${dmg} دمیج وارد کردید.`);
    }

    // چون پلیر حمله کرد نه دفاع، ضربه‌ی این راند دشمن هم به‌طور کامل روی پلیر میشینه
    const dmgToPlayer = ATTACK_DAMAGE[cpuTarget];
    state.player.hp = clamp(state.player.hp - dmgToPlayer, state.player.hpMax);
    state.log.push(`دشمن هم‌زمان به ${cpuTarget} شما ${dmgToPlayer} دمیج زد.`);
  } else if (playerAction.action === "ultimate") {
    if (!state.cpu.isVulnerable) {
      state.log.push("آلتیمیت شما روی این دشمن اثر نکرد (هنوز قابل ضربه زدن نیست).");
    } else {
      const effect = getUltimateEffect(state.player.race);
      const dmg = effect.damageToDefender + getWeaponDamageBonus(state.player.weaponKey);
      state.cpu.hp = clamp(state.cpu.hp - dmg, state.cpu.hpMax);
      if (effect.healAttacker > 0) state.player.hp = clamp(state.player.hp + effect.healAttacker, state.player.hpMax);
      if (effect.delayedDamageToDefender) state.cpu.pendingDelayedDamage.push({ ...effect.delayedDamageToDefender });
      state.log.push(`آلتیمیت شما ${dmg} دمیج به دشمن زد.`);
    }

    state.player.ultimateUsesLeft -= 1;
    state.player.hasUsedUltimateOnce = true;
    state.player.mana = 0;

    const dmgToPlayer = ATTACK_DAMAGE[cpuTarget];
    state.player.hp = clamp(state.player.hp - dmgToPlayer, state.player.hpMax);
    state.log.push(`دشمن هم‌زمان به ${cpuTarget} شما ${dmgToPlayer} دمیج زد.`);
  }

  // ۳) ریجن مانا (طبق همون قانون PvP: قبل اولین آلتیمیت ۲تا، بعدش ۱تا، بعد دومین بار صفر)
  if (state.player.ultimateUsesLeft <= 0) {
    // صفر - مانا دیگه اضافه نمیشه
  } else if (state.player.hasUsedUltimateOnce) {
    state.player.mana = Math.min(MANA_MAX, state.player.mana + 1);
  } else {
    state.player.mana = Math.min(MANA_MAX, state.player.mana + 2);
  }

  state.round += 1;
  const finalOutcome = checkOutcome(state);
  if (finalOutcome.status === "death_duel_start") {
    state.isDeathDuel = true;
    state.log.push("شما و دشمن هم‌زمان صفر شدید! نبرد وارد دوئل مرگ می‌شود.");
  }
  return finalOutcome;
}

// ---------- دوئل مرگ در برابر CPU - سنگ (مشت) کاغذ (دفاع) قیچی (جادو)، CPU تصادفی انتخاب میکنه ----------
const DEATH_DUEL_BEATS: Record<DeathDuelChoice, DeathDuelChoice> = {
  punch: "magic",
  magic: "defense",
  defense: "punch",
};

export type PveDeathDuelResult = { winner: "player" | "cpu" | null; cpuChoice: DeathDuelChoice };

export function resolvePveDeathDuelChoice(state: PveCombatState, playerChoice: DeathDuelChoice): PveDeathDuelResult {
  if (!state.isDeathDuel) throw new Error("در حالت دوئل مرگ نیستیم");

  const choices: DeathDuelChoice[] = ["punch", "defense", "magic"];
  const cpuChoice = choices[Math.floor(Math.random() * choices.length)];

  if (playerChoice === cpuChoice) {
    state.log.push("دوئل مرگ مساوی شد؛ دوباره انتخاب کنید.");
    return { winner: null, cpuChoice };
  }

  const winner: "player" | "cpu" = DEATH_DUEL_BEATS[playerChoice] === cpuChoice ? "player" : "cpu";
  state.log.push(winner === "player" ? "شما دوئل مرگ را بردید!" : "دشمن دوئل مرگ را برد.");
  return { winner, cpuChoice };
}
