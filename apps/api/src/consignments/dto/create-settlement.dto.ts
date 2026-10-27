import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateSettlementDto {
  @ApiProperty({ description: "ID do parceiro para fechamento de acerto" })
  @IsString()
  @IsNotEmpty()
  locationId!: string;

  @ApiProperty({ description: "Início do período apurado" })
  @IsDateString()
  @IsNotEmpty()
  periodStart!: string;

  @ApiProperty({ description: "Fim do período apurado" })
  @IsDateString()
  @IsNotEmpty()
  periodEnd!: string;

  @ApiProperty({ description: "Data de vencimento para repasse financeiro" })
  @IsDateString()
  @IsNotEmpty()
  dueDate!: string;

  @ApiPropertyOptional({ description: "Observações do acerto" })
  @IsString()
  @IsOptional()
  notes?: string;
}
