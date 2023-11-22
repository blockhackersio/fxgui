import { describe, it, expect } from "vitest";

import { Precision } from ".";

describe("the Precision class", () => {
  it("checks precision", () => {
    expect(Precision.from(1_000000n, 6n).unscale(18n)).toBe(1n * 10n ** 18n);
    expect(Precision.from(1_000000n, 6n).unscale(4n)).toBe(1n * 10n ** 4n);
    expect(Precision.from(100_000000n, 6n).unscale(4n)).toBe(100n * 10n ** 4n);
  });

  it("checks the add method", () => {
    const summands = Precision.from(2_0n, 1n);
    const sum = summands.add(Precision.from(1_14159n, 5n)).unscale(5n);
    expect(sum).toEqual(3_14159n);
  });

  it("checks the subtract method", () => {
    const minuend = Precision.from(10_00n, 2n);
    const difference = minuend.sub(Precision.from(6_8584n, 4n)).unscale(4n);
    expect(difference).toEqual(3_1416n);
  });

  it("checks the multiplication method", () => {
    const multiplicand = Precision.from(300_00000n, 5n);
    const product = multiplicand.mul(Precision.from(5n)).unscale(2n);
    expect(product).toEqual(150000n);
  });

  it("to checks the divid method", () => {
    // https://mathworld.wolfram.com/PiApproximations.html
    const dividend = Precision.from(
      233546921420225777694970883318153571_000n,
      3n,
    );
    const divisor = Precision.from(74340293968115785654927455866388593n, 0n);
    const quotient = dividend.div(divisor).unscale(18n);
    expect(quotient).toBe(3_141592653916501746n);
  });

  it("subs two Precisions and returns a number", () => {
    const minuend = Precision.from(10_00n, 2n);
    const difference = minuend.sub(Precision.from(6_8584n, 4n)).toNumber();
    expect(difference).toEqual(3.1416);
  });

  it("returns Precision as a fixed string", () => {
    expect(Precision.from(3_141590n, 6n).toString()).toBe("3.14159");
  });

  it("returns Precision as a string with different formats", () => {
    expect(Precision.from(1000_00n, 2n).toFormat(Precision.FORMAT_EUR)).toBe(
      "1.000",
    );

    expect(Precision.from(1000_36n, 2n).toFormat(Precision.FORMAT_EUR)).toBe(
      "1.000,36",
    );

    expect(
      Precision.from(1000000_0000n, 4n).toFormat(Precision.FORMAT_DOLLAR),
    ).toBe("1,000,000");

    expect(
      Precision.from(1000000_1000n, 4n).toFormat(Precision.FORMAT_DOLLAR),
    ).toBe("1,000,000.10");

    expect(
      Precision.from(1000000_111111n, 6n).toFormat(Precision.FORMAT_TOKEN, 8),
    ).toBe("1,000,000.111111");
  });

  it("ensures values can be created from number", () => {
    expect(Precision.fromNumber(100).unscale(18n)).toBe(100n * 10n ** 18n);
    expect(Precision.fromNumber(1.0).unscale(4n)).toBe(1n * 10n ** 4n);
  });

  it("ensures that maths can be used fromNumber", () => {
    const summands = Precision.fromNumber(2);
    const sum = summands.add(Precision.fromNumber(1.14159)).unscale(5n);
    expect(sum).toEqual(3_14159n);

    const minuend = Precision.fromNumber(10.0);
    const difference = minuend.sub(Precision.fromNumber(6.8584)).unscale(4n);
    expect(difference).toEqual(3_1416n);

    const multiplicand = Precision.fromNumber(300.0);
    const product = multiplicand.mul(Precision.fromNumber(5)).unscale(2n);
    expect(product).toEqual(150000n);

    // https://mathworld.wolfram.com/PiApproximations.html
    const dividend = Precision.fromNumber(8405139762.0);
    const divisor = Precision.fromNumber(2675439081);
    const quotient = dividend.div(divisor).unscale(18n);
    expect(quotient).toBe(3_141592653591053677n);
  });

  it("does not output scientific notification on toString", () => {
    const multiplicand = Precision.from(300_00000n, 5n);
    const product = multiplicand
      .mul(Precision.from(500000000012121212120n))
      .toString();
    expect(product).toEqual("150000000003636370000000");
  });

  it("ensures that scientific notation can be used with fromNumber with a floating point number", () => {
    const summands = Precision.fromNumber("1.2112222222222222e+22");
    const sum = summands.add(Precision.fromNumber(1.14159)).unscale(23n);
    expect(sum).toEqual(1211222222222222200000114159000000000000000000n);
  });

  it("ensures that scientific notation can be used with fromNumber with a whole number", () => {
    const summands = Precision.fromNumber("2e+2");
    const sum = summands.add(Precision.fromNumber(1.14159)).unscale(23n);
    expect(sum).toEqual(20114159000000000000000000n);
  });
});
