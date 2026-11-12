import { Injectable } from "@nestjs/common";
import type { Prisma } from "../../../generated/prisma/client";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import { iso, numOrNull } from "../../../shared/infrastructure/prisma/decimal";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const campaignDto = (c: any) => ({ ...c, daily_budget: numOrNull(c.daily_budget), created_at: iso(c.created_at), updated_at: iso(c.updated_at) });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const videoDto = (v: any) => ({ ...v, cost: numOrNull(v.cost), created_at: iso(v.created_at), updated_at: iso(v.updated_at), completed_at: iso(v.completed_at) });

@Injectable()
export class AiStudioRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listCampaigns(status?: string) {
    return (await this.prisma.adCampaign.findMany({ where: status ? { status } : {}, orderBy: { created_at: "desc" } })).map(campaignDto);
  }
  async campaign(id: string) {
    const c = await this.prisma.adCampaign.findUnique({ where: { id } });
    return c ? campaignDto(c) : null;
  }
  async createCampaign(data: Prisma.AdCampaignUncheckedCreateInput) {
    return campaignDto(await this.prisma.adCampaign.create({ data }));
  }
  async updateCampaign(id: string, data: Prisma.AdCampaignUncheckedUpdateInput) {
    return campaignDto(await this.prisma.adCampaign.update({ where: { id }, data }));
  }
  async createVideo(data: Prisma.AiVideoJobUncheckedCreateInput) {
    return videoDto(await this.prisma.aiVideoJob.create({ data }));
  }
  async video(id: string) {
    const v = await this.prisma.aiVideoJob.findUnique({ where: { id } });
    return v ? videoDto(v) : null;
  }
  async videoByOpenRouterId(id: string) {
    const v = await this.prisma.aiVideoJob.findFirst({ where: { openrouter_job_id: id } });
    return v ? videoDto(v) : null;
  }
  async updateVideo(id: string, data: Prisma.AiVideoJobUncheckedUpdateInput) {
    return videoDto(await this.prisma.aiVideoJob.update({ where: { id }, data }));
  }
  /** Unfinished jobs older than `minutes` — the poll fallback when a callback was missed. */
  async staleVideos(minutes: number) {
    const rows = await this.prisma.aiVideoJob.findMany({
      where: { status: { in: ["pending", "in_progress"] }, updated_at: { lt: new Date(Date.now() - minutes * 60_000) } },
      take: 20,
    });
    return rows.map(videoDto);
  }
}
