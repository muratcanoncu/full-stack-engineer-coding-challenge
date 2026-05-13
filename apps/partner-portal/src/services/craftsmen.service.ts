import { apiClient } from './api.service';

export interface CraftsmanResponse {
  id: string;
  companyName: string;
  email: string | null;
  phone: string | null;
  vatNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  isActive: boolean;
  trades: string[];
  createdAt: string;
  updatedAt: string;
}

export function fetchCraftsman(id: string): Promise<CraftsmanResponse> {
  return apiClient.get<CraftsmanResponse>(`/craftsmen/${id}`).then((r) => r.data);
}

export function updateCraftsman(
  id: string,
  patch: Partial<Omit<CraftsmanResponse, 'id' | 'trades' | 'createdAt' | 'updatedAt'>>,
): Promise<CraftsmanResponse> {
  return apiClient.patch<CraftsmanResponse>(`/craftsmen/${id}`, patch).then((r) => r.data);
}
