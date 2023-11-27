import { TokenMap } from "@fxgui/core";
import { Precision } from "@fxgui/precision";

function formatByToken(assets: TokenMap, amount?: bigint, tokenId?: string) {
  if (typeof amount === "undefined") return null;
  const token = assets.get(tokenId ?? "");
  if (!token) return null;
  return Precision.from(amount, token.decimals).toFormat(
    Precision.FORMAT_TOKEN,
  );
}

export function TokenAmount(props: {
  assets: TokenMap;
  amount: bigint;
  tokenId: string;
}) {
  return (
    <span>
      {formatByToken(props.assets, props.amount, props.tokenId)} {props.tokenId}
    </span>
  );
}
