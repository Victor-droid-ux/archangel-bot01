export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  tags?: string[];
  price: number | null;
  pnl: number | null;
  liquidity: number | null;
  marketCap: number | null;
}
