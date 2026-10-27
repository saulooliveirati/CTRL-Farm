import { ConflictException, Injectable, Logger } from "@nestjs/common";
import * as bcrypt from "bcrypt";

import { PrismaService } from "../../database/prisma.service.js";
import { FirebaseService } from "../../firebase/firebase.service.js";
import { RegisterDto } from "../dto/register.dto.js";

@Injectable()
export class RegisterService {
  private readonly logger = new Logger(RegisterService.name);
  private readonly admApiUrl = process.env.ADM_API_URL || "http://localhost:4001/api/v1";

  constructor(
    private readonly prisma: PrismaService,
    private readonly firebase: FirebaseService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException("Este e-mail já está cadastrado.");
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    try {
      const company = await this.prisma.company.create({
        data: {
          name: dto.companyName.trim(),
          users: {
            create: {
              name: dto.name.trim(),
              email,
              password: hashedPassword,
              role: "ADMIN",
            },
          },
        },
        select: {
          id: true,
          name: true,
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              active: true,
              createdAt: true,
            },
          },
        },
      });

      const user = company.users[0];

      // 1. Cria a licença individual vinculada estritamente ao novo usuário e sua empresa com status PENDING_ACTIVATION
      // Garante total isolamento: nenhum tenant herda ou visualiza licenças de outras empresas
      await this.prisma.userLicense.create({
        data: {
          userId: user.id,
          companyId: company.id,
          activationKey: "",
          planCode: "PENDING",
          planName: "Aguardando Ativação",
          status: "PENDING_ACTIVATION",
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          allowedFeatures: {},
          rsaSignature: "",
          autoUpdate: true,
          updateChannel: "STABLE",
        },
      });

      // 2. Registra a pendência no Firebase Firestore para desacoplamento e sincronização em tempo real
      try {
        const firestore = this.firebase.getFirestore();
        if (firestore) {
          const payload = {
            companyId: company.id,
            companyName: company.name,
            adminName: user.name,
            adminEmail: email,
            status: "PENDING",
            createdAt: new Date().toISOString(),
          };
          await firestore.collection("pending_registrations").doc(company.id).set(payload);
          await firestore.collection("pending_registrations").doc(email).set(payload);
          this.logger.log(`[Pending Registration] Gravado no Firestore para ${email} (Empresa: ${company.id})`);
        }
      } catch (fbErr: any) {
        this.logger.warn(`Falha ao registrar pendência no Firebase Firestore: ${fbErr.message}`);
      }

      // 3. Notifica o Sistema ADM Gerente via HTTP se estiver online
      try {
        await fetch(`${this.admApiUrl}/clients/pending-registration`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId: company.id,
            companyName: company.name,
            adminName: user.name,
            adminEmail: email,
            requestedAt: new Date().toISOString(),
          }),
          signal: AbortSignal.timeout(4000),
        });
        this.logger.log(`[Pending Registration] Notificação enviada ao ADM Gerente para ${email}`);
      } catch (admErr: any) {
        this.logger.warn(`Sistema ADM Gerente offline no momento da inscrição (pendência registrada no Firestore): ${admErr.message}`);
      }

      return company;
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Este e-mail já está cadastrado.");
      }

      throw error;
    }
  }
}
