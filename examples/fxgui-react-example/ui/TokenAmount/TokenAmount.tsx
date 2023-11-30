import { TokenMap } from "@fxgui/core";
import { Precision } from "@fxgui/precision";

function formatByToken(
  assets: TokenMap,
  amount?: bigint,
  tokenId?: string,
  format: "dollar" | "token" = "token",
) {
  if (typeof amount === "undefined") return null;
  const token = assets.get(tokenId ?? "");
  if (!token) return null;
  return Precision.from(amount, token.decimals).toFormat(
    format === "token" ? Precision.FORMAT_TOKEN : Precision.FORMAT_DOLLAR,
  );
}

export function TokenAmount({
  assets,
  amount,
  tokenId,
  format = "token",
}: {
  assets: TokenMap;
  amount: bigint;
  tokenId: string;
  format?: "dollar" | "token";
}) {
  return (
    <span>
      {formatByToken(assets, amount, tokenId, format)} {tokenId}
    </span>
  );
}
