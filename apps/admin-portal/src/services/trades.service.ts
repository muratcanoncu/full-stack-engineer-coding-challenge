import { apiClient } from './api.service';

/**
 * Mirrors `TradeConfigResponseDto` from pricing-service. The `metadata` field
 * is where today's `TradeConfig.pricingSchema` will live until the candidate
 * promotes it to a first-class column.
 */
export interface TradeConfigResponse {
  id: string;
  trade: string;
  displayName: string;
  isActive: boolean;
  metadata: Record<string, unknown>;
}

export function listTrades(): Promise<TradeConfigResponse[]> {
  return apiClient.get<TradeConfigResponse[]>('/trades').then((r) => r.data);
}

export function getTrade(trade: string): Promise<TradeConfigResponse> {
  return apiClient.get<TradeConfigResponse>(`/trades/${trade}`).then((r) => r.data);
}
