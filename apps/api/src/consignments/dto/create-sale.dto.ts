import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class CreateSaleDto {
  @ApiProperty({ description: "ID do parceiro onde a venda ocorreu" })
  @IsString()
  @IsNotEmpty()
  locationId!: string;

  @ApiPropertyOptional({ description: "ID do produto (se vinculado ao catálogo)" })
  @IsString()
  @IsOptional()
  productId?: string;

  @ApiProperty({ description: "Nome do produto vendido" })
  @IsString()
  @IsNotEmpty()
  productName!: string;

  @ApiProperty({ description: "Quantidade vendida", example: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ description: "Valor unitário bruto de venda praticado", example: 45.0 })
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiPropertyOptional({ description: "Desconto total aplicado na venda", default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number;

  @ApiPropertyOptional({ description: "Data da venda realizada" })
  @IsDateString()
  @IsOptional()
  saleDate?: string;

  @ApiPropertyOptional({ description: "Observações da venda" })
  @IsString()
  @IsOptional()
  notes?: string;
}
