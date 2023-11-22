// import { sum } from "./index.js";
import { test, expect, vi } from "vitest";
import { Precision as Num } from "@fxgui/precision";
// import { Store } from "@tanstack/store";
import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
} from "@msig/core";
import { Err, Ok, Result } from "ts-results";
const None = undefined;
type None = undefined;
type Optional<T> = T | None;

type Token = {
  id: string;
  decimals: bigint;
  logo?: string;
};

type Disablable<T> = T & {
  disabled?: boolean;
};

type Direction = "forward" | "backward";

type CalculationResult<TBreakdown> = [bigint, TBreakdown];

type CalculateFn<TRates, TBreakdown> = (
  amount: bigint,
  a: Token,
  b: Token,
  dir: Direction,
  rates: TRates,
) => Promise<CalculationResult<TBreakdown>>;

type RatesFn<TRates> = (a: Token, b: Token) => Promise<TRates>;

class TokenMap {
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

// class Engine<TRates extends object, TBreakdown extends object> {
// public tokenAAmt: Store<bigint> = new Store(0n, {
//   onUpdate: async () => {
//     const amount = this.tokenAAmt.state;
//     if (this.tokenAId.state === "") return;
//     const result = await this.runCalculate("forward", amount);
//
//     if (result.ok) {
//       const [amount, breakdown] = result.val;
//       console.log({ amount, breakdown });
//       this.breakdown.setState(() => breakdown);
//       this.tokenBAmt.setState(() => amount);
//     }
//   },
// });
// public tokenBAmt = new Store(0n);
// public tokenAId = new Store("");
// public tokenBId = new Store("");
// public tokenAList = new Store<Token[]>([]);
// public tokenBList = new Store<Token[]>([]);
// public rates: Store<TRates | null> = new Store(null as TRates | null);
// public breakdown: Store<TBreakdown | null> = new Store(
//   null as TBreakdown | null,
// );

//   constructor(
//     private assets: TokenMap,
//     private calculate: CalculateFn<TRates, TBreakdown>,
//     private fetchRates?: RatesFn<TRates>,
//   ) {
//     const tokens = assets.all();
//     this.tokenAList.setState(() => tokens);
//     this.tokenBList.setState(() => tokens);
//   }
//
//   async runCalculate(
//     dir: Direction,
//     amount: bigint,
//   ): AsyncResult<[bigint, TBreakdown], "calculate_error"> {
//     const tokenA = this.assets
//       .get(this.tokenAId.state)
//       .expect("calculate_error");
//     const tokenB = this.assets
//       .get(this.tokenBId.state)
//       .expect("calculate_error");
//     return this.calculate(
//       amount,
//       tokenA,
//       tokenB,
//       dir,
//       this.rates.state || ({} as TRates),
//     );
//   }
// }

// class Engine<TRates, TBreakdown> {
//   setTokenAAmt: (v: bigint) => bigint;
//   tokenAAmt: () => bigint;
//   constructor(
//     private assets: TokenMap,
//     private calculate: CalculateFn<TRates, TBreakdown>,
//   ) {
//     [this.tokenAAmt, this.setTokenAAmt] = createSignal(0n);
//   }
//
//   init() {}
//
//   static create() {}
// }

// Test Utils
const Tokens: Token[] = [
  { id: "BTC", decimals: 8n },
  { id: "ETH", decimals: 8n },
  { id: "USD", decimals: 8n },
];
type TokenPair = [string, string];

function createEngine<TRates, TBreakdown>(
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
      setTokenBAmt(input.output);
    } else {
      setTokenAAmt(input.output);
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

const assets = new TokenMap(Tokens);

test("TokenMap", () => {
  const bad = assets.get("foo");
  expect(bad.err).toBe(true);
  expect(bad.ok).toBe(false);

  const good = assets.get("BTC");
  expect(good.err).toBe(false);
  expect(good.val).toEqual({ decimals: 8n, id: "BTC" });
});

type Pool = [string, bigint, bigint];
type IntTuple = [bigint, bigint];

async function calculateFn(
  amount: bigint,
  a: Token,
  b: Token,
  dir: Direction,
  rates: Pool,
): Promise<[bigint, object]> {
  const [tokenA, tokenB] = sortTokens(a, b);
  const [, aAmount, bAmount] = rates;

  const output = Num.from(amount, tokenA.decimals).mul(
    Num.from(aAmount).div(Num.from(bAmount)),
  );
  return [output.unscale(tokenB.decimals), {}];
}

function sortTokens(a: Token, b: Token) {
  if (a.id > b.id) {
    return [b, a];
  }
  return [a, b];
}

function makeEngine() {
  const calculate = vi.fn(calculateFn);

  const pools: Record<string, IntTuple> = {
    BTC_USD: [1n * 1_000_000n, 30_000n * 1_000_000n],
    ETH_USD: [1n * 1_000_000n, 2_000n * 1_000_000n],
    BTC_ETH: [1n * 1_000_000n, 15n * 1_000_000n],
  };

  const getRates = vi.fn(async (a: Token, b: Token): Promise<Pool> => {
    const poolId = [a.id, b.id].sort().join("_");
    return [poolId, ...pools[poolId]];
  });

  const engine = createEngine(assets, calculate, getRates);
  return engine;
}

function fakeToken(exponent: bigint): Token {
  return { decimals: exponent } as any as Token;
}

test("calculateFn", async () => {
  const mult = 1_000_000n;
  expect(
    await calculateFn(100n, fakeToken(8n), fakeToken(8n), "forward", [
      "BTC_USD",
      30_000n * mult,
      1n * mult,
    ]),
  ).toEqual([3000000n, {}]);
});

test("swap from ETH to BTC", () => {
  const engine = makeEngine();
  // engine.
});

// function makeEngine<TRates extends object, TBreakdown extends object>({
//   // Pass through 1:1
//   calculate = async (amount: bigint) => Ok([amount, {} as TBreakdown]),
//   rates = async () => Ok({} as TRates),
// }: {
//   calculate?: CalculateFn<TRates, TBreakdown>;
//   rates?: RatesFn<TRates>;
// } = {}) {
//   const cFn = vi.fn(calculate);
//   const rFn = vi.fn(rates);
//   // return new Engine(TokenMap.from(Tokens), cFn, rFn);
// }

// function value<T>(s: Store<T>): Promise<T> {
//   return new Promise((res, rej) => {
//     const t = setTimeout(() => {
//       rej("Store timed out");
//     }, 1000);
//     s.subscribe(() => {
//       clearTimeout(t);
//       res(s.state);
//     });
//   });
// }

// test("Engine is instance of Engine", () => {
//   expect(makeEngine()).toBeInstanceOf(Engine);
// });
//
// test("Engine has sensible defaults", () => {
//   const e = makeEngine();
//   expect(e.tokenAAmt.state).toBe(0n);
//   expect(e.tokenBAmt.state).toBe(0n);
//   expect(e.tokenAId.state).toBe("");
//   expect(e.tokenBId.state).toBe("");
//   expect(e.tokenAList.state).toEqual(Tokens);
//   expect(e.tokenBList.state).toEqual(Tokens);
// });

// test("Setting tokenAAmt and a tokenAId and a tokenBId results in tokenBAmt changing according to the calculator", async () => {
//   const e = makeEngine();
//   e.tokenBId.setState(() => "USD");
//   e.tokenAId.setState(() => "BTC");
//   e.tokenAAmt.setState(() => 1000n);
//   expect(await value(e.tokenBAmt)).toBe(1000n);
// });
