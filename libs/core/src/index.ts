import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  nextTick,
} from "@msig/core";
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

export type Engine = ReturnType<typeof createEngine>;

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

  createEffect(() => {
    console.log("a or b changed");
    const dir = direction();
    const a = tokenAAmt();
    const b = tokenBAmt();
    console.log({ a, b, dir });
    if (dir === "forward") {
      setReactiveA(a);
    } else {
      setReactiveB(b);
    }
  });

  createEffect(() => {
    console.log("reactiveA: " + reactiveA());
  });

  createEffect(() => {
    console.log("reactiveB: " + reactiveB());
  });
  const [tokenAId, setTokenAId] = createSignal<Optional<string>>(None);
  const [tokenBId, setTokenBId] = createSignal<Optional<string>>(None);

  const tokenPair = createMemo(() => {
    const aId = tokenAId();
    const bId = tokenBId();
    console.log("tokenPair", { aId, bId });
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

export function assetAmtStrToInt(decimals: bigint, amount: string): bigint {
  const dNum = Number(decimals);
  let [integerStr, decimalStr = ""] = amount.split(".");
  decimalStr = decimalStr.slice(0, dNum) ?? "";
  const total = BigInt([integerStr, decimalStr.padEnd(dNum, "0")].join(""));
  return total;
}

export function intToAssetAmtStr(decimals: bigint, amount: bigint): string {
  const aStr = amount.toString();
  const dNum = Number(decimals);
  if (dNum === 0) {
    return aStr;
  }
  const decimal = aStr.slice(-dNum);
  const integer = aStr.slice(0, -dNum);
  return [integer || "0", decimal].filter(Boolean).join(".");
}
