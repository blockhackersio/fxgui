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
assetLib.toDecimal(id:string, amount:bigint):Decimal;

useFxGuiData<B extends object,R extends [bigint, B]>,V extends object>({
  assets,
  async calculateRateFee(
    tokenA: Asset,
    tokenB: Asset,
    direction: "ab" | "ba",
    vars: V
  ):Promise<R>,
  async fetchVars(tokenA:Asset, tokenB:Asset):Promise<V>
}):{
  breakdown?:B
  tokenAValue:bigint,
  tokenBValue:bigint,
  tokenAId:string,
  tokenBId:string,
  tokenAOptions: Disablable<Asset>[],
  tokenBOptions: Disablable<Asset>[],
  onTokenAAmountChanged:(value:bigint) => void,
  onTokenBAmountChanged:(value:bigint) => void,
  onTokenAAssetChanged:(asset:string) => void,
  onTokenBAssetChanged:(asset:string) => void,
  onToggleTokens:() => void,
  error: string,
  isError:boolean,
  isFetchingVars:boolean,
  isFetchedVars:boolean,
  isLoading: boolean,
  isSuccess:boolean,
};
```
