import { Body, Controller, Delete, Get, HttpCode, Inject, Param, ParseUUIDPipe, Post, Put, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { AdminGuard } from "../../identity";
import { CustomersFacade } from "../../customers";
import { ZodPipe } from "../../../shared/infrastructure/http/zod.pipe";
import { nullableDate, nullableInt, nullableNumber } from "../../../shared/infrastructure/http/form-fields";
import { PromotionsAdmin, PromotionsFacade } from "../application/promotions.use-cases";

const ValidateBody = z.object({
  code: z.string({ message: "Coupon code is required" }).trim().min(1, "Coupon code is required"),
  subtotal: z.coerce.number({ message: "A valid subtotal is required" }).min(0, "A valid subtotal is required"),
  shippingCost: z.coerce.number().min(0).optional().default(0),
  phone: z.string().optional(),
});

const CouponBody = z.object({
  code: z.string().trim().min(2).max(40),
  type: z.enum(["percentage", "fixed", "free_shipping"]),
  value: z.coerce.number().min(0),
  min_order_total: z.coerce.number().min(0).optional(),
  max_discount: nullableNumber(),
  first_order_only: z.boolean().optional(),
  per_customer_limit: nullableInt(1),
  usage_limit: nullableInt(1),
  starts_at: nullableDate(),
  expires_at: nullableDate(),
  is_active: z.boolean().optional(),
});

@Controller("coupons")
export class CouponsPublicController {
  constructor(
    private readonly promotions: PromotionsFacade,
    @Inject(CustomersFacade) private readonly customers: CustomersFacade,
  ) {}

  /** Checkout preview. Always 200 with `{ valid, error? }` so the form can show the reason. */
  @Post("validate")
  @HttpCode(200)
  async validate(@Body(new ZodPipe(ValidateBody)) body: z.infer<typeof ValidateBody>) {
    const customer = body.phone?.trim() ? await this.customers.findByPhone(body.phone.trim()) : null;
    return this.promotions.evaluate({ code: body.code, subtotal: body.subtotal, shippingCost: body.shippingCost, customerId: customer?.id });
  }
}

@Controller("admin/coupons")
@UseGuards(AdminGuard)
export class CouponsAdminController {
  constructor(private readonly admin: PromotionsAdmin) {}

  @Get()
  list() {
    return this.admin.list();
  }

  @Post()
  create(@Body(new ZodPipe(CouponBody)) body: z.infer<typeof CouponBody>) {
    return this.admin.create(body);
  }

  @Put(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body(new ZodPipe(CouponBody.partial())) body: Partial<z.infer<typeof CouponBody>>) {
    return this.admin.update(id, body);
  }

  @Delete(":id")
  async remove(@Param("id", ParseUUIDPipe) id: string) {
    await this.admin.delete(id);
  }
}
