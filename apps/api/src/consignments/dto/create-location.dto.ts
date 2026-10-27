import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreateLocationDto {
  @ApiProperty({ description: "Nome do estabelecimento", example: "Livraria & Geek Store" })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ description: "Razão Social" })
  @IsString()
  @IsOptional()
  @MaxLength(150)
  corporateName?: string;

  @ApiPropertyOptional({ description: "Nome Fantasia" })
  @IsString()
  @IsOptional()
  @MaxLength(150)
  tradeName?: string;

  @ApiPropertyOptional({ description: "Responsável pelo contato" })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  contactPerson?: string;

  @ApiPropertyOptional({ description: "Telefone de contato" })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ description: "WhatsApp" })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  whatsapp?: string;

  @ApiPropertyOptional({ description: "E-mail comercial" })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: "CPF ou CNPJ do parceiro" })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  document?: string;

  @ApiPropertyOptional({ description: "CEP" })
  @IsString()
  @IsOptional()
  @MaxLength(15)
  zipCode?: string;

  @ApiPropertyOptional({ description: "Endereço completo" })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({ description: "Cidade" })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: "Estado (UF)" })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  state?: string;

  @ApiPropertyOptional({ description: "Latitude geográfica" })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ description: "Longitude geográfica" })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ description: "Perfil do Instagram" })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  instagram?: string;

  @ApiPropertyOptional({ description: "Página do Facebook" })
  @IsString()
  @IsOptional()
  @MaxLength(150)
  facebook?: string;

  @ApiPropertyOptional({ description: "Link do Google Maps" })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  googleMapsUrl?: string;

  @ApiPropertyOptional({ description: "URL do logotipo" })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  logoUrl?: string;

  @ApiPropertyOptional({ description: "Galeria de fotos do estabelecimento", type: [String] })
  @IsArray()
  @IsOptional()
  photos?: string[];

  @ApiPropertyOptional({ description: "Observações gerais" })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: "Status do parceiro", default: "ACTIVE" })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: "Comissão padrão (%) para este parceiro", default: 20 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  defaultCommissionRate?: number;

  @ApiPropertyOptional({ description: "Tipo de comissão", default: "PERCENTAGE" })
  @IsString()
  @IsOptional()
  defaultCommissionType?: string;

  @ApiPropertyOptional({ description: "Valor fixo de comissão (se aplicável)", default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  defaultCommissionValue?: number;
}
