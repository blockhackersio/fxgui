import { Precision } from "@fxgui/precision";
import { calculateForwards, calculateBackwards } from "./forex";
import { test, expect } from "vitest";

function format(input: Precision): string {
  return input.toFormat(Precision.FORMAT_DOLLAR);
}

test("calculateForwards easy numbers", () => {
  const base = Precision.from(100_00n, 2n); // 100 AUD
  const rate = Precision.from(500n, 3n); // 0.5
  const perc = Precision.from(10_00n, 4n); // 10%
  expect(base.toString()).toBe("100");
  expect(rate.toString()).toBe("0.5");
  expect(perc.toString()).toBe("0.1"); // 0.5 %
  // fee = base * perc = 10 AUD;
  // quote = rate * (base - (base * perc))
  const { quote, fee, net } = calculateForwards(base, rate, perc);

  expect(format(net)).toBe("90");
  expect(format(fee)).toBe("10");
  expect(format(quote)).toBe("45");
});

test("calculateForwards real numbers", () => {
  const base = Precision.from(100_00n, 2n); // 100 AUD
  const rate = Precision.from(600n, 3n); // 0.6 EUR
  const perc = Precision.from(50n, 4n); // 0.5%
  expect(base.toString()).toBe("100");
  expect(rate.toString()).toBe("0.6");
  expect(perc.toString()).toBe("0.005"); // 0.5 %
  // fee = base * perc = 10 AUD;
  // quote = rate * (base - (base * perc))
  const { quote, fee, net } = calculateForwards(base, rate, perc);

  expect(format(net)).toBe("99.50");
  expect(format(fee)).toBe("0.50");
  expect(format(quote)).toBe("59.70");
});

test("calculateBackwards easy numbers", () => {
  // const base = Precision.from(100_00n, 2n); // 100 AUD
  const quote = Precision.from(45_00n, 2n); // 45 EUR
  const rate = Precision.from(500n, 3n); // 0.5
  const perc = Precision.from(10_00n, 4n); // 10%

  const { base, net, fee } = calculateBackwards(quote, rate, perc);
  expect(format(base)).toBe("100");
  expect(format(fee)).toBe("10");
  expect(format(net)).toBe("90");
});
