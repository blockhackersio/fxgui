import BN from "bn.js";
import parseScientific, { checkScientific } from "./parseScientific";

export type FormatLocale = "de-DE" | "en-US";

export type FormatType = {
  code: FormatLocale;
  options?: Intl.NumberFormatOptions;
};

export const FORMATS: { [key: string]: FormatType } = {
  EUR: {
    code: "de-DE",
    options: {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  },
  DOLLAR: {
    code: "en-US",
    options: {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  },
  TOKEN: {
    code: "en-US",
  },
  PERCENT: {
    code: "en-US",
    options: {
      useGrouping: false,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  },
};

const INTERNAL_SCALE = 33n;

const SCALE_FOR_MULTI_DIVI = new BN(`${10n ** INTERNAL_SCALE}`);

const toBN = (Precision: Precision): BN => {
  return new BN(`${Precision.unscale(INTERNAL_SCALE)}`);
};

const toBigInt = (bn: BN): bigint => {
  return BigInt(bn.toString());
};

const toPrecision = (bn: BN): Precision => {
  return new Precision(toBigInt(bn), INTERNAL_SCALE);
};

export class Precision {
  #scaled: BN;
  static FORMAT_EUR: FormatType = FORMATS.EUR;
  static FORMAT_DOLLAR: FormatType = FORMATS.DOLLAR;
  static FORMAT_TOKEN: FormatType = FORMATS.TOKEN;
  static FORMAT_PERCENT: FormatType = FORMATS.PERCENT;

  constructor(value: bigint, exponent: bigint = 0n) {
    this.#scaled = new BN(`${value * 10n ** (INTERNAL_SCALE - exponent)}`);
  }

  static from(value: bigint, exponent: bigint = 0n): Precision {
    return new Precision(value, exponent);
  }
  static fromNumber(value: number | string): Precision {
    if (Number.isInteger(value)) return new Precision(BigInt(value));
    // split number into whole and fractional
    if (typeof value === "number") {
      const [whole, fractional] = value.toString().split(".");
      const exponent = BigInt(fractional.length);
      const bigInt = BigInt(`${whole}${fractional}`);
      return new Precision(bigInt, exponent);
    }
    if (checkScientific(value)) {
      const parsed = parseScientific(value);
      if (Number.isInteger(Number(parsed)))
        return new Precision(BigInt(parsed));
      const [whole, fractional] = parsed.toString().split(".");
      const exponent = BigInt(fractional.length);
      const bigInt = BigInt(`${whole}${fractional}`);
      return new Precision(bigInt, exponent);
    }
    throw new Error(
      "You have entered a value that isn't a number or scientific notation",
    );
  }

  unscale(precision: bigint): bigint {
    const diff = INTERNAL_SCALE - precision;
    return toBigInt(this.#scaled) / 10n ** diff;
  }

  toNumber(): number {
    const unscaled = toPrecision(this.#scaled).unscale(INTERNAL_SCALE);
    return Number(unscaled) / 10 ** Number(INTERNAL_SCALE);
  }

  toString(): string {
    const unscaledNumber = toPrecision(this.#scaled).toNumber();
    return parseScientific(`${unscaledNumber}`);
  }

  toFormat(locale: FormatType, fractionalLength: number = 8): string {
    const unscaledNumber = toPrecision(this.#scaled).toNumber();
    const options =
      locale !== Precision.FORMAT_TOKEN &&
      Number.isInteger(Number(unscaledNumber.toFixed(2)))
        ? {
            ...locale.options,
            minimumFractionDigits: 0,
          }
        : {
            maximumFractionDigits: fractionalLength,
            ...locale.options,
          };
    return unscaledNumber.toLocaleString(locale.code, options);
  }

  add(other: Precision): Precision {
    const sum = this.#scaled.add(toBN(other));
    return toPrecision(sum);
  }

  sub(other: Precision): Precision {
    const difference = this.#scaled.sub(toBN(other));
    return toPrecision(difference);
  }

  mul(other: Precision): Precision {
    const product = this.#scaled.mul(toBN(other));
    const deScaledProduct = product.div(SCALE_FOR_MULTI_DIVI);
    return toPrecision(deScaledProduct);
  }

  div(other: Precision): Precision {
    const scaledProduct = this.#scaled.mul(SCALE_FOR_MULTI_DIVI);
    const quotient = scaledProduct.div(toBN(other));
    return toPrecision(quotient);
  }
}
