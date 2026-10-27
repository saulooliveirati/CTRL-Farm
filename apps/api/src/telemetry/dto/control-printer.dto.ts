import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";

export enum ControlAction {
  SET_NOZZLE_TEMP = "SET_NOZZLE_TEMP",
  SET_BED_TEMP = "SET_BED_TEMP",
  SET_FAN_SPEED = "SET_FAN_SPEED",
  SET_SPEED_RATE = "SET_SPEED_RATE",
  TOGGLE_LIGHT = "TOGGLE_LIGHT",
  HOME_AXES = "HOME_AXES",
  MOVE_AXIS = "MOVE_AXIS",
  EXTRUDE = "EXTRUDE",
  PAUSE = "PAUSE",
  RESUME = "RESUME",
  CANCEL = "CANCEL",
  LOAD_FILAMENT = "LOAD_FILAMENT",
  UNLOAD_FILAMENT = "UNLOAD_FILAMENT",
  SELECT_SLOT = "SELECT_SLOT",
  SEND_GCODE = "SEND_GCODE",
}

export class ControlPrinterDto {
  @ApiProperty({ enum: ControlAction, example: ControlAction.SET_NOZZLE_TEMP })
  @IsEnum(ControlAction)
  action!: ControlAction;

  @ApiPropertyOptional({
    example: 210,
    description:
      "Valor numérico (temperatura do bico/mesa, velocidade do ventilador 0-100%, slot 1-4)",
  })
  @IsOptional()
  @IsNumber()
  value?: number;

  @ApiPropertyOptional({ example: "x", description: "Eixo de movimentação (x, y, z, e)" })
  @IsOptional()
  @IsString()
  axis?: string;

  @ApiPropertyOptional({ example: 10, description: "Distância em mm (positiva ou negativa)" })
  @IsOptional()
  @IsNumber()
  distance?: number;

  @ApiPropertyOptional({ example: "G28", description: "Comando G-code customizado" })
  @IsOptional()
  @IsString()
  gcode?: string;

  @ApiPropertyOptional({ example: 1, description: "Slot de filamento (1-4)" })
  @IsOptional()
  @IsNumber()
  slot?: number;
}
