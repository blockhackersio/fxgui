import { Precision as Num } from "@fxgui/precision";
import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  nextTick,
} from "@msig/core";
import { Err, Ok, Result } from "ts-results";
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
  get(id: string): Result<Token, "unknown_token"> {
    const found = this.tokens.get(id);
    if (!found) return Err("unknown_token");
    return Ok(found);
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
    const dir = direction();
    const a = tokenAAmt();
    const b = tokenBAmt();
    if (dir === "forward") {
      setReactiveA(a);
    } else {
      setReactiveB(b);
    }
  });

  const [tokenAId, setTokenAId] = createSignal<Optional<string>>(None);
  const [tokenBId, setTokenBId] = createSignal<Optional<string>>(None);

  const tokenPair = createMemo(() => {
    const aId = tokenAId();
    const bId = tokenBId();
    return aId && bId ? [aId, bId] : None;
  });

  const [rates] = createResource(tokenPair, async (pair) => {
    if (!pair) return None;
    const [aId, bId] = pair;
    const a = assets.get(aId);
    const b = assets.get(bId);
    if (!a.ok || !b.ok) return None;
    return await getRates(a.val, b.val);
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
    if (tokenA.err || tokenB.err) return None;
    const amount =
      input.direction === "forward" ? input.tokenAAmt : input.tokenBAmt;
    const [result, breakdown] = await calculate(
      amount,
      tokenA.val,
      tokenB.val,
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
