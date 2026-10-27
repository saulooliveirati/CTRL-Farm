import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export enum HardwareProtocol {
  MOONRAKER = "MOONRAKER",
  OCTOPRINT = "OCTOPRINT",
  FLASHFORGE = "FLASHFORGE",
  BAMBU = "BAMBU",
  BAMBU_MQTT = "BAMBU_MQTT",
}

export class ConfigureTelemetryDto {
  @ApiProperty({ example: "192.168.1.150", description: "IP local da impressora na rede" })
  @IsString()
  ipAddress!: string;

  @ApiProperty({ enum: HardwareProtocol, example: HardwareProtocol.MOONRAKER })
  @IsEnum(HardwareProtocol)
  protocol!: HardwareProtocol;

  @ApiPropertyOptional({
    example: 7125,
    description:
      "Porta do serviço (Moonraker: 7125, OctoPrint: 5000, Flashforge: 8899, Bambu: 8883)",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @ApiPropertyOptional({ description: "Chave de API (OctoPrint) ou Access Code (Bambu Lab)" })
  @IsOptional()
  @IsString()
  accessCode?: string;

  @ApiPropertyOptional({
    description: "Número de Série da impressora (obrigatório para Bambu Lab MQTT)",
    example: "01P00A000000000",
  })
  @IsOptional()
  @IsString()
  serialNumber?: string;
}

export class TestTelemetryDto {
  @ApiPropertyOptional({ example: "192.168.1.150" })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ enum: HardwareProtocol })
  @IsOptional()
  @IsEnum(HardwareProtocol)
  protocol?: HardwareProtocol;

  @ApiPropertyOptional({ example: 7125 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accessCode?: string;

  @ApiPropertyOptional({
    description: "Número de Série da impressora (obrigatório para Bambu Lab MQTT)",
    example: "01P00A000000000",
  })
  @IsOptional()
  @IsString()
  serialNumber?: string;
}
