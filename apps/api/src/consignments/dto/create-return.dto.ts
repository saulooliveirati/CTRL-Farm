import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class CreateReturnDto {
  @ApiProperty({ description: "ID do parceiro que está devolvendo os produtos" })
  @IsString()
  @IsNotEmpty()
  locationId!: string;

  @ApiPropertyOptional({ description: "ID do produto (se vinculado)" })
  @IsString()
  @IsOptional()
  productId?: string;

  @ApiProperty({ description: "Nome do produto devolvido" })
  @IsString()
  @IsNotEmpty()
  productName!: string;

  @ApiProperty({ description: "Quantidade devolvida", example: 2 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({
    description: "Indica se o produto retornou danificado/avariado",
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isDamaged?: boolean;

  @ApiPropertyOptional({ description: "Motivo ou observações sobre a devolução" })
  @IsString()
  @IsOptional()
  notes?: string;
}
