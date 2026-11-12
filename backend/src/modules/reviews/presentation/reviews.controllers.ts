import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { SkipThrottle, Throttle } from "@nestjs/throttler";
import { z } from "zod";
import { AdminGuard } from "../../identity";
import { ZodPipe } from "../../../shared/infrastructure/http/zod.pipe";
import { ReviewsUseCases } from "../application/reviews.use-cases";

const SubmitBody = z.object({
  token: z.string().min(10, "Missing review token"),
  rating: z.coerce.number().int(),
  title: z.string().max(120).optional(),
  body: z.string().max(2000).optional(),
});
const ModerateBody = z.object({ status: z.enum(["approved", "rejected"]) });

@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsUseCases) {}

  @Post("reviews")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async submit(@Body(new ZodPipe(SubmitBody)) body: z.infer<typeof SubmitBody>) {
    await this.reviews.submit(body);
  }

  @Get("reviews/token/:token")
  token(@Param("token") token: string) {
    return this.reviews.describeToken(token);
  }

  @Get("reviews/showcase")
  @SkipThrottle()
  showcase(@Query("minRating") minRating?: string, @Query("limit") limit?: string) {
    return this.reviews.showcase(Number(minRating) || 4, Math.min(Number(limit) || 12, 50));
  }

  @Get("products/:slug/reviews")
  @SkipThrottle()
  forProduct(@Param("slug") slug: string) {
    return this.reviews.forProductSlug(slug);
  }
}

@Controller("admin/reviews")
@UseGuards(AdminGuard)
export class ReviewsAdminController {
  constructor(private readonly reviews: ReviewsUseCases) {}

  @Get()
  list(@Query("status") status?: string) {
    const s = status === "pending" || status === "approved" || status === "rejected" ? status : undefined;
    return this.reviews.moderationList(s);
  }

  @Patch(":id")
  moderate(@Param("id", ParseUUIDPipe) id: string, @Body(new ZodPipe(ModerateBody)) body: z.infer<typeof ModerateBody>) {
    return this.reviews.moderate(id, body.status);
  }
}
