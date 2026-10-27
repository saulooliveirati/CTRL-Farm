import { Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export enum MarketplaceSourceEnum {
  MERCADO_LIVRE = "MERCADO_LIVRE",
  SHOPEE = "SHOPEE",
  TIKTOK_SHOP = "TIKTOK_SHOP",
  AMAZON = "AMAZON",
  ETSY = "ETSY",
  ALIEXPRESS = "ALIEXPRESS",
  OTHER = "OTHER",
}

export class QueryMarketplaceProductsDto {
  @IsOptional()
  @IsEnum(MarketplaceSourceEnum)
  source?: MarketplaceSourceEnum;

  @IsOptional()
  @IsString()
  category3D?: string;

  @IsOptional()
  @IsString()
  material?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  minSalesPotential?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  minProfitPotential?: number;

  @IsOptional()
  @IsString()
  competitionLevel?: string;

  @IsOptional()
  @IsString()
  trend?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: "salesPotential" | "profitPotential" | "price" | "recent" | "competition";
}

export class NaturalLanguageQueryDto {
  @IsString()
  query!: string;

  @IsOptional()
  @IsString()
  targetPrinter?: string;
}

export class TriggerSyncDto {
  @IsOptional()
  @IsString()
  marketplace?: string = "ALL";

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
}

export class SimulateProfitDto {
  @IsString()
  productId!: string;

  @IsOptional()
  @IsNumber()
  filamentCostPerKg?: number = 110.0;

  @IsOptional()
  @IsInt()
  printTimeMinutes?: number;

  @IsOptional()
  @IsNumber()
  weightGrams?: number;

  @IsOptional()
  @IsNumber()
  hourlyMachineRate?: number = 1.5;

  @IsOptional()
  @IsNumber()
  marketplaceFeePercent?: number = 14.0;
}
