import { test, expect } from "vitest";
import { intToStr, strToInt } from ".";
import { log } from "./utils";
import {
  calculateFn,
  expectEventually,
  makeAssets,
  makeFxGui,
  makePools,
} from "./test/utils";
const assets = makeAssets();
const pools = makePools();
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

test("swap from BTC to USD and then change the token to ETH", async () => {
  const { engine, calculate, rates } = makeFxGui(assets);
  log("== setTokenAId: BTC");
  engine.setTokenAId("BTC");

  log("== setTokenBId: USD");
  engine.setTokenBId("USD");
  log("== setDirection: forward");
  engine.setTokenAFocus();

  log("== setTokenAAmt: 100000000n");
  engine.setTokenAInput("1"); // 1 BTC
  expect(engine.tokenBInput()).toBe("0"); // Will take some time to settle
  await expectEventually(engine.tokenBInput, "30150");
  expect(engine.breakdown()?.feeAmt).toBe(150_00n);
  expect(engine.breakdown()?.feePerc).toBe(50n);
  expect(calculate).toHaveBeenCalledTimes(1);
  expect(rates).toHaveBeenCalledTimes(1);
  engine.setTokenAId("ETH");
  engine.setTokenAInput("1");
  await expectEventually(engine.tokenBInput, "2010");
  engine.setTokenAInput("2");
  await expectEventually(engine.tokenBInput, "4020");
});

test("swap from ETH to BTC", async () => {
  const { engine } = makeFxGui(assets);

  log("==> setTokenAFocus");
  engine.setTokenAFocus();
  log("==> setTokenAInput: 1");
  engine.setTokenAInput("1");
  await expectEventually(engine.tokenBInput, "0");
  log("==> setTokenAId: BTC");
  engine.setTokenAId("BTC");
  await expectEventually(engine.tokenBInput, "0");
  log("==> setTokenBId: USD");
  engine.setTokenBId("USD");
  await expectEventually(engine.tokenBInput, "30150");
  log("==> setTokenBFocus");
  engine.setTokenBFocus();
  log("==> setTokenBInput: 15075");
  engine.setTokenBInput("15075");
  await expectEventually(engine.tokenAInput, "0.5");
});
