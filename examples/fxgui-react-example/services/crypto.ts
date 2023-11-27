import { Direction, None, Token, TokenMap } from "@fxgui/core";
import { Precision as Num } from "@fxgui/precision";
import Tokens from "./crypto.json";
import { Assets } from "@/types";
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
    const fPerc = Num.from(feePercInt).div(Num.from(10000n));
    const { fee, total } = calculateForwards(input, pa, pb, fPerc);

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
    const fPerc = Num.from(feePercInt).div(Num.from(10000n));
    const { fee, input } = calculateBackwards(total, pa, pb, fPerc);
    const inputInt = input.unscale(a.decimals);
    const feeAmtInt = fee.unscale(b.decimals);

    const breakdown = {
      feePerc: feePercInt,
      feeAmt: feeAmtInt,
    };
    return [inputInt, breakdown];
  }
}

export function getAssets(): Assets {
  const tokens: Token[] = Tokens.map((t) => ({
    ...t,
    decimals: BigInt(t.decimals),
  }));
  const shortlist: Token[] = [];
  const assets = new TokenMap(tokens as any as Token[]);
  return {
    assets,
    tokens,
    shortlist,
  };
}

export async function ratesFn(a: Token, b: Token): Promise<Pool> {
  const pools: Record<string, IntTuple> = {
    BTC_USD: [1n * 1_00000000n, 30000_00n],
    ETH_USD: [1n * 1_000000000000000000n, 2000_00n],
    BTC_ETH: [1n * 1_00000000n, 15_000000000000000000n],
  };

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
