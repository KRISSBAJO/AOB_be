import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";

import { ListResourcesQueryDto } from "./dto/list-resources-query.dto";
import { ResourcesService } from "./resources.service";

@ApiTags("resources")
@ApiSecurity("api-key")
@Controller("resources")
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get()
  @ApiOperation({ summary: "List supported resource names" })
  listResourceDefinitions() {
    return this.resourcesService.listResourceDefinitions();
  }

  @Get(":resource")
  @ApiOperation({ summary: "List records for a resource" })
  @ApiParam({ name: "resource", example: "customers" })
  @ApiOkResponse({ description: "Paginated resource records" })
  listResource(
    @Param("resource") resource: string,
    @Query() query: ListResourcesQueryDto,
  ) {
    return this.resourcesService.list(resource, query);
  }

  @Post(":resource")
  @ApiOperation({ summary: "Create a resource record" })
  @ApiParam({ name: "resource", example: "customers" })
  @ApiBody({ schema: { type: "object", additionalProperties: true } })
  createResource(@Param("resource") resource: string, @Body() data: Record<string, unknown>) {
    return this.resourcesService.create(resource, data);
  }

  @Get(":resource/:id")
  @ApiOperation({ summary: "Get one resource record by id" })
  @ApiParam({ name: "resource", example: "customers" })
  @ApiParam({ name: "id", example: "ck..." })
  getResource(@Param("resource") resource: string, @Param("id") id: string) {
    return this.resourcesService.findOne(resource, id);
  }

  @Patch(":resource/:id")
  @ApiOperation({ summary: "Update one resource record by id" })
  @ApiParam({ name: "resource", example: "customers" })
  @ApiParam({ name: "id", example: "ck..." })
  @ApiBody({ schema: { type: "object", additionalProperties: true } })
  updateResource(
    @Param("resource") resource: string,
    @Param("id") id: string,
    @Body() data: Record<string, unknown>,
  ) {
    return this.resourcesService.update(resource, id, data);
  }

  @Delete(":resource/:id")
  @ApiOperation({ summary: "Delete one resource record by id" })
  @ApiParam({ name: "resource", example: "customers" })
  @ApiParam({ name: "id", example: "ck..." })
  deleteResource(@Param("resource") resource: string, @Param("id") id: string) {
    return this.resourcesService.delete(resource, id);
  }
}

