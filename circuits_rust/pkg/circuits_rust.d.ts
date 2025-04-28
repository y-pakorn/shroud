/* tslint:disable */
/* eslint-disable */
export function init(): void;
export function prove(state: State, pk_bytes: Uint8Array, diffs: BigInt64Array, is_public: boolean, aux?: string | null): any;
export class Account {
  private constructor();
  free(): void;
  static new(address_hex: string, nonce_bytes: string): Account;
  getBalance(asset_id: bigint): bigint;
  getBalances(): BigUint64Array;
  setBalance(asset_id: bigint, balance: bigint): void;
  getIndex(): number | undefined;
  setIndex(index: number): void;
  export(): Uint8Array;
  static import(data: Uint8Array): Account;
}
export class State {
  private constructor();
  free(): void;
  static new(account: Account): State;
  setLeafs(leafs: string[]): void;
  addLeafs(leafs: string[]): void;
  getLeafs(): string[];
  getLeafsLength(): number;
}
