export type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "lost";
export type JobStatus = "draft" | "scheduled" | "in_progress" | "on_hold" | "completed" | "cancelled";
export type JobPriority = "low" | "normal" | "high" | "urgent";
export type EstimateStatus = "draft" | "sent" | "viewed" | "approved" | "declined" | "expired";
export type InvoiceStatus = "draft" | "sent" | "viewed" | "partial" | "paid" | "void" | "overdue";
export type PaymentMethod = "stripe" | "cash" | "check" | "bank_transfer" | "other";
export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";
export type UserRole = "owner" | "admin" | "member";
export type OrgPlan = "free" | "pro" | "enterprise";
export type ActorType = "user" | "system" | "automation" | "jojo";

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  meta?: {
    page?: number;
    perPage?: number;
    total?: number;
  };
}
