import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ProductionStatus } from "@prisma/client";
import { IsEnum, IsInt, IsOptional, Min } from "class-validator";
import { Type } from "class-transformer";

export class UpdateProductionDto {
  @ApiProperty({ enum: ProductionStatus })
  @IsEnum(ProductionStatus)
  status!: ProductionStatus;

  @ApiPropertyOptional({ description: "Consumo real em gramas ao concluir" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  actualWeightG?: number;
}
