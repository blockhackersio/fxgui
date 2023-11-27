import { Button, Input } from "@chakra-ui/react";
import { Select } from "@chakra-ui/react";
import { Flex, VStack } from "@chakra-ui/react";
import { Direction, None, Token, TokenMap, createEngine } from "@fxgui/core";
import { FORMATS, Precision as Num, Precision } from "@fxgui/precision";
import { useEngine } from "@fxgui/react";

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

function TokenInput(props: {
  value: string;
  tokenId?: string;
  tokens: Token[];
  onChange: (v: string) => void;
  onSelect: (v: string) => void;
  onFocus: () => void;
}) {
  const onSelect = (e: { target: { value: string } }) => {
    // props.onFocus();
    props.onSelect(e.target.value);
  };
  // console.log({ value: props.value });
  return (
    <Flex>
      <Input
        placeholder="0.0"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        onFocus={props.onFocus}
      />
      <Select placeholder=" " onChange={onSelect}>
        {props.tokens.map((token) => {
          return (
            <option key={token.id} value={token.id}>
              {token.id}
            </option>
          );
        })}
      </Select>
    </Flex>
  );
}

function formatByToken(amount?: bigint, tokenId?: string) {
  if (typeof amount === "undefined") return null;
  const token = assets.get(tokenId ?? "");
  if (!token) return null;
  return Precision.from(amount, token.decimals).toFormat(
    Precision.FORMAT_TOKEN,
  );
}

function formatByPlaces(amount?: bigint, exponent?: bigint) {
  if (typeof amount === "undefined" || typeof exponent === "undefined")
    return null;
  return Precision.from(amount, exponent).toFormat(FORMATS.PERCENT);
}

function SwapInterface() {
  const e = useEngine(engine);
  // console.log(e);
  return (
    <VStack maxWidth="400px">
      <Flex direction="column">
        <TokenInput
          value={e.tokenAInput}
          tokenId={e.tokenAId}
          tokens={Tokens}
          onChange={e.setTokenAInput}
          onSelect={e.setTokenAId}
          onFocus={e.setTokenAFocus}
        />
        <TokenInput
          value={e.tokenBInput}
          tokenId={e.tokenBId}
          tokens={Tokens}
          onChange={e.setTokenBInput}
          onSelect={e.setTokenBId}
          onFocus={e.setTokenBFocus}
        />
      </Flex>
      {e.breakdown && (
        <div>
          <div>{formatByPlaces(e.breakdown.feePerc, 2n)}%</div>

          <div>
            {formatByToken(e.breakdown.feeAmt, e.tokenBId)} {e.tokenBId}
          </div>
        </div>
      )}
      <Button width="100%">Swap</Button>
    </VStack>
  );
}

export default function Home() {
  return (
    <div>
      <SwapInterface />
    </div>
  );
}
function toString(o: any) {
  return JSON.stringify(
    o,
    (_, v) => (typeof v === "bigint" ? v.toString() : v),
    2,
  );
}
