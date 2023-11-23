import { Button, HStack, Input } from "@chakra-ui/react";
import { Select } from "@chakra-ui/react";
import { Flex, VStack } from "@chakra-ui/react";
// import { useSignal } from "@msig/react";
import { Direction, None, Token, TokenMap, createEngine } from "@fxgui/core";
import { Precision as Num } from "@fxgui/precision";
//
//
//
// XXX: Having some issue with tslib and ts-result
//
//
//
//
//
//
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
  // console.log("calculateFn");
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

const Tokens: Token[] = [
  { id: "BTC", decimals: 8n },
  { id: "ETH", decimals: 18n },
  { id: "USD", decimals: 2n },
];
const assets = new TokenMap(Tokens);

const engine = createEngine(assets, calculateFn, ratesFn);

function TokenInput() {
  return (
    <Flex>
      <Input placeholder="0.0" />
      <Select placeholder=" ">
        <option value="ETH">ETH</option>
        <option value="BTC">BTC</option>
        <option value="USD">USD</option>
      </Select>
    </Flex>
  );
}

function SwapInterface() {
  // useSignalScope(() => {
  //   const [count] = createSignal();
  // });
  return (
    <VStack maxWidth="400px">
      <Flex direction="column">
        <TokenInput />
        <TokenInput />
      </Flex>
      <Button width="100%">Swap</Button>
    </VStack>
  );
}

export default function Home() {
  return (
    <HStack width="100%">
      <SwapInterface />
    </HStack>
  );
}
