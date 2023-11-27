import { expect, vi } from "vitest";
import { Token, Direction, None, createFxGui, TokenMap } from "../index";
import { Precision as Num } from "@fxgui/precision";
import { nextTick } from "@msig/core";

type Pool = { ticker: string; pair: Record<string, bigint> };
type IntTuple = [bigint, bigint];

function calculateForwards(input: Num, pa: Num, pb: Num, fPerc: Num) {
  const preFee = input.mul(pb.div(pa));
  const fee = preFee.mul(fPerc);
  const total = preFee.add(fee);
  return {
    fee,
    total,
    preFee,
  };
}

function calculateBackwards(total: Num, pa: Num, pb: Num, fPerc: Num) {
  const preFee = total.div(fPerc.add(Num.from(1n)));
  const fee = total.sub(preFee);
  const input = preFee.div(pb.div(pa));
  return {
    preFee,
    fee,
    input,
  };
}
type Breakdown = {
  feePerc: bigint;
  feeAmt: bigint;
};
export async function calculateFn(
  amount: bigint,
  a: Token,
  b: Token,
  dir: Direction,
  rates: Pool,
): Promise<[bigint, Breakdown]> {
  // log("calculateFn");
  const { pair } = rates;
  const aAmount = pair[a.id];
  const bAmount = pair[b.id];
  const feePercInt = 50n;
  if (aAmount === None || bAmount === None)
    throw new Error("invalid token for pool" + a.id);

  if (dir === "forward") {
    const pa = Num.from(aAmount, a.decimals);
    const pb = Num.from(bAmount, b.decimals);

    // Do calculations
    const input = Num.from(amount, a.decimals);
    const { fee, total } = calculateForwards(
      input,
      pa,
      pb,
      Num.from(feePercInt).div(Num.from(10000n)),
    );

    // calculate fee
    // Convert to bigint
    const totalInt = total.unscale(b.decimals);
    const feeAmtInt = fee.unscale(b.decimals);
    const breakdown = {
      feePerc: feePercInt,
      feeAmt: feeAmtInt,
    };
    return [totalInt, breakdown];
  } else {
    const pa = Num.from(aAmount, a.decimals);
    const pb = Num.from(bAmount, b.decimals);
    const total = Num.from(amount, b.decimals);
    const { fee, input } = calculateBackwards(
      total,
      pa,
      pb,
      Num.from(feePercInt).div(Num.from(10000n)),
    );
    const inputInt = input.unscale(a.decimals);
    const feeAmtInt = fee.unscale(b.decimals);

    const breakdown = {
      feePerc: feePercInt,
      feeAmt: feeAmtInt,
    };
    return [inputInt, breakdown];
  }
}

export function makeAssets() {
  // Test Utils
  const Tokens: Token[] = [
    { id: "BTC", decimals: 8n },
    { id: "ETH", decimals: 18n },
    { id: "USD", decimals: 2n },
  ];

  const assets = new TokenMap(Tokens);
  return assets;
}
export function makePools() {
  const pools: Record<string, IntTuple> = {
    BTC_USD: [1n * 1_00000000n, 30000_00n],
    ETH_USD: [1n * 1_000000000000000000n, 2000_00n],
    BTC_ETH: [1n * 1_00000000n, 15_000000000000000000n],
  };
  return pools;
}
const pools = makePools();
async function ratesFn(a: Token, b: Token): Promise<Pool> {
  const poolId = [a.id, b.id].sort().join("_");
  const [aId, bId] = poolId.split("_");
  const pair = {
    [aId]: pools[poolId][0],
    [bId]: pools[poolId][1],
  };
  return {
    ticker: poolId,
    pair,
  };
}

export function makeFxGui(assets: TokenMap) {
  const calculate = vi.fn(calculateFn);
  const rates = vi.fn(ratesFn);
  const engine = createFxGui(assets, calculate, rates);
  return { engine, calculate, rates };
}

type CheckerFn<T> = (v: T) => boolean;

export function isCheckerFn<T>(v: T | CheckerFn<T>): v is CheckerFn<T> {
  return typeof v === "function";
}

export async function eventually<T>(
  fn: () => T,
  checker: T | CheckerFn<T>,
): Promise<T> {
  return new Promise((res, rej) => {
    async function getEventually() {
      let val = fn();
      const checkerFn = isCheckerFn(checker) ? checker : (c: T) => c == checker;
      while (!checkerFn(val)) {
        await nextTick();
        val = await fn();
      }
      return val;
    }

    const tid = setTimeout(() => {
      rej("Timeout:" + fn());
    }, 3000);
    getEventually().then((val) => {
      clearTimeout(tid);
      res(val);
    });
  });
}

export async function expectEventually<T>(fn: () => T, value: T) {
  return expect(eventually(fn, value)).resolves.toBeTruthy();
}
