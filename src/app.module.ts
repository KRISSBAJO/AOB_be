import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";

import { validateEnv } from "./config/env.validation";
import { OptionalApiKeyGuard } from "./common/guards/optional-api-key.guard";
import { RateLimitGuard } from "./common/guards/rate-limit.guard";
import { AuditLogInterceptor } from "./common/interceptors/audit-log.interceptor";
import { JsonSerializationInterceptor } from "./common/interceptors/json-serialization.interceptor";
import { PrismaExceptionFilter } from "./common/filters/prisma-exception.filter";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ResourcesModule } from "./resources/resources.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { WorkspacesModule } from "./workspaces/workspaces.module";
import { RolesModule } from "./roles/roles.module";
import { PermissionsModule } from "./permissions/permissions.module";
import { CustomersModule } from "./customers/customers.module";
import { ServicesModule } from "./services/services.module";
import { ContractsModule } from "./contracts/contracts.module";
import { ServiceRequestsModule } from "./service-requests/service-requests.module";
import { WorkOrdersModule } from "./work-orders/work-orders.module";
import { WorkforceModule } from "./workforce/workforce.module";
import { SchedulingModule } from "./scheduling/scheduling.module";
import { QaModule } from "./qa/qa.module";
import { IssuesModule } from "./issues/issues.module";
import { CommunicationsModule } from "./communications/communications.module";
import { BillingModule } from "./billing/billing.module";
import { FilesModule } from "./files/files.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { ReportsModule } from "./reports/reports.module";
import { AdminModule } from "./admin/admin.module";
import { PublicBookingsModule } from "./public-bookings/public-bookings.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    WorkspacesModule,
    RolesModule,
    PermissionsModule,
    CustomersModule,
    ServicesModule,
    ContractsModule,
    ServiceRequestsModule,
    WorkOrdersModule,
    WorkforceModule,
    SchedulingModule,
    QaModule,
    IssuesModule,
    CommunicationsModule,
    BillingModule,
    FilesModule,
    DashboardModule,
    ReportsModule,
    AdminModule,
    PublicBookingsModule,
    ResourcesModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: PrismaExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: JsonSerializationInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    {
      provide: APP_GUARD,
      useClass: OptionalApiKeyGuard,
    },
  ],
})
export class AppModule {}
