import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class ProductionFilamentItemDto {
  @ApiProperty({ description: "ID da bobina de filamento" })
  @IsUUID()
  filamentId!: string;

  @ApiPropertyOptional({ example: 1, description: "Slot do AMS (1-16)" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(16)
  slotNumber?: number;

  @ApiProperty({ example: 30, description: "Consumo estimado em gramas" })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  plannedWeightG!: number;
}

export class CreateProductionDto {
  @ApiProperty({ example: "Suporte de parede - lote 1" })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty()
  @IsUUID()
  printerId!: string;

  @ApiProperty({ description: "Bobina principal" })
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

  @ApiPropertyOptional({ example: 240, description: "Duração prevista em minutos" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(43200)
  plannedDurationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({
    type: () => [ProductionFilamentItemDto],
    description: "Lista de bobinas em caso de impressão multimaterial ou AMS",
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductionFilamentItemDto)
  filaments?: ProductionFilamentItemDto[];
}
