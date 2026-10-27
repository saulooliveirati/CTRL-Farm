import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

class FilamentLineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  stockId?: string;

  @ApiProperty({ example: "PLA · Marca · Azul" })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  material!: string;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000000)
  rollPrice!: number;

  @ApiProperty({ example: 1000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(1000000)
  rollWeightG!: number;

  @ApiProperty({ example: 45 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000000)
  consumptionG!: number;
}

class SupplyLineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  inventoryMaterialId?: string;

  @ApiProperty({ example: "Caixa para embalagem" })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: "un" })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  unit!: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(1000000)
  quantity!: number;

  @ApiProperty({ example: 2.5 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000000)
  unitCost!: number;
}

export class CreatePricingEstimateDto {
  @ApiProperty({ example: "Capa protetora v2" })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  productName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  printerId?: string;

  @ApiPropertyOptional({ example: "Shopee" })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  marketplace?: string;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(720)
  printHours!: number;

  @ApiProperty({ example: 45 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(59)
  printMinutes!: number;

  @ApiProperty({ example: 0.35 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(100)
  powerKw!: number;

  @ApiProperty({ example: 1.0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(100000)
  electricityPrice!: number;

  @ApiProperty({ example: 1.5 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100000)
  machineRatePerHour!: number;

  @ApiProperty({ example: 2.5 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100000)
  laborRatePerHour!: number;

  @ApiProperty({ enum: ["MARGIN", "MARKUP"] })
  @IsIn(["MARGIN", "MARKUP", "FIXED_PRICE"])
  marginType!: "MARGIN" | "MARKUP" | "FIXED_PRICE";

  @ApiPropertyOptional({ example: 49.9 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000000)
  fixedPrice?: number;

  @ApiPropertyOptional({ type: [String], example: ["Dinheiro", "Pix", "Débito", "Crédito"] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsIn(["Dinheiro", "Pix", "Débito", "Crédito"], { each: true })
  paymentOptions?: string[];

  @ApiProperty({ example: 30 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99.99)
  marginPercent!: number;

  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99.99)
  wastePercent!: number;

  @ApiProperty({ example: 16 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99.99)
  marketplaceFeePercent!: number;

  @ApiProperty({ example: 3.5 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99.99)
  paymentFeePercent!: number;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99.99)
  taxPercent!: number;

  @ApiProperty({ type: [FilamentLineDto] })
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => FilamentLineDto)
  filamentLines!: FilamentLineDto[];

  @ApiProperty({ type: [SupplyLineDto] })
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => SupplyLineDto)
  supplyLines!: SupplyLineDto[];
}
