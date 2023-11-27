import { getAssets, calculateFn, ratesFn } from "@/services/crypto";
import { SwapButton } from "@/ui/Button/SwapButton";
import { Layout } from "@/ui/Layout";
import { TokenAmount } from "@/ui/TokenAmount/TokenAmount";
import { TokenInput } from "@/ui/TokenInput/TokenInput";
import { HStack } from "@chakra-ui/react";
import { createEngine } from "@fxgui/core";
import { useEngine } from "@fxgui/react";
import Link from "next/link";
import { IoIosArrowRoundBack } from "react-icons/io";

const assets = getAssets();
const engine = createEngine(assets.assets, calculateFn, ratesFn);

export default function Crypto() {
  const e = useEngine(engine);
  return (
    <Layout
      title="Swap"
      back={
        <Link href="/">
          <HStack>
            <IoIosArrowRoundBack />
            <div>Home</div>
          </HStack>
        </Link>
      }
    >
      <TokenInput
        id="tokenA"
        label="You pay"
        value={e.tokenAInput}
        tokenId={e.tokenAId}
        assets={assets}
        onChange={e.setTokenAInput}
        onSelect={e.setTokenAId}
        onFocus={e.setTokenAFocus}
      />
      <TokenInput
        id="tokenB"
        label="You recieve"
        value={e.tokenBInput}
        tokenId={e.tokenBId}
        assets={assets}
        onChange={e.setTokenBInput}
        onSelect={e.setTokenBId}
        onFocus={e.setTokenBFocus}
      />
      {e.breakdown && e.tokenBId && (
        <p>
          <TokenAmount
            assets={assets.assets}
            amount={e.breakdown.feeAmt}
            tokenId={e.tokenBId}
          />{" "}
          Conversion Fee
        </p>
      )}
      <SwapButton>Swap</SwapButton>
    </Layout>
  );
}
