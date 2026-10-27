import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateReleaseDto {
  @ApiProperty({ example: "v2.6.0", description: "Código da versão semântica" })
  @IsString()
  @IsNotEmpty()
  version: string;

  @ApiProperty({ example: "Atualização de Performance & Telemetria 3D" })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: "Melhorias substanciais no consumo de memória e latência de webhooks." })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: ["Suporte a novas impressoras Bambu P1S", "Correção na exibição de temperaturas"], isArray: true })
  @IsArray()
  changelog: string[];

  @ApiPropertyOptional({ example: false, description: "Indica se a atualização é obrigatória para funcionamento" })
  @IsBoolean()
  @IsOptional()
  isMandatory?: boolean;

  @ApiPropertyOptional({ example: false, description: "Indica atualização crítica de segurança" })
  @IsBoolean()
  @IsOptional()
  isCritical?: boolean;

  @ApiPropertyOptional({ example: "https://releases.ctrlfarm.com.br/v2.6.0.zip" })
  @IsString()
  @IsOptional()
  downloadUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  checksumSha256?: string;
}
