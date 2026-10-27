import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "../../../node_modules/@prisma/adm-client/index.js";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log("Conectado com sucesso ao banco PostgreSQL do Sistema ADM Gerente (ctrlfarm_adm).");
    } catch (err) {
      this.logger.error(`Falha ao conectar no banco do Sistema ADM Gerente: ${err}`);
      throw err;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
