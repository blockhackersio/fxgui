import { Box } from "@chakra-ui/react";
import { TokenMap } from "@fxgui/core";
import "currency-flags/dist/currency-flags.min.css";

export function CurrencyFlag(props: { currency: string }) {
  return (
    <div
      className={`currency-flag currency-flag-${props.currency.toLowerCase()}`}
    ></div>
  );
}

export function TokenLogo({
  tokenId,
  assets,
}: {
  tokenId: string;
  assets: TokenMap;
}) {
  const token = assets.get(tokenId);
  if (!token) return null;
  if (token.logo) {
    return (
      <Box width="22px" height="22px">
        <img src={token.logo} />{" "}
      </Box>
    );
  }
  return <CurrencyFlag currency={token.id} />;
}
