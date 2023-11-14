# fxgui

Universal gui widget framework for asset trading.

The widget is framework agnostic.

Bindings are provided for:

- React
- Solid
- vue

```tsx
import { useFxGuiData } from "@blockhackers/fxgui-react";

type Asset = {
  id: string;
  decimals: number;
  logo?: string;
};

type Disablable<T> = T & {
  disabled?: boolean;
};

const assets: Asset[] = [
  { id: "ETH", decimals: 8 },
  { id: "BTC", decimals: 8 },
  { id: "USDC", decimals: 2 },
  { id: "JPY", decimals: 0 },
];

const assetLib = createAssetLib(assets);

assetLib.getAssetById:(id:string) => Asset
assetLib.formatAssetAmount(id:string,amount:bigint):string

useFxGuiData<R,V>({
  assets,
  async calculateRateFee(
    tokenA: Asset,
    tokenB: Asset,
    direction: "forward" | "backward",
    vars: V
  ):Promise<R>,
  async fetchVars(tokenA:Asset, tokenB:Asset):Promise<V>
}):{
  tokenAValue:BigInt,
  tokenBValue:BigInt,
  tokenASymbol:string,
  tokenBSymbol:string,
  tokenAOptions: Disablable<Asset>[],
  tokenBOptions: Disablable<Asset>[],
  onTokenAValueChanged:(value:BigInt) => void,
  onTokenBValueChanged:(value:BigInt) => void,
  onTokenAAssetChanged:(asset:string) => void,
  onTokenBAssetChanged:(asset:string) => void,
  loading:boolean,
  result:R
};
```
