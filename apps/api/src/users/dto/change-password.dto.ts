import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

export class ChangePasswordDto {
  @ApiProperty({ description: "Senha atual de segurança" })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({ description: "Nova senha (mínimo de 6 caracteres)", minLength: 6 })
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  newPassword!: string;
}
