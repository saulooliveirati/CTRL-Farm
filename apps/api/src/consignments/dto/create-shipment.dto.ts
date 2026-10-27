import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

export class ShipmentItemDto {
  @ApiPropertyOptional({ description: "ID do produto no catálogo CTRL-Farm" })
  @IsString()
  @IsOptional()
  productId?: string;

  @ApiProperty({ description: "Nome do produto", example: "Suporte Articulado para Fone" })
  @IsString()
  @IsNotEmpty()
  productName!: string;

  @ApiPropertyOptional({ description: "Código SKU do produto" })
  @IsString()
  @IsOptional()
  productSku?: string;

  @ApiProperty({ description: "Quantidade enviada", example: 10 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ description: "Custo de fabricação unitário", example: 12.5 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  costPrice?: number;

  @ApiPropertyOptional({ description: "Preço de venda sugerido ao público", example: 45.0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  suggestedPrice?: number;

  @ApiPropertyOptional({ description: "Preço de venda acordado", example: 45.0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  sellingPrice?: number;

  @ApiPropertyOptional({ description: "Preço mínimo de venda permitido na loja", example: 38.0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minPrice?: number;

  @ApiPropertyOptional({ description: "Percentual de comissão do parceiro (%)", example: 25.0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  commissionRate?: number;

  @ApiPropertyOptional({ description: "Tipo de comissão", default: "PERCENTAGE" })
  @IsString()
  @IsOptional()
  commissionType?: string;

  @ApiPropertyOptional({ description: "Observações específicas do item" })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateShipmentDto {
  @ApiProperty({ description: "ID do Parceiro Consignado" })
  @IsString()
  @IsNotEmpty()
  locationId!: string;

  @ApiPropertyOptional({ description: "Número de controle do envio (gerado automaticamente se omitido)" })
  @IsString()
  @IsOptional()
  shipmentNumber?: string;

  @ApiPropertyOptional({ description: "Data de envio dos produtos" })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ description: "Observações e instruções do lote de envio" })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: "Lista de itens enviados", type: [ShipmentItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShipmentItemDto)
  items!: ShipmentItemDto[];
}
