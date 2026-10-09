import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID, MaxLength, MinLength, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";

export class CreateProductionDto {
  @ApiProperty({ example: "Suporte de parede - lote 1" })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty()
  @IsUUID()
  printerId!: string;

  @ApiProperty()
  @IsUUID()
  filamentId!: string;

  @ApiPropertyOptional({ description: "Pedido do cliente que originou esta produção" })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiProperty({ example: 45, description: "Consumo estimado em gramas" })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  plannedWeightG!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
