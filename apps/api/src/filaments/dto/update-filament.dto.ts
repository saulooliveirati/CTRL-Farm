import { PartialType } from "@nestjs/swagger";

import { CreateFilamentDto } from "./create-filament.dto.js";

export class UpdateFilamentDto extends PartialType(CreateFilamentDto) {}
