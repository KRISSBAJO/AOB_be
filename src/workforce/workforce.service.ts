import { BadRequestException, Injectable } from "@nestjs/common";
import { EmployeeStatus } from "@prisma/client";

import { getPagination, textSearch } from "../common/utils/pagination";
import { PrismaService } from "../prisma/prisma.service";
import { ListDepartmentsQueryDto, ListEmployeesQueryDto } from "./dto/workforce-query.dto";
import {
  AssignEmployeeCertificationDto,
  AssignEmployeeSkillDto,
  CreateCertificationDto,
  CreateDepartmentDto,
  CreateEmployeeDto,
  CreatePositionDto,
  CreateSkillDto,
  UpdateCertificationDto,
  UpdateDepartmentDto,
  UpdateEmployeeDto,
  UpdatePositionDto,
  UpdateSkillDto,
} from "./dto/workforce.dto";

@Injectable()
export class WorkforceService {
  constructor(private readonly prisma: PrismaService) {}

  async listDepartments(workspaceId: string, query: ListDepartmentsQueryDto) {
    const { skip, take } = getPagination(query);
    const search = textSearch(query.search, ["name", "description"]);
    const where = {
      workspaceId,
      ...(query.type ? { type: query.type } : {}),
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(search ? { OR: search } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.department.findMany({
        where,
        skip,
        take,
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
        include: { _count: { select: { employees: true, positions: true, shifts: true } } },
      }),
      this.prisma.department.count({ where }),
    ]);
    return { data, meta: { skip, take, total } };
  }

  createDepartment(workspaceId: string, dto: CreateDepartmentDto) {
    return this.prisma.department.create({
      data: { ...dto, workspaceId, name: dto.name.trim() },
    });
  }

  updateDepartment(workspaceId: string, id: string, dto: UpdateDepartmentDto) {
    return this.prisma.department.update({
      where: { id, workspaceId },
      data: { ...dto, name: dto.name?.trim() },
    });
  }

  deactivateDepartment(workspaceId: string, id: string) {
    return this.prisma.department.update({
      where: { id, workspaceId },
      data: { isActive: false },
    });
  }

  async listPositions(workspaceId: string) {
    return this.prisma.position.findMany({
      where: { workspaceId },
      orderBy: [{ isActive: "desc" }, { title: "asc" }],
      include: { department: { select: { id: true, name: true } } },
    });
  }

  async createPosition(workspaceId: string, dto: CreatePositionDto) {
    await this.assertDepartment(workspaceId, dto.departmentId);
    return this.prisma.position.create({
      data: { ...dto, workspaceId, title: dto.title.trim() },
      include: { department: { select: { id: true, name: true } } },
    });
  }

  async updatePosition(workspaceId: string, id: string, dto: UpdatePositionDto) {
    await this.assertDepartment(workspaceId, dto.departmentId);
    return this.prisma.position.update({
      where: { id, workspaceId },
      data: { ...dto, title: dto.title?.trim() },
    });
  }

  deactivatePosition(workspaceId: string, id: string) {
    return this.prisma.position.update({
      where: { id, workspaceId },
      data: { isActive: false },
    });
  }

  listSkills(workspaceId: string) {
    return this.prisma.skill.findMany({
      where: { workspaceId },
      orderBy: { name: "asc" },
    });
  }

  createSkill(workspaceId: string, dto: CreateSkillDto) {
    return this.prisma.skill.create({
      data: { ...dto, workspaceId, name: dto.name.trim() },
    });
  }

  updateSkill(workspaceId: string, id: string, dto: UpdateSkillDto) {
    return this.prisma.skill.update({
      where: { id, workspaceId },
      data: { ...dto, name: dto.name?.trim() },
    });
  }

  deleteSkill(workspaceId: string, id: string) {
    return this.prisma.skill.delete({ where: { id, workspaceId } });
  }

  listCertifications(workspaceId: string) {
    return this.prisma.certification.findMany({
      where: { workspaceId },
      orderBy: { name: "asc" },
    });
  }

  createCertification(workspaceId: string, dto: CreateCertificationDto) {
    return this.prisma.certification.create({
      data: { ...dto, workspaceId, name: dto.name.trim() },
    });
  }

  updateCertification(workspaceId: string, id: string, dto: UpdateCertificationDto) {
    return this.prisma.certification.update({
      where: { id, workspaceId },
      data: { ...dto, name: dto.name?.trim() },
    });
  }

  deleteCertification(workspaceId: string, id: string) {
    return this.prisma.certification.delete({ where: { id, workspaceId } });
  }

