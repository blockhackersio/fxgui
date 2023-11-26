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
  const [tokenAInput, setTokenAInputVal] = createSignal("0");
  const [tokenBInput, setTokenBInputVal] = createSignal("0");
  const [direction, setDirection] = createSignal<"forward" | "backward">(
    "forward",
  );

  const [tokenAId, setTokenAId] = createSignal<Optional<string>>(None);
  const [tokenBId, setTokenBId] = createSignal<Optional<string>>(None);

  // get the tokenDecimals
  const tokenADecimals = createMemo(() => {
    const id = tokenAId();
    return getDecimals(assets, id);
  });

  const tokenBDecimals = createMemo(() => {
    const id = tokenBId();
    return getDecimals(assets, id);
  });

  const tokenAAmt = createMemo((last) => {
    const dir = direction();
    const input = tokenAInput();
    const decimals = tokenADecimals();
    if (dir === "forward") return strToInt(decimals, input);
    else return last;
  }, 0n);

  const tokenBAmt = createMemo((last) => {
    const dir = direction();
    const input = tokenBInput();
    const decimals = tokenBDecimals();
    if (dir === "backward") return strToInt(decimals, input);
    else return last;
  }, 0n);

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
      tokenAAmt: tokenAAmt(),
      tokenBAmt: tokenBAmt(),
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
    const tokenADec = tokenADecimals();
    const tokenBDec = tokenBDecimals();
    if (!input) return None;
    if (dir === "forward") {
      nextTick(() => {
        setTokenBInputVal(intToStr(tokenBDec, input.output, -1n));
      });
    } else {
      nextTick(() => {
        setTokenAInputVal(intToStr(tokenADec, input.output, -1n));
      });
    }
  });

  createEffect(() => {
    log(`
  tokenADecimals:${tokenADecimals()}
  tokenBDecimals:${tokenBDecimals()}
  tokenAId:${tokenAId()}
  tokenBId:${tokenBId()}
  tokenAAmt:${tokenAAmt()}
  tokenBAmt:${tokenBAmt()}
  tokenAInput:${tokenAInput()}
  tokenBInput:${tokenBInput()}
  tokenADecimals:${tokenADecimals()}
`);
  });

  function setTokenAFocus() {
    console.log("setTokenAFocus");
    setDirection("forward");
  }
  function setTokenBFocus() {
    console.log("setTokenBFocus");
    setDirection("backward");
  }
  function setTokenAInput(value: string) {
    log({ setTokenAInput: value });
    setTokenAInputVal(value);
  }
  function setTokenBInput(value: string) {
    setTokenBInputVal(value);
  }
  return {
    setTokenAId,
    setTokenBId,
    setTokenAInput,
    setTokenBInput,
    setTokenAFocus,
    setTokenBFocus,
    tokenAInput,
    tokenBInput,
    tokenAId,
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
