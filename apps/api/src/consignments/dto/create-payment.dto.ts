import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export enum ConsignmentPaymentMethod {
  PIX = "PIX",
  DINHEIRO = "DINHEIRO",
  CARTAO = "CARTAO",
  TRANSFERENCIA = "TRANSFERENCIA",
}

export class CreatePaymentDto {
  @ApiProperty({ description: "ID do acerto financeiro (fechamento de contas)" })
  @IsString()
  @IsNotEmpty()
  settlementId!: string;

  @ApiProperty({ description: "Valor pago pelo parceiro", example: 350.0 })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({
    description: "Forma de pagamento utilizada",
    enum: ConsignmentPaymentMethod,
    example: ConsignmentPaymentMethod.PIX,
  })
  @IsEnum(ConsignmentPaymentMethod)
  method!: ConsignmentPaymentMethod;

  @ApiPropertyOptional({ description: "Data em que o pagamento foi realizado" })
  @IsDateString()
  @IsOptional()
  paymentDate?: string;

  @ApiPropertyOptional({ description: "Comprovante ou link do recibo" })
  @IsString()
  @IsOptional()
  receiptUrl?: string;

  @ApiPropertyOptional({ description: "Código de autorização ou ID da transação bancária" })
  @IsString()
  @IsOptional()
  transactionReference?: string;

  @ApiPropertyOptional({ description: "Observações do pagamento" })
  @IsString()
  @IsOptional()
  notes?: string;
}
