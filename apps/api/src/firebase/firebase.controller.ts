import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { FirebaseService } from "./firebase.service.js";
import { FirebaseMessagingService } from "./firebase-messaging.service.js";
import { FirebaseStorageService } from "./firebase-storage.service.js";
import { FirebaseSyncService } from "./firebase-sync.service.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import type { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface.js";

export class RegisterFcmTokenDto {
  @ApiProperty({ description: "Token FCM emitido pelo navegador", example: "f7zL...o9K" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  token: string;
}

@ApiTags("Firebase Cloud Services")
@Controller("firebase")
export class FirebaseController {
  constructor(
    private readonly firebase: FirebaseService,
    private readonly messaging: FirebaseMessagingService,
    private readonly storage: FirebaseStorageService,
    private readonly sync: FirebaseSyncService
  ) {}

  @Get("status")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Verifica status dos serviços integrados ao Firebase" })
  getStatus() {
    const isConfigured = this.firebase.isConfigured();
    const syncStats = this.sync.getSyncStats();
    return {
      configured: isConfigured,
      projectId: process.env.FIREBASE_PROJECT_ID || null,
      services: {
        storage: {
          available: isConfigured && Boolean(this.firebase.getStorage()),
          bucket: process.env.FIREBASE_STORAGE_BUCKET || null,
          mode: isConfigured ? "CLOUD_FIREBASE_STORAGE" : "LOCAL_DISK_FALLBACK",
        },
        firestore: {
          available: isConfigured && Boolean(this.firebase.getFirestore()),
          mode: isConfigured ? "CLOUD_FIRESTORE_REALTIME" : "LOCAL_SQL_POLLING",
        },
        messaging: {
          available: isConfigured && Boolean(this.firebase.getMessaging()),
          mode: isConfigured ? "FCM_WEBPUSH_ACTIVE" : "MOCK_LOCAL_NOTIFICATIONS",
        },
        sync: {
          available: true,
          status: syncStats.status,
          totalDocuments: syncStats.totalDocuments,
          lastSyncAt: syncStats.lastSyncAt,
          mode: syncStats.mode,
        },
      },
      syncStats,
      message: isConfigured
        ? "Firebase Cloud Suite conectado e operacional."
        : "Firebase em modo híbrido local. Para nuvem total, defina FIREBASE_PROJECT_ID no .env.",
    };
  }

  @Get("sync/status")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Consulta estatísticas da última sincronização de banco com Firebase" })
  getSyncStatus() {
    return this.sync.getSyncStats();
  }

  @Post("sync/all")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Transfere todo o banco de dados e dados da empresa para o Firebase Firestore" })
  async syncAll(@Req() req: any) {
    const user = req.user as AuthenticatedUser;
    // Administrador sincroniza tudo, outros papéis sincronizam o escopo da sua própria empresa
    const companyFilter = user.role === "ADMIN" ? undefined : user.companyId;
    const result = await this.sync.syncAll(companyFilter);
    return {
      success: result.status === "SUCCESS",
      ...result,
    };
  }

  @Post("fcm/register")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Registra token FCM do navegador do usuário para push notifications" })
  registerFcmToken(@Body() dto: RegisterFcmTokenDto, @Req() req: any) {
    const user = req.user as AuthenticatedUser;
    if (!dto?.token) return { success: false, message: "Token FCM é obrigatório." };

    this.messaging.registerToken(user.id, dto.token);
    if (user.companyId) {
      this.messaging.registerToken(user.companyId, dto.token);
    }

    return {
      success: true,
      message: "Token FCM registrado com sucesso para push notifications.",
    };
  }

  @Post("test-notification")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Envia notificação de teste via FCM/Firestore" })
  async sendTestNotification(@Req() req: any) {
    const user = req.user as AuthenticatedUser;
    const sent = await this.messaging.sendToTarget(user.id, {
      title: "CTRL+Farm Firebase",
      body: "Integração com Firebase Cloud Notifications validada com sucesso!",
    });

    return {
      success: true,
      deliveredDevices: sent,
      message: "Notificação de teste processada com sucesso.",
    };
  }
}
