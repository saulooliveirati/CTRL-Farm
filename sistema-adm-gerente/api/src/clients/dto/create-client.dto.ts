import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateClientDto {
  @ApiProperty({ example: "Oficina 3D Pro LTDA" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: "Oficina 3D Pro" })
  @IsString()
  @IsOptional()
  tradeName?: string;

  @ApiPropertyOptional({ example: "48.291.902/0001-34" })
  @IsString()
  @IsOptional()
  document?: string;

  @ApiProperty({ example: "contato@oficina3dpro.com.br" })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ example: "(11) 98765-4321" })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: "Carlos Henrique" })
  @IsString()
  @IsOptional()
  contactPerson?: string;

  @ApiPropertyOptional({ example: "Cliente com 4 impressoras Bambu Lab." })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateClientDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  tradeName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  document?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  contactPerson?: string;

  @ApiPropertyOptional({ enum: ["ACTIVE", "PENDING", "SUSPENDED", "CANCELLED"] })
  @IsString()
  @IsOptional()
  status?: "ACTIVE" | "PENDING" | "SUSPENDED" | "CANCELLED";

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}


export class PendingRegistrationDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  companyId?: string;

  @ApiProperty({ example: "Minha Empresa 3D" })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({ example: "João da Silva" })
  @IsString()
  @IsNotEmpty()
  adminName: string;

  @ApiProperty({ example: "joao@empresa.com" })
  @IsEmail()
  @IsNotEmpty()
  adminEmail: string;

  @ApiPropertyOptional({ example: "(11) 99999-8888" })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  requestedAt?: string;
}

export class ApproveRegistrationDto {
  @ApiPropertyOptional({ example: "STARTER", default: "STARTER" })
  @IsString()
  @IsOptional()
  planCode?: string;

  @ApiPropertyOptional({ example: "MONTHLY", default: "MONTHLY" })
  @IsString()
  @IsOptional()
  billingCycle?: "MONTHLY" | "QUARTERLY" | "ANNUAL";

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  sendEmail?: boolean;
}
