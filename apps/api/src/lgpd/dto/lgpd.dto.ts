import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class RecordConsentDto {
  @IsBoolean()
  accepted: boolean;

  @IsString()
  @IsNotEmpty()
  termVersion: string;
}

export class RequestAnonymizationDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
