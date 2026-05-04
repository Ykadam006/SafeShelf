/** Shared shapes aligned with SafeShelf api-service envelopes & DTOs. */

export interface ApiFailureEnvelope {
  success: false;
  message: string;
  errors: unknown[];
}

export interface ApiSuccessEnvelope<T> {
  success: true;
  message?: string;
  data: T;
}


export type Id = string;

export type UserRole = "ADMIN" | "USER";

export type AlertStatus = "NEW" | "REVIEWED" | "DISMISSED" | "RESOLVED";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

/** Normalized upstream / derived risk tier on recalls (api-service RecallRiskLevel). */
export type RecallRiskLevel =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "UNKNOWN"
  | "UNMAPPED_CLASS";

export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryDto {
  id: string;
  name: string;
  description: string | null;
  pantryItemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PantryItemNestedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface PantryItemNestedCategory {
  id: string;
  name: string;
  description: string | null;
}

export interface PantryItemDto {
  id: string;
  userId: string;
  categoryId: string;
  name: string;
  brand: string | null;
  quantity: number;
  expirationDate: string | null;
  purchaseDate: string | null;
  storageLocation: string | null;
  barcode: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  user: PantryItemNestedUser;
  category: PantryItemNestedCategory;
}

export interface DashboardRecentRecallCheck {
  id: string;
  pantryItemId: string;
  searchQuery: string;
  matchesFound: number;
  externalApiStatus: string;
  checkedAt: string;
  pantryItem: { id: string; name: string; brand: string | null };
}

export interface DashboardItemsByCategory {
  categoryId: string;
  categoryName: string;
  itemCount: number;
}

export interface DashboardSummary {
  totalPantryItems: number;
  totalCategories: number;
  totalRecallAlerts: number;
  activeAlerts: number;
  highRiskAlerts: number;
  expiringSoonItems: number;
  recentRecallChecks: DashboardRecentRecallCheck[];
  itemsByCategory: DashboardItemsByCategory[];
  alertsByRiskLevel: Array<{ riskLevel: RiskLevel; count: number }>;
  latestAlerts: RecallAlertDto[];
}

export interface RecallSummaryDto {
  id: string;
  openfdaEventId: string;
  productDescription: string | null;
  recallingFirm: string | null;
  reasonForRecall: string | null;
  classification: string | null;
  status: string | null;
  distributionPattern: string | null;
  recallInitiationDate: string | null;
  createdAt: string;
}

export interface RecallAlertDto {
  id: string;
  userId: string;
  pantryItemId: string;
  recallId: string;
  riskLevel: RiskLevel;
  alertStatus: AlertStatus;
  createdAt: string;
  updatedAt: string;
  dismissedAt: string | null;
  reviewedAt?: string | null;
  resolvedAt?: string | null;
  notes?: string | null;
  user: UserDto;
  pantryItem: PantryItemDto;
  recall: RecallSummaryDto;
}

export interface RecallSearchResultRow {
  eventId: string;
  productDescription: string | null;
  recallingFirm: string | null;
  reasonForRecall: string | null;
  classification: string | null;
  status: string | null;
  distributionPattern: string | null;
  recallInitiationDate: string | null;
  riskLevel: RecallRiskLevel;
}

export interface RecallSearchPayload {
  source: "recall-service";
  query: string;
  count: number;
  recalls: RecallSearchResultRow[];
  upstreamMessage?: string;
  info?: string;
}
