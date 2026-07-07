import { Body, Controller, Post, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Request } from "express";

import { PublicRoute } from "../common/decorators/public-route.decorator";
import {
  CreatePublicServiceBookingDto,
  LookupPublicServiceBookingDto,
} from "./dto/public-booking.dto";
import { PublicBookingsService } from "./public-bookings.service";

@ApiTags("public-service-bookings")
@PublicRoute()
@Controller("public/service-bookings")
export class PublicBookingsController {
  constructor(private readonly publicBookingsService: PublicBookingsService) {}

  @Post()
  create(@Body() dto: CreatePublicServiceBookingDto, @Req() request: Request) {
    return this.publicBookingsService.create(dto, {
      ipAddress: request.ip,
      userAgent: request.header("user-agent"),
    });
  }

  @Post("status")
  lookup(@Body() dto: LookupPublicServiceBookingDto) {
    return this.publicBookingsService.lookup(dto);
  }
}
