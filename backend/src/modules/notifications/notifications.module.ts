import { Module } from "@nestjs/common";
import { OrderingModule } from "../ordering";
import { ReviewsModule } from "../reviews";
import { OrderNotificationsHandler } from "./application/order-notifications.handler";
import { N8nOrderNotifier, ResendEmailSender } from "./infrastructure/notifiers";

/** Worker-only module: no HTTP surface. */
@Module({
  imports: [OrderingModule, ReviewsModule],
  providers: [N8nOrderNotifier, ResendEmailSender, OrderNotificationsHandler],
  exports: [OrderNotificationsHandler],
})
export class NotificationsModule {}
