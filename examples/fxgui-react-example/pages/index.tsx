import { Button, HStack, Input } from "@chakra-ui/react";
import { Select } from "@chakra-ui/react";
import { Flex, VStack } from "@chakra-ui/react";
import { useSignal } from "@msig/react";
import {
  Direction,
  Engine,
  None,
  Token,
  TokenMap,
  createEngine,
  assetAmtStrToInt,
  intToAssetAmtStr,
} from "@fxgui/core";
import { Precision as Num } from "@fxgui/precision";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

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

function useEngine(e: Engine) {
  const { setDirection, setTokenAAmt, setTokenAId, setTokenBAmt, setTokenBId } =
    e;

  const tokenAAmt = useSignal(e.tokenAAmt);
  const tokenAId = useSignal(e.tokenAId);
  const tokenBAmt = useSignal(e.tokenBAmt);
  const tokenBId = useSignal(e.tokenBId);
  const breakdown = useSignal(e.breakdown);
  return {
    setTokenAAmt,
    setTokenBAmt,
    setTokenAId,
    setTokenBId,
    setDirection,
    tokenAAmt,
    tokenAId,
    tokenBAmt,
    tokenBId,
    breakdown,
  };
}

function BlurInput({
  value,
  onChange = () => {},
  onFocus = () => {},
  placeholder = "",
}: {
  value: string;
  onChange?: (v: string) => void;
  onFocus?: () => void;
  placeholder?: string;
}) {
  const [tempValue, setTempValue] = useState(value);
  const [focussed, setFocus] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const displayValue = focussed ? tempValue : value;

  const commitChange = () => {
    onChange(tempValue);
    setFocus(false);
    ref.current?.blur();
  };
  const stageChange = (e: { target: { value: string } }) => {
    setTempValue(e.target.value);
  };
  const onKeyDown = (e: { key: string }) => {
    if (e.key === "Enter") {
      commitChange();
    }
  };
  return (
    <Input
      ref={ref}
      type="text"
      value={displayValue}
      onFocus={() => {
        setFocus(true);
        setTempValue(value);
        onFocus();
      }}
      onBlur={commitChange}
      onChange={stageChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
    />
  );
}

function getDecimals(tokenId?: string): bigint {
  if (!tokenId) {
    return 0n;
  }
  const token = assets.get(tokenId);
  if (!token) return 0n;
  return token.decimals;
}

function TokenInput(props: {
  amount: bigint;
  tokenId?: string;
  tokens: Token[];
  onChange: (v: bigint) => void;
  onSelect: (v: string) => void;
  onFocus: () => void;
}) {
  const decimals = getDecimals(props.tokenId);
  const onChange = (value: string) => {
    try {
      const valueAsInt = assetAmtStrToInt(decimals, value);
      props.onChange(valueAsInt);
    } catch (err) {
      console.error(err);
      return;
    }
  };

  const onSelect = (e: { target: { value: string } }) => {
    props.onSelect(e.target.value);
  };

  const onFocus = () => {
    props.onFocus();
  };

  const valueAsStr = intToAssetAmtStr(decimals, props.amount);

  return (
    <Flex>
      <BlurInput
        placeholder="0.0"
        value={valueAsStr}
        onChange={onChange}
        onFocus={onFocus}
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

function SwapInterface() {
  const e = useEngine(engine);
  const onTokenAChange = (a: bigint) => {
    console.log(a);
    e.setTokenAAmt(a);
  };
  const onTokenBChange = (b: bigint) => {
    console.log(b);
    e.setTokenBAmt(b);
  };
  const onTokenAFocus = () => {
    e.setDirection("forward");
  };
  const onTokenBFocus = () => {
    e.setDirection("backward");
  };
  return (
    <VStack maxWidth="400px">
      <Flex direction="column">
        <TokenInput
          amount={e.tokenAAmt}
          tokenId={e.tokenAId}
          tokens={Tokens}
          onChange={onTokenAChange}
          onSelect={e.setTokenAId}
          onFocus={onTokenAFocus}
        />
        <TokenInput
          amount={e.tokenBAmt}
          tokenId={e.tokenBId}
          tokens={Tokens}
          onChange={onTokenBChange}
          onSelect={e.setTokenBId}
          onFocus={onTokenBFocus}
        />
      </Flex>
      <Button width="100%">Swap</Button>
      <pre>{toString(e)}</pre>
    </VStack>
  );
}

export default function Home() {
  // const [val, setVal] = useState("");
  // const onChange = (value: string) => {
  //   setVal(value);
  // };
  return (
    <div>
      <SwapInterface />
    </div>
  );

  // return (
  //   <VStack width="100%">
  //     {/* <SwapInterface /> */}
  //     <div>{val}</div>
  //     <br />
  //     <BlurInput value={val} onChange={onChange} />
  //   </VStack>
  // );
}
function toString(o: any) {
  return JSON.stringify(
    o,
    (_, v) => (typeof v === "bigint" ? v.toString() : v),
    2,
  );
}
