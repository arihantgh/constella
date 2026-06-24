/** Normalized Soroban event from the relay. */
export interface SorobanEvent {
  type: string;
  contract_id: string;
  topic: string[];
  data: any;
  ledger: number;
  tx_hash: string;
  timestamp: string;
}
