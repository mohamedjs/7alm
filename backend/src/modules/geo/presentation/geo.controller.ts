import { Controller, Get, UseGuards } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { N8nGuard } from "../../identity";
import { GeoQueries } from "../application/geo.use-cases";

@Controller()
@SkipThrottle()
export class GeoController {
  constructor(private readonly geo: GeoQueries) {}

  @Get("zones")
  zones() {
    return this.geo.zoneOptions();
  }

  @Get("n8n/zones")
  @UseGuards(N8nGuard)
  n8nZones() {
    return this.geo.zoneOptions();
  }
}
