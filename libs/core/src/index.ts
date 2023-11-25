import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  nextTick,
  untrack,
} from "@msig/core";
import { log } from "./utils";
export const None = undefined;
export type None = undefined;
export type Optional<T> = T | None;

export type Token = {
  id: string;
  decimals: bigint;
  logo?: string;
};

export type Disablable<T> = T & {
  disabled?: boolean;
};

export type Direction = "forward" | "backward";

export type CalculationResult<TBreakdown> = [bigint, TBreakdown];

export type CalculateFn<TRates, TBreakdown> = (
  amount: bigint,
  a: Token,
  b: Token,
  dir: Direction,
  rates: TRates,
) => Promise<CalculationResult<TBreakdown>>;

export type RatesFn<TRates> = (a: Token, b: Token) => Promise<TRates>;

export class TokenMap {
  private tokens: Map<string, Token> = new Map();
  constructor(tokens: Token[]) {
    for (const token of tokens) {
      this.add(token);
    }
  }
  get(id: string): Optional<Token> {
    return this.tokens.get(id);
  }
  add(token: Token) {
    this.tokens.set(token.id, token);
  }
  all(): Token[] {
    return [...this.tokens].map(([, t]) => t);
  }
  static from(tokens: Token[]) {
    return new TokenMap(tokens);
  }
}

export type Engine<R, B> = ReturnType<typeof createEngine<R, B>>;

function getDecimals(assets: TokenMap, tokenId?: string): bigint {
  if (!tokenId) return 8n;
  return assets.get(tokenId)?.decimals ?? 8n;
}

export function createEngine<TRates, TBreakdown>(
  assets: TokenMap,
  calculate: CalculateFn<TRates, TBreakdown>,
  getRates: RatesFn<TRates>,
) {
  const [tokenAAmt, setTokenAAmt] = createSignal(0n);
  const [tokenBAmt, setTokenBAmt] = createSignal(0n);
  const [direction, setDirection] = createSignal<"forward" | "backward">(
    "forward",
  );

  const [reactiveA, setReactiveA] = createSignal(tokenAAmt());
  const [reactiveB, setReactiveB] = createSignal(tokenBAmt());

  const [tokenAId, setTokenAId] = createSignal<Optional<string>>(None);
  const [tokenBId, setTokenBId] = createSignal<Optional<string>>(None);

  // make the underlying amount of tokens adjust based on assets of different decimals
  createEffect(() => {
    log("a or b changed");
    const dir = direction();
    const a = tokenAAmt();
    const b = tokenBAmt();
    log({ a, b, dir });
    if (dir === "forward") {
      setReactiveA(a);
    } else {
      setReactiveB(b);
    }
  });

  createEffect(() => {
    log("reactiveA: " + reactiveA());
  });

  createEffect(() => {
    log("reactiveB: " + reactiveB());
  });

  const tokenPair = createMemo(() => {
    const aId = tokenAId();
    const bId = tokenBId();
    log("tokenPair", { aId, bId });
    return aId && bId ? [aId, bId] : None;
  });

  const [rates] = createResource(tokenPair, async (pair) => {
    if (!pair) return None;
    const [aId, bId] = pair;
    const a = assets.get(aId);
    const b = assets.get(bId);
    if (!a || !b) return None;
    return await getRates(a, b);
  });

  const combined = createMemo(() => {
    return {
      tokenPair: tokenPair(),
      rates: rates(),
      tokenAAmt: reactiveA(),
      tokenBAmt: reactiveB(),
      direction: direction(),
    };
  });

  const [calculated] = createResource(combined, async (input) => {
    if (!input || !input.tokenPair || !input.rates) return None;
    const [aId, bId] = input.tokenPair;
    const tokenA = assets.get(aId);
    const tokenB = assets.get(bId);
    if (!tokenA || !tokenB) return None;
    const amount =
      input.direction === "forward" ? input.tokenAAmt : input.tokenBAmt;
    const [result, breakdown] = await calculate(
      amount,
      tokenA,
      tokenB,
      input.direction,
      input.rates,
    );
    return {
      output: result,
      breakdown,
    };
  });

  const breakdown = createMemo(() => {
    const input = calculated();
    if (!input) return None;
    return input.breakdown;
  });

  createEffect(() => {
    const input = calculated();
    const dir = direction();
    if (!input) return None;
    if (dir === "forward") {
      nextTick(() => {
        setTokenBAmt(input.output);
      });
    } else {
      nextTick(() => {
        setTokenAAmt(input.output);
      });
    }
  });

  return {
    direction,
    setDirection,
    setTokenAAmt,
    setTokenAId,
    setTokenBAmt,
    setTokenBId,
    tokenAAmt,
    tokenAId,
    tokenBAmt,
    tokenBId,
    breakdown,
  };
}

export function strToInt(decimals: bigint, amount: string): bigint {
  const dNum = Number(decimals);
  let [integerStr, decimalStr = ""] = amount.split(".");
  decimalStr = decimalStr.slice(0, dNum) ?? "";
  const total = BigInt([integerStr, decimalStr.padEnd(dNum, "0")].join(""));
  return total;
}

export function intToStr(
  decimals: bigint,
  amount: bigint,
  fixed?: bigint,
): string {
  const fixedNum = fixed ? Number(fixed) : None;
  const aStr = amount.toString();
  const dNum = Number(decimals);
  if (dNum === 0) {
    return aStr;
  }
  const decimal = aStr.slice(-dNum);
  const integer = aStr.slice(0, -dNum);
  const paddedDecimal = decimal.padStart(dNum, "0");
  const fixedDecimal =
    fixedNum === None
      ? paddedDecimal
      : fixedNum === -1
      ? paddedDecimal.replace(/0+$/, "")
      : paddedDecimal.slice(0, fixedNum).padEnd(fixedNum, "0");
  return [integer || "0", fixedDecimal].filter(Boolean).join(".");
}
