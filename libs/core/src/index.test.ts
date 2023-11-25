import { test, expect, vi } from "vitest";
import {
  TokenMap,
  Token,
  Direction,
  None,
  createEngine,
  intToStr,
  strToInt,
} from ".";
import { Precision as Num } from "@fxgui/precision";
import { nextTick } from "@msig/core";
import { log } from "./utils";

// Test Utils
const Tokens: Token[] = [
  { id: "BTC", decimals: 8n },
  { id: "ETH", decimals: 18n },
  { id: "USD", decimals: 2n },
];

const assets = new TokenMap(Tokens);

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
async function calculateFn(
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

const pools: Record<string, IntTuple> = {
  BTC_USD: [1n * 1_00000000n, 30000_00n],
  ETH_USD: [1n * 1_000000000000000000n, 2000_00n],
  BTC_ETH: [1n * 1_00000000n, 15_000000000000000000n],
};

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

function makeEngine() {
  const calculate = vi.fn(calculateFn);
  const rates = vi.fn(ratesFn);
  const engine = createEngine(assets, calculate, rates);
  return { engine, calculate, rates };
}

test("calculateFn btc -> usd", async () => {
  expect(
    await calculateFn(
      1_00000000n,
      assets.get("BTC")!,
      assets.get("USD")!,
      "forward",
      {
        ticker: "BTC_USD",
        pair: {
          BTC: pools["BTC_USD"][0],
          USD: pools["BTC_USD"][1],
        },
      },
    ),
  ).toEqual([
    3015000n,
    {
      feeAmt: 15000n,
      feePerc: 50n,
    },
  ]);
});
test("calculateFn btc -> usd backwards", async () => {
  expect(
    await calculateFn(
      3015000n,
      assets.get("BTC")!,
      assets.get("USD")!,
      "backward",
      {
        ticker: "BTC_USD",
        pair: {
          BTC: pools["BTC_USD"][0],
          USD: pools["BTC_USD"][1],
        },
      },
    ),
  ).toEqual([
    1_00000000n,
    {
      feeAmt: 15000n,
      feePerc: 50n,
    },
  ]);
});
test("calculateFn usd -> btc", async () => {
  expect(
    await calculateFn(
      30000_00n,
      assets.get("USD")!,
      assets.get("BTC")!,
      "forward",
      {
        ticker: "BTC_USD",
        pair: {
          BTC: pools["BTC_USD"][0],
          USD: pools["BTC_USD"][1],
        },
      },
    ),
  ).toEqual([
    100499999n,
    {
      feeAmt: 499999n,
      feePerc: 50n,
    },
  ]);
});

test("convert between scales", () => {
  expect(intToStr(8n, 6633n)).toBe("0.00006633");
  expect(intToStr(8n, 123456789n)).toBe("1.23456789");
  expect(intToStr(8n, 123456789n, 4n)).toBe("1.2345");
  expect(intToStr(4n, 12345n, 8n)).toBe("1.23450000");
  expect(intToStr(4n, 12345n, -1n)).toBe("1.2345");
  expect(intToStr(4n, 10000n, -1n)).toBe("1");
  expect(intToStr(0n, 1000n)).toBe("1000");
  expect(strToInt(0n, "1000")).toBe(1000n);
  expect(intToStr(2n, 10000n)).toBe("100.00");
  expect(strToInt(2n, "1000")).toBe(100000n);
  expect(strToInt(2n, "1000.000000000")).toBe(100000n);
  expect(strToInt(2n, "1234.567890123")).toBe(123456n);
  expect(strToInt(4n, "0.1234")).toBe(1234n);
  expect(intToStr(4n, 1234n)).toBe("0.1234");
});

test("swap from ETH to BTC", async () => {
  const { engine, calculate, rates } = makeEngine();
  log("== setTokenAId: BTC");
  engine.setTokenAId("BTC");

  log("== setTokenBId: USD");
  engine.setTokenBId("USD");
  log("== setDirection: forward");
  engine.setDirection("forward");

  log("== setTokenAAmt: 100000000n");
  engine.setTokenAAmt(100000000n); // 1 BTC
  expect(engine.tokenBAmt()).toBe(0n); // Will take some time to settle
  await expectEventually(engine.tokenBAmt, 3015000n);
  expect(engine.breakdown()?.feeAmt).toBe(150_00n);
  expect(engine.breakdown()?.feePerc).toBe(50n);
  expect(calculate).toHaveBeenCalledTimes(1);
  expect(rates).toHaveBeenCalledTimes(1);
  engine.setTokenAId("ETH");
  engine.setTokenAAmt(1_000000000000000000n);
  await expectEventually(engine.tokenBAmt, 2010_00n);
  engine.setTokenAAmt(2_000000000000000000n);
  await expectEventually(engine.tokenBAmt, 4020_00n);
  log("== FIN!");
  return;
});
// log(Object.keys(process.env).sort());
// log(process.env.TEST);
// test.only("changing tokenId changes decimal of amount", async () => {
//   const { engine, calculate, rates } = makeEngine();
//   engine.setTokenAAmt(100000000n); // 1 BTC
//   engine.setTokenAId("BTC");
//   await expectEventually(engine.tokenAAmt, 100000000n);
//   engine.setTokenAId("ETH");
//   await expectEventually(engine.tokenAAmt, 1000000000000000000n);
// });

type CheckerFn<T> = (v: T) => boolean;

function isCheckerFn<T>(v: T | CheckerFn<T>): v is CheckerFn<T> {
  return typeof v === "function";
}

async function eventually<T>(
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

async function expectEventually<T>(fn: () => T, value: T) {
  return expect(eventually(fn, value)).resolves.toBeTruthy();
}
