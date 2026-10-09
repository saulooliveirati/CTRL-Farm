import { Controller, Get } from "@nestjs/common";
import { CompanyService } from "./company.service.js";

@Controller("companies")
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  async findAll() {
    return this.companyService.findAll();
  }
}