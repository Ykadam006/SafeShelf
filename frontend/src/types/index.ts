// Shared types mirroring the api-service envelopes and DTOs.

// Standard error envelope shape.
export interface ApiFailureEnvelope {
  success: false;
  message: string;
  errors: unknown[];
}

// Standard success envelope shape.
export interface ApiSuccessEnvelope<T> {
  success: true;
  message?: string;
  data: T;
}

export type Id = string;

// Enums shared with the backend.
export type UserRole = "ADMIN" | "USER";
export type AlertStatus = "NEW" | "REVIEWED" | "DISMISSED" | "RESOLVED";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

// Risk tier used on derived recall results from /api/recalls/search.
export type RecallRiskLevel =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "UNKNOWN"
  | "UNMAPPED_CLASS";

// Public user shape.
export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

// Public category shape including pantry-item count.
export interface CategoryDto {
  id: string;
  name: string;
  description: string | null;
  pantryItemCount: number;
  createdAt: string;
  updatedAt: string;
}

// Slim user/category nested inside pantry-item responses.
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

// Public pantry-item shape.
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

// Tile types returned by /api/dashboard/summary.
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

// Persisted FDA recall snapshot returned from the API.
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

// Recall alert with all of its joined relations.
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

// Single row in /api/recalls/search results.
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

// Top-level payload shape from /api/recalls/search.
export interface RecallSearchPayload {
  source: "recall-service";
  query: string;
  count: number;
  recalls: RecallSearchResultRow[];
  upstreamMessage?: string;
  info?: string;
}
