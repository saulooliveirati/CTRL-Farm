import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CameraQuality } from "@prisma/client";
import { IsEnum, IsIP, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateCameraDto {
  @ApiProperty({ example: "Câmera Bancada A1" })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional({ example: "Bambu Lab A1" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  model?: string;

  @ApiProperty({ example: "192.168.1.80" })
  @IsIP("4")
  ipAddress!: string;

  @ApiPropertyOptional({ enum: CameraQuality, default: CameraQuality.HIGH })
  @IsOptional()
  @IsEnum(CameraQuality)
  quality?: CameraQuality;

  @ApiPropertyOptional({ example: "bblp" })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  username?: string;

  @ApiPropertyOptional({ example: "12345678" })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  password?: string;
}
