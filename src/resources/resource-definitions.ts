export type ResourceDefinition = {
  delegate: string;
  model: string;
  description: string;
  searchFields?: string[];
  softDelete?: boolean;
};

export const RESOURCE_DEFINITIONS: Record<string, ResourceDefinition> = {
  users: {
    delegate: "user",
    model: "User",
    description: "Platform users and login identities",
    searchFields: ["email", "displayName", "phone"],
    softDelete: true,
  },
  "refresh-sessions": {
    delegate: "refreshSession",
    model: "RefreshSession",
    description: "Refresh token sessions",
  },
  "password-reset-tokens": {
    delegate: "passwordResetToken",
    model: "PasswordResetToken",
    description: "Password reset tokens",
  },
  workspaces: {
    delegate: "workspace",
    model: "Workspace",
    description: "Tenant workspaces",
    searchFields: ["name", "slug", "supportEmail", "phone"],
  },
  "workspace-memberships": {
    delegate: "workspaceMembership",
    model: "WorkspaceMembership",
    description: "Workspace membership links",
  },
  roles: {
    delegate: "role",
    model: "Role",
    description: "Workspace roles",
    searchFields: ["name", "description"],
  },
  permissions: {
    delegate: "permission",
    model: "Permission",
    description: "Permission catalog",
    searchFields: ["code", "name", "group"],
  },
  "role-permissions": {
    delegate: "rolePermission",
    model: "RolePermission",
    description: "Role permission assignments",
  },
  "user-roles": {
    delegate: "userRole",
    model: "UserRole",
    description: "User role assignments",
  },
  customers: {
    delegate: "customer",
    model: "Customer",
    description: "Customers and accounts",
    searchFields: ["code", "name", "billingEmail", "phone"],
    softDelete: true,
  },
  "customer-contacts": {
    delegate: "customerContact",
    model: "CustomerContact",
    description: "Customer contacts",
    searchFields: ["firstName", "lastName", "email", "phone", "title"],
  },
  facilities: {
    delegate: "facility",
    model: "Facility",
    description: "Customer facilities and sites",
    searchFields: ["code", "name", "city", "state", "country"],
  },
  "facility-contacts": {
    delegate: "facilityContact",
    model: "FacilityContact",
    description: "Facility contact assignments",
  },
  "service-categories": {
    delegate: "serviceCategory",
    model: "ServiceCategory",
    description: "Service categories",
    searchFields: ["name", "description"],
  },
  services: {
    delegate: "service",
    model: "Service",
    description: "Service catalog items",
    searchFields: ["code", "name", "description"],
  },
  "service-prices": {
    delegate: "servicePrice",
    model: "ServicePrice",
    description: "Service price records",
  },
  "service-requirements": {
    delegate: "serviceRequirement",
    model: "ServiceRequirement",
    description: "Service requirement templates",
    searchFields: ["title", "description"],
  },
  "service-areas": {
    delegate: "serviceArea",
    model: "ServiceArea",
    description: "Service areas and zones",
    searchFields: ["name", "description"],
  },
  contracts: {
    delegate: "contract",
    model: "Contract",
    description: "Customer contracts",
    searchFields: ["contractNumber", "title"],
  },
  "contract-facilities": {
    delegate: "contractFacility",
    model: "ContractFacility",
    description: "Facilities attached to contracts",
  },
  "contract-services": {
    delegate: "contractService",
    model: "ContractService",
    description: "Services attached to contracts",
    searchFields: ["name", "description"],
  },
  "contract-schedules": {
    delegate: "contractSchedule",
    model: "ContractSchedule",
    description: "Contract service schedules",
  },
  "service-requests": {
    delegate: "serviceRequest",
    model: "ServiceRequest",
    description: "Customer service requests",
    searchFields: ["requestNumber", "title", "description"],
  },
  "service-request-items": {
    delegate: "serviceRequestItem",
    model: "ServiceRequestItem",
    description: "Service request line items",
    searchFields: ["serviceName", "description"],
  },
  "service-request-status-history": {
    delegate: "serviceRequestStatusHistory",
    model: "ServiceRequestStatusHistory",
    description: "Service request status history",
  },
  "work-orders": {
    delegate: "workOrder",
    model: "WorkOrder",
    description: "Scheduled and dispatched work orders",
    searchFields: ["workOrderNumber", "title", "description"],
  },
  "work-order-tasks": {
    delegate: "workOrderTask",
    model: "WorkOrderTask",
    description: "Work order task checklists",
    searchFields: ["title", "description"],
  },
  "work-order-assignments": {
    delegate: "workOrderAssignment",
    model: "WorkOrderAssignment",
    description: "Work order staff assignments",
  },
  "work-order-status-history": {
    delegate: "workOrderStatusHistory",
    model: "WorkOrderStatusHistory",
    description: "Work order status history",
  },
  "work-order-photos": {
    delegate: "workOrderPhoto",
    model: "WorkOrderPhoto",
    description: "Work order photos and signatures",
  },
  "work-order-signoffs": {
    delegate: "workOrderSignoff",
    model: "WorkOrderSignoff",
    description: "Customer signoff records",
  },
  departments: {
    delegate: "department",
    model: "Department",
    description: "Departments",
    searchFields: ["name", "description"],
  },
  positions: {
    delegate: "position",
    model: "Position",
    description: "Employee positions",
    searchFields: ["title", "description"],
  },
  employees: {
    delegate: "employee",
    model: "Employee",
    description: "Employee profiles",
    searchFields: ["employeeNumber", "firstName", "lastName", "email", "phone"],
  },
  skills: {
    delegate: "skill",
    model: "Skill",
    description: "Employee skills",
    searchFields: ["name", "description"],
  },
  "employee-skills": {
    delegate: "employeeSkill",
    model: "EmployeeSkill",
    description: "Employee skill assignments",
  },
  certifications: {
    delegate: "certification",
    model: "Certification",
    description: "Certification definitions",
    searchFields: ["name", "description"],
  },
  "employee-certifications": {
    delegate: "employeeCertification",
    model: "EmployeeCertification",
    description: "Employee certifications",
  },
  "employee-emergency-contacts": {
    delegate: "employeeEmergencyContact",
    model: "EmployeeEmergencyContact",
    description: "Employee emergency contacts",
    searchFields: ["name", "relationship", "phone", "email"],
  },
  "employee-availabilities": {
    delegate: "employeeAvailability",
    model: "EmployeeAvailability",
    description: "Employee availability windows",
  },
  shifts: {
    delegate: "shift",
    model: "Shift",
    description: "Scheduled shifts",
    searchFields: ["title", "notes"],
  },
  "shift-assignments": {
    delegate: "shiftAssignment",
    model: "ShiftAssignment",
    description: "Shift employee assignments",
  },
  attendance: {
    delegate: "attendance",
    model: "Attendance",
    description: "Attendance records",
  },
  "leave-requests": {
    delegate: "leaveRequest",
    model: "LeaveRequest",
    description: "Employee leave requests",
    searchFields: ["reason", "reviewNote"],
  },
  conversations: {
    delegate: "conversation",
    model: "Conversation",
    description: "Conversations",
    searchFields: ["title"],
  },
  "conversation-participants": {
    delegate: "conversationParticipant",
    model: "ConversationParticipant",
    description: "Conversation participants",
  },
  messages: {
    delegate: "message",
    model: "Message",
    description: "Conversation messages",
    searchFields: ["body"],
  },
  "message-attachments": {
    delegate: "messageAttachment",
    model: "MessageAttachment",
    description: "Message attachments",
  },
  notifications: {
    delegate: "notification",
    model: "Notification",
    description: "Notifications",
    searchFields: ["title", "body"],
  },
  "inspection-templates": {
    delegate: "inspectionTemplate",
    model: "InspectionTemplate",
    description: "Inspection templates",
    searchFields: ["name", "description"],
  },
  "inspection-template-items": {
    delegate: "inspectionTemplateItem",
    model: "InspectionTemplateItem",
    description: "Inspection template items",
    searchFields: ["question", "instructions"],
  },
  inspections: {
    delegate: "inspection",
    model: "Inspection",
    description: "Inspections",
    searchFields: ["notes"],
  },
  "inspection-item-results": {
    delegate: "inspectionItemResult",
    model: "InspectionItemResult",
    description: "Inspection item results",
    searchFields: ["question", "notes"],
  },
  "customer-feedbacks": {
    delegate: "customerFeedback",
    model: "CustomerFeedback",
    description: "Customer feedback records",
    searchFields: ["comment"],
  },
  complaints: {
    delegate: "complaint",
    model: "Complaint",
    description: "Customer complaints",
    searchFields: ["title", "description", "resolution"],
  },
  "corrective-actions": {
    delegate: "correctiveAction",
    model: "CorrectiveAction",
    description: "Corrective actions",
    searchFields: ["title", "description"],
  },
  incidents: {
    delegate: "incident",
    model: "Incident",
    description: "Operational incidents",
    searchFields: ["title", "description", "resolution"],
  },
  invoices: {
    delegate: "invoice",
    model: "Invoice",
    description: "Invoices",
    searchFields: ["invoiceNumber", "notes"],
  },
  "invoice-items": {
    delegate: "invoiceItem",
    model: "InvoiceItem",
    description: "Invoice line items",
    searchFields: ["description"],
  },
  payments: {
    delegate: "payment",
    model: "Payment",
    description: "Payments",
    searchFields: ["paymentNumber", "reference", "notes"],
  },
  "tax-rates": {
    delegate: "taxRate",
    model: "TaxRate",
    description: "Tax rates",
    searchFields: ["name"],
  },
  attachments: {
    delegate: "attachment",
    model: "Attachment",
    description: "Shared attachments",
    searchFields: ["fileName", "description"],
  },
  comments: {
    delegate: "comment",
    model: "Comment",
    description: "Shared comments",
    searchFields: ["body"],
  },
  "audit-logs": {
    delegate: "auditLog",
    model: "AuditLog",
    description: "Audit logs",
    searchFields: ["action", "entityType", "entityId", "ipAddress"],
  },
  "system-settings": {
    delegate: "systemSetting",
    model: "SystemSetting",
    description: "Workspace system settings",
    searchFields: ["key", "category", "description"],
  },
  "background-jobs": {
    delegate: "backgroundJob",
    model: "BackgroundJob",
    description: "Background jobs",
    searchFields: ["lastError"],
  },
};

export type ResourceName = keyof typeof RESOURCE_DEFINITIONS;

export function isResourceName(resource: string): resource is ResourceName {
  return resource in RESOURCE_DEFINITIONS;
}
