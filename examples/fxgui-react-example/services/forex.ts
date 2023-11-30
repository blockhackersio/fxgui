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
  net: bigint; // in base
  perc: bigint;
  fee: bigint;
};

export function calculateForwards(
  base: Precision, // base
  rate: Precision, // rate 0.0-1.0
  perc: Precision, // fee ratio percent 0.0 - 1.0
) {
  const fee = base.mul(perc);
  const net = base.sub(fee);
  const quote = net.mul(rate);

  return {
    fee,
    net,
    quote,
  };
}

export function calculateBackwards(
  quote: Precision, // quote
  rate: Precision, // 0 - 1
  perc: Precision, // fee rate 0 - 1
) {
  const one = Precision.from(1n);
  const base = quote.div(rate.mul(one.sub(perc)));
  const fee = base.mul(perc);
  const net = base.sub(fee);
  return {
    fee,
    base,
    net,
  };
}

export async function calculateFn(
  amount: bigint,
  a: Token,
  b: Token,
  dir: Direction,
  rates: Rates,
): Promise<[bigint, Breakdown]> {
  const FEE_BASIS = 50n; // this should probably be elsewhere
  const rateAsNumber = rates[b.id];
  if (typeof rateAsNumber === "undefined") throw new Error("No rate returned");
  const rate = Precision.fromNumber(rateAsNumber);
  const perc = Precision.from(FEE_BASIS).div(Precision.from(10000n));
  if (dir === "forward") {
    const base = Precision.from(amount, a.decimals);
    const { fee, net, quote } = calculateForwards(base, rate, perc);
    return [
      quote.unscale(b.decimals),
      {
        net: net.unscale(a.decimals),
        perc: FEE_BASIS,
        fee: fee.unscale(a.decimals),
      },
    ];
  } else {
    const quote = Precision.from(amount, b.decimals);
    const { base, net, fee } = calculateBackwards(quote, rate, perc);
    return [
      base.unscale(a.decimals),
      {
        net: net.unscale(a.decimals),
        perc: FEE_BASIS,
        fee: fee.unscale(a.decimals),
      },
    ];
  }
}
