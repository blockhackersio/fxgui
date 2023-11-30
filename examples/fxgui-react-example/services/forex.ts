import { Direction, Token, TokenMap } from "@fxgui/core";
import currencies from "./forex.json";
import { Precision } from "@fxgui/precision";
import { Assets } from "@/types";

export function getAssets(): Assets {
  const tokens: Token[] = currencies.map((c) => ({
    decimals: BigInt(c.precision),
    id: c.short_code,
    name: c.name,
  }));
  const assets = new TokenMap(tokens);
  const shortlist = tokens.filter((token) =>
    ["AUD", "USD", "EUR", "GBP", "JPY", "CNY"].includes(token.id.toUpperCase()),
  );
  return {
    assets,
    tokens,
    shortlist,
  };
}

type Rates = Record<string, number>;

type CacheMap<T> = Map<string, { expiry: Date; data: T }>;

class Cache<T> {
  private cache: CacheMap<T> = new Map();
  getCache(key: string) {
    if (this.cache.has(key)) {
      const { expiry, data } = this.cache.get(key)!;
      if (expiry > new Date()) {
        return data;
      }
    }

    return undefined;
  }
  setCache(key: string, data: T) {
    this.cache.set(key, {
      expiry: getFutureDate(10),
      data,
    });
  }
}

// Map for base/Rates
// const cache: Cache<Rates> = new Map();
//
function getFutureDate(min: number) {
  const date = new Date();
  date.setMinutes(date.getMinutes() + min);
  return date;
}
const cache = new Cache<Rates>();

const API_KEY = process.env.NEXT_PUBLIC_CURRENCY_BEACON_API;

if (!API_KEY) console.error("Please set an API key for the currency API");

export async function ratesFn(base: Token, _: Token): Promise<Rates> {
  const rates = cache.getCache(base.id);
  if (rates) return rates;

  // Fetch rates
  try {
    const url = `https://api.currencybeacon.com/v1/latest?api_key=${API_KEY}&base=${base.id}`;
    const res = await fetch(url);
    const json: { rates: Rates } = await res.json();
    const newRates = json.rates;
    cache.setCache(base.id, newRates);
    return newRates;
  } catch (err) {
    return {};
  }
}

type Breakdown = {
  feePerc: bigint;
  feeAmt: bigint;
};

function calculateForwards(
  input: Precision,
  rate: Precision,
  fPerc: Precision,
) {
  const preFee = input.mul(rate);
  const fee = preFee.mul(fPerc);
  const total = preFee.add(fee);
  return {
    fee,
    total,
    preFee,
  };
}

function calculateBackwards(
  total: Precision,
  rate: Precision,
  fPerc: Precision,
) {
  const preFee = total.div(fPerc.add(Precision.from(1n)));
  const fee = total.sub(preFee);
  const input = preFee.div(rate);
  return {
    preFee,
    fee,
    input,
  };
}

export async function calculateFn(
  amount: bigint,
  a: Token,
  b: Token,
  dir: Direction,
  rates: Rates,
): Promise<[bigint, Breakdown]> {
  const rateAsNumber = rates[b.id];
  if (typeof rateAsNumber === "undefined") throw new Error("No rate returned");
  const feePercInt = 50n;
  const rate = Precision.fromNumber(rateAsNumber);
  const fPerc = Precision.from(feePercInt).div(Precision.from(10000n));
  if (dir === "forward") {
    const input = Precision.from(amount, a.decimals);
    const { fee, total } = calculateForwards(input, rate, fPerc);
    return [
      total.unscale(b.decimals),
      {
        feePerc: feePercInt,
        feeAmt: fee.unscale(b.decimals),
      },
    ];
  } else {
    const total = Precision.from(amount, b.decimals);
    const { input, fee } = calculateBackwards(total, rate, fPerc);
    return [
      input.unscale(a.decimals),
      {
        feePerc: feePercInt,
        feeAmt: fee.unscale(b.decimals),
      },
    ];
  }
}

console.log(process.env.CURRENCY_BEACON_API);