  async listEmployees(workspaceId: string, query: ListEmployeesQueryDto) {
    const { skip, take } = getPagination(query);
    const search = textSearch(query.search, ["employeeNumber", "firstName", "lastName", "email", "phone"]);
    const where = {
      workspaceId,
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.employmentType ? { employmentType: query.employmentType } : {}),
      ...(query.serviceLine ? { serviceLines: { has: query.serviceLine } } : {}),
      ...(search ? { OR: search } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip,
        take,
        orderBy: [{ status: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
        include: this.employeeInclude(),
      }),
      this.prisma.employee.count({ where }),
    ]);
    return { data, meta: { skip, take, total } };
  }

  async createEmployee(workspaceId: string, dto: CreateEmployeeDto) {
    await this.assertDepartment(workspaceId, dto.departmentId);
    await this.assertPosition(workspaceId, dto.positionId);
    this.assertEmploymentDates(dto.hireDate, dto.terminationDate);

    return this.prisma.employee.create({
      data: {
        ...dto,
        workspaceId,
        employeeNumber: dto.employeeNumber?.trim() || (await this.generateEmployeeNumber(workspaceId)),
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email: dto.email?.trim().toLowerCase(),
        hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
        terminationDate: dto.terminationDate ? new Date(dto.terminationDate) : undefined,
      },
      include: this.employeeInclude(),
    });
  }

  getEmployee(workspaceId: string, id: string) {
    return this.prisma.employee.findFirstOrThrow({
      where: { id, workspaceId },
      include: {
        ...this.employeeInclude(),
        skills: { include: { skill: true } },
        certifications: { include: { certification: true } },
      },
    });
  }

  async updateEmployee(workspaceId: string, id: string, dto: UpdateEmployeeDto) {
    await this.assertDepartment(workspaceId, dto.departmentId);
    await this.assertPosition(workspaceId, dto.positionId);
    this.assertEmploymentDates(dto.hireDate, dto.terminationDate);

    return this.prisma.employee.update({
      where: { id, workspaceId },
      data: {
        ...dto,
        employeeNumber: dto.employeeNumber?.trim(),
        firstName: dto.firstName?.trim(),
        lastName: dto.lastName?.trim(),
        email: dto.email?.trim().toLowerCase(),
        hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
        terminationDate: dto.terminationDate ? new Date(dto.terminationDate) : undefined,
      },
      include: this.employeeInclude(),
    });
  }

  terminateEmployee(workspaceId: string, id: string) {
    return this.prisma.employee.update({
      where: { id, workspaceId },
      data: { status: EmployeeStatus.TERMINATED, terminationDate: new Date() },
      include: this.employeeInclude(),
    });
  }

  async assignSkill(workspaceId: string, employeeId: string, dto: AssignEmployeeSkillDto) {
    await this.assertEmployee(workspaceId, employeeId);
    await this.prisma.skill.findFirstOrThrow({ where: { id: dto.skillId, workspaceId } });

    return this.prisma.employeeSkill.upsert({
      where: { employeeId_skillId: { employeeId, skillId: dto.skillId } },
      create: { workspaceId, employeeId, skillId: dto.skillId, level: dto.level },
      update: { level: dto.level },
      include: { skill: true },
    });
  }

  async assignCertification(
    workspaceId: string,
    employeeId: string,
    dto: AssignEmployeeCertificationDto,
  ) {
    await this.assertEmployee(workspaceId, employeeId);
    const certification = await this.prisma.certification.findFirstOrThrow({
      where: { id: dto.certificationId, workspaceId },
    });

    if (certification.expires && !dto.expiresAt) {
      throw new BadRequestException("expiresAt is required for expiring certifications");
    }

    return this.prisma.employeeCertification.create({
      data: {
        workspaceId,
        employeeId,
        certificationId: dto.certificationId,
        certificateNumber: dto.certificateNumber,
        issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        documentUrl: dto.documentUrl,
      },
      include: { certification: true },
    });
  }

  private employeeInclude() {
    return {
      department: { select: { id: true, name: true, type: true } },
      position: { select: { id: true, title: true } },
      _count: { select: { skills: true, certifications: true, shiftAssignments: true } },
    };
  }

  private async assertDepartment(workspaceId: string, departmentId?: string) {
    if (!departmentId) return;
    await this.prisma.department.findFirstOrThrow({ where: { id: departmentId, workspaceId } });
  }

  private async assertPosition(workspaceId: string, positionId?: string) {
    if (!positionId) return;
    await this.prisma.position.findFirstOrThrow({ where: { id: positionId, workspaceId } });
  }

  private async assertEmployee(workspaceId: string, employeeId: string) {
    await this.prisma.employee.findFirstOrThrow({ where: { id: employeeId, workspaceId } });
  }

  private assertEmploymentDates(hireDate?: string, terminationDate?: string) {
    if (hireDate && terminationDate && new Date(terminationDate) < new Date(hireDate)) {
      throw new BadRequestException("terminationDate cannot be earlier than hireDate");
    }
  }

  private async generateEmployeeNumber(workspaceId: string) {
    const prefix = "EMP";
    let sequence = (await this.prisma.employee.count({ where: { workspaceId } })) + 1;

    while (true) {
      const employeeNumber = `${prefix}-${String(sequence).padStart(5, "0")}`;
      const existing = await this.prisma.employee.findUnique({
        where: { workspaceId_employeeNumber: { workspaceId, employeeNumber } },
      });
      if (!existing) return employeeNumber;
      sequence += 1;
    }
  }
}
