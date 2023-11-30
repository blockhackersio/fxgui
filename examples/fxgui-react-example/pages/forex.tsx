import { getAssets, calculateFn, ratesFn } from "@/services/forex";
import { SwapButton } from "@/ui/Button/SwapButton";
import { Layout } from "@/ui/Layout";
import { TokenAmount } from "@/ui/TokenAmount/TokenAmount";
import { TokenInput } from "@/ui/TokenInput/TokenInput";
import { Flex, HStack, Text } from "@chakra-ui/react";
import { createFxGui } from "@fxgui/core";
import { Precision } from "@fxgui/precision";
import { useFxGui } from "@fxgui/react";
import Link from "next/link";
import { ReactNode } from "react";
import { IoIosArrowRoundBack } from "react-icons/io";

const assets = getAssets();
const engine = createFxGui(assets.assets, calculateFn, ratesFn);
export function TokenRow({ children }: { children: ReactNode }) {
  return (
    <Flex direction="row" justifyContent="space-between" px="2">
      {children}
    </Flex>
  );
}
export default function Forex() {
  const e = useFxGui(engine);
  return (
    <Layout
      title="Send funds"
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
        selectPlaceholder="Select Currency"
        assets={assets}
        onChange={e.setTokenAInput}
        onSelect={e.setTokenAId}
        onFocus={e.setTokenAFocus}
      />
      {e.breakdown && e.tokenAId && (
        <>
          <TokenRow>
            <span>
              −{" "}
              <TokenAmount
                assets={assets.assets}
                amount={e.breakdown.fee}
                tokenId={e.tokenAId}
                format="dollar"
              />
            </span>
            <Text>Our Fee</Text>
          </TokenRow>
          <TokenRow>
            <span>
              ={" "}
              <TokenAmount
                assets={assets.assets}
                amount={e.breakdown.net}
                tokenId={e.tokenAId}
                format="dollar"
              />
            </span>
            <Text>Amount we'll convert</Text>
          </TokenRow>
          <TokenRow>
            <span>
              × {Precision.from(e.breakdown.rate, 8n).toNumber().toFixed(6)}
            </span>
            <Text>Market rate</Text>
          </TokenRow>
        </>
      )}
      <TokenInput
        id="tokenB"
        label="Amount recieved"
        value={e.tokenBInput}
        tokenId={e.tokenBId}
        selectPlaceholder="Select Currency"
        assets={assets}
        onChange={e.setTokenBInput}
        onSelect={e.setTokenBId}
        onFocus={e.setTokenBFocus}
      />
      <SwapButton>Swap</SwapButton>
    </Layout>
  );
}
