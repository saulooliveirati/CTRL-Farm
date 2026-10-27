import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class AdminLoginDto {
  @ApiProperty({ example: "Administrador", description: "Nome de usuário ou e-mail administrativo" })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: "#Ef2ed688", description: "Senha administrativa do sistema" })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: "Refresh token para renovação de sessão" })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
