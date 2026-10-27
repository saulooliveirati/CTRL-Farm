import { IsNotEmpty, IsString } from "class-validator";

export class ParseLinkDto {
  @IsString()
  @IsNotEmpty()
  url: string;
}
