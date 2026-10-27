import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import type { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface.js";
import { PrismaService } from "../database/prisma.service.js";
import { PrintersService } from "../printers/printers.service.js";
import { CreatePrinterDto } from "../printers/dto/create-printer.dto.js";
import { UpdatePrinterDto } from "../printers/dto/update-printer.dto.js";
import { FilamentsService } from "../filaments/filaments.service.js";
import { CreateFilamentDto } from "../filaments/dto/create-filament.dto.js";
import { UpdateFilamentDto } from "../filaments/dto/update-filament.dto.js";
import { CustomersService } from "../customers/customers.service.js";
import { CreateCustomerDto } from "../customers/dto/create-customer.dto.js";
import { UpdateCustomerDto } from "../customers/dto/update-customer.dto.js";
import { SuppliersService } from "../suppliers/suppliers.service.js";
import { CreateSupplierDto } from "../suppliers/dto/create-supplier.dto.js";
import { UpdateSupplierDto } from "../suppliers/dto/update-supplier.dto.js";
import { InventoryMaterialsService } from "../inventory-materials/inventory-materials.service.js";
import { CreateInventoryMaterialDto } from "../inventory-materials/dto/create-inventory-material.dto.js";
import { UpdateInventoryMaterialDto } from "../inventory-materials/dto/update-inventory-material.dto.js";
import { OrdersService } from "../orders/orders.service.js";
import { CreateOrderDto } from "../orders/dto/create-order.dto.js";
import { UpdateOrderDto } from "../orders/dto/update-order.dto.js";
import { ProductionService } from "../production/production.service.js";
import { CreateProductionDto } from "../production/dto/create-production.dto.js";
import { UpdateProductionDto } from "../production/dto/update-production.dto.js";
import { PricingService } from "../pricing/pricing.service.js";
import { CreatePricingEstimateDto } from "../pricing/dto/create-pricing-estimate.dto.js";
import { ProjectFilesService } from "../project-files/project-files.service.js";
import { CamerasService } from "../cameras/cameras.service.js";
import { UpdateCameraDto } from "../cameras/dto/update-camera.dto.js";
import { UpdateProjectFileDto } from "../project-files/dto/update-project-file.dto.js";

type Resource =
  | "printer"
  | "filament"
  | "customer"
  | "supplier"
  | "material"
  | "order"
  | "production"
  | "estimate"
  | "projectFile"
  | "camera";

type Operation = "create" | "update" | "delete" | "cancel";

export interface AiAction {
  resource: Resource;
  operation: Operation;
  id?: string;
  data?: Record<string, unknown>;
  summary: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const validators: Partial<
  Record<Resource, { create?: new () => object; update?: new () => object }>
> = {
  printer: { create: CreatePrinterDto, update: UpdatePrinterDto },
  filament: { create: CreateFilamentDto, update: UpdateFilamentDto },
  customer: { create: CreateCustomerDto, update: UpdateCustomerDto },
  supplier: { create: CreateSupplierDto, update: UpdateSupplierDto },
  material: {
    create: CreateInventoryMaterialDto,
    update: UpdateInventoryMaterialDto,
  },
  order: { create: CreateOrderDto, update: UpdateOrderDto },
  production: { create: CreateProductionDto, update: UpdateProductionDto },
  estimate: { create: CreatePricingEstimateDto },
  projectFile: { update: UpdateProjectFileDto },
  camera: { update: UpdateCameraDto },
};

const resourceLabel: Record<Resource, string> = {
  printer: "impressora",
  filament: "filamento",
  customer: "cliente",
  supplier: "fornecedor",
  material: "insumo",
  order: "orçamento/pedido",
  production: "produção",
  estimate: "simulação de preço",
  projectFile: "arquivo de projeto",
  camera: "câmera",
};

@Injectable()
export class AiFarmService {
  private readonly logger = new Logger(AiFarmService.name);
  private readonly geminiApiKey: string;
  private readonly primaryModel: string;
  private readonly fallbackModels: string[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly printers: PrintersService,
    private readonly filaments: FilamentsService,
    private readonly customers: CustomersService,
    private readonly suppliers: SuppliersService,
    private readonly materials: InventoryMaterialsService,
    private readonly orders: OrdersService,
    private readonly production: ProductionService,
    private readonly pricing: PricingService,
    private readonly files: ProjectFilesService,
    private readonly cameras: CamerasService,
  ) {
    this.geminiApiKey =
      config.get<string>("GEMINI_API_KEY") ??
      "AQ.Ab8RN6IdoHez-Jzwcj2ZqWA6nFpNkjrh4kDxsQ7Zz41pOFrl_g";
    this.primaryModel = config.get<string>("GEMINI_MODEL") ?? "gemini-3.5-flash";
    this.fallbackModels = [
      this.primaryModel,
      "gemini-3.5-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
    ];
  }

  async chat(user: AuthenticatedUser, rawMessages: unknown) {
    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
      throw new BadRequestException("Envie uma mensagem para o CTRL Bot.");
    }

    const messages = rawMessages.slice(-16).map((entry): ChatMessage => {
      if (!entry || typeof entry !== "object" || !("role" in entry) || !("content" in entry)) {
        throw new BadRequestException("Histórico da conversa inválido.");
      }
      const { role, content } = entry as { role: unknown; content: unknown };
      if (
        (role !== "user" && role !== "assistant") ||
        typeof content !== "string" ||
        content.length > 8000
      ) {
        throw new BadRequestException("Mensagem inválida ou muito longa.");
      }
      return { role, content };
    });

    const snapshot = await this.companySnapshot(user.companyId);
    const systemPrompt = this.buildSystemPrompt(user, snapshot);

    const geminiContents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // Deduplicate candidate models while maintaining priority order
    const modelQueue = Array.from(new Set(this.fallbackModels));

    let reply = "";
    let action: AiAction | null = null;
    let lastError: Error | null = null;

    for (const modelName of modelQueue) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.geminiApiKey}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: systemPrompt }],
            },
            contents: geminiContents,
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json",
            },
          }),
          signal: AbortSignal.timeout(35000),
        });

        if (response.status === 503 || response.status === 429) {
          this.logger.warn(
            `Modelo Gemini ${modelName} retornou status ${response.status} (alta demanda/rate limit). Aguardando 1s e tentando próximo modelo...`,
          );
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }

        if (!response.ok) {
          const errorPayload = (await response.json().catch(() => ({}))) as {
            error?: { message?: string };
          };
          const errorMsg = errorPayload.error?.message ?? `Status ${response.status}`;
          this.logger.warn(`Modelo ${modelName} falhou: ${errorMsg}`);
          continue;
        }

        const result = (await response.json()) as {
          candidates?: Array<{
            content?: {
              parts?: Array<{ text?: string }>;
            };
          }>;
        };

        const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
          this.logger.warn(`Modelo ${modelName} retornou conteúdo vazio.`);
          continue;
        }

        const cleaned = rawText
          .replace(/^```json\s*/i, "")
          .replace(/```\s*$/i, "")
          .trim();

        let parsed: { reply?: unknown; action?: unknown };
        try {
          parsed = JSON.parse(cleaned) as typeof parsed;
        } catch {
          this.logger.warn(`Modelo ${modelName} retornou JSON inválido: ${cleaned.slice(0, 100)}`);
          continue;
        }

        reply =
          typeof parsed.reply === "string" && parsed.reply.trim()
            ? parsed.reply.trim()
            : "Resposta processada com sucesso.";
        action = this.normalizeAction(parsed.action);
        break; // Sucesso com este modelo!
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        this.logger.warn(`Erro chamando ${modelName}: ${lastError.message}`);
      }
    }

    if (!reply) {
      if (lastError) {
        throw new ServiceUnavailableException(
          `O CTRL Bot (Google Gemini) está temporariamente indisponível: ${lastError.message}. Tente novamente em instantes.`,
        );
      }
      throw new BadGatewayException("Não foi possível obter resposta dos modelos Google Gemini.");
    }

    return { reply, action };
  }

  async execute(user: AuthenticatedUser, rawAction: unknown, confirmed: boolean) {
    if (!confirmed) throw new BadRequestException("Confirme a ação antes de executá-la.");
    if (user.role !== "ADMIN" && user.role !== "MANAGER") {
      throw new ForbiddenException(
        "Somente administradores e gerentes têm permissão para executar alterações pelo assistente CTRL Bot.",
      );
    }

    const action = this.normalizeAction(rawAction);
    if (!action) throw new BadRequestException("Ação inválida ou parâmetros incompletos.");

    const data = action.data ?? {};
    const validateDto = async (resource: Resource, operation: "create" | "update") => {
      const Dto = validators[resource]?.[operation];
      if (!Dto) {
        throw new BadRequestException(
          `O CTRL Bot não suporta a operação '${operation}' para '${resourceLabel[resource]}'.`,
        );
      }
      const instance = plainToInstance(Dto, data);
      const errors = await validate(instance, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      if (errors.length) {
        throw new BadRequestException(
          errors.flatMap((error) => Object.values(error.constraints ?? {})),
        );
      }
      return instance;
    };

    const id = action.id;
    const payload = async (resource: Resource, operation: "create" | "update") =>
      (await validateDto(resource, operation)) as never;

    switch (action.resource) {
      case "printer":
        return action.operation === "create"
          ? this.printers.create(user.companyId, await payload("printer", "create"))
          : action.operation === "update" && id
            ? this.printers.update(user.companyId, id, await payload("printer", "update"))
            : action.operation === "delete" && id
              ? this.printers.remove(user.companyId, id)
              : this.invalidAction();

      case "filament":
        return action.operation === "create"
          ? this.filaments.create(user.companyId, await payload("filament", "create"))
          : action.operation === "update" && id
            ? this.filaments.update(user.companyId, id, await payload("filament", "update"))
            : action.operation === "delete" && id
              ? this.filaments.remove(user.companyId, id)
              : this.invalidAction();

      case "customer":
        return action.operation === "create"
          ? this.customers.create(user.companyId, await payload("customer", "create"))
          : action.operation === "update" && id
            ? this.customers.update(user.companyId, id, await payload("customer", "update"))
            : action.operation === "delete" && id
              ? this.customers.remove(user.companyId, id)
              : this.invalidAction();

      case "supplier":
        return action.operation === "create"
          ? this.suppliers.create(user.companyId, await payload("supplier", "create"))
          : action.operation === "update" && id
            ? this.suppliers.update(user.companyId, id, await payload("supplier", "update"))
            : action.operation === "delete" && id
              ? this.suppliers.remove(user.companyId, id)
              : this.invalidAction();

      case "material":
        return action.operation === "create"
          ? this.materials.create(user.companyId, await payload("material", "create"))
          : action.operation === "update" && id
            ? this.materials.update(user.companyId, id, await payload("material", "update"))
            : action.operation === "delete" && id
              ? this.materials.remove(user.companyId, id)
              : this.invalidAction();

      case "order":
        return action.operation === "create"
          ? this.orders.create(user.companyId, await payload("order", "create"))
          : action.operation === "update" && id
            ? this.orders.update(user.companyId, id, await payload("order", "update"))
            : action.operation === "cancel" && id
              ? this.orders.cancel(user.companyId, id)
              : action.operation === "delete" && id
                ? this.orders.remove(user.companyId, id)
                : this.invalidAction();

      case "production":
        return action.operation === "create"
          ? this.production.create(user.companyId, await payload("production", "create"))
          : action.operation === "update" && id
            ? this.production.update(user.companyId, id, await payload("production", "update"))
            : action.operation === "delete" && id
              ? this.production.remove(user.companyId, id)
              : this.invalidAction();

      case "estimate":
        return action.operation === "create"
          ? this.pricing.create(user.companyId, await payload("estimate", "create"))
          : action.operation === "delete" && id
            ? this.pricing.remove(user.companyId, id)
            : this.invalidAction();

      case "projectFile":
        return action.operation === "update" && id
          ? this.files.update(user.companyId, id, await payload("projectFile", "update"))
          : action.operation === "delete" && id
            ? this.files.remove(user.companyId, id)
            : this.invalidAction();

      case "camera":
        return action.operation === "update" && id
          ? this.cameras.update(user.companyId, id, await payload("camera", "update"))
          : action.operation === "delete" && id
            ? this.cameras.remove(user.companyId, id)
            : this.invalidAction();

      default:
        return this.invalidAction();
    }
  }

  private buildSystemPrompt(
    user: AuthenticatedUser,
    snapshot: { company: string; data: Record<string, unknown> },
  ): string {
    const isAdminOrManager = user.role === "ADMIN" || user.role === "MANAGER";

    return [
      "Você é o **CTRL Bot** do CTRL+Farm, assistente de inteligência artificial de elite especializado em gestão de fazendas de impressão 3D (FDM, SLA, SLS), engenharia de fatiamento e manufatura aditiva.",
      "",
      "### SUAS COMPETÊNCIAS PRINCIPAIS:",
      "1. **Especialista em Impressão 3D e Engenharia de Materiais**:",
      "   - Conhecimento enciclopédico de filamentos: PLA, PLA+, PETG, ABS, ASA, TPU (flexíveis), PA/Nylon, PC (Policarbonato), HIPS, PVA, filamentos com fibra de carbono e madeira.",
      "   - Propriedades térmicas: temperaturas recomendadas de bico e mesa, uso de câmara aquecida/fechada (essencial para ABS/ASA/PC para evitar empenamento), fluxo de refrigeração e cuidados com higroscopia (secagem de filamentos).",
      "   - Fatiadores e parâmetros: Bambu Studio, OrcaSlicer, PrusaSlicer, Cura, FlashPrint, Anycubic Slicer. Dicas de orientação de peça, suportes (tree/tree hybrid vs linear), densidade e padrões de preenchimento (gyroid, honeycomb, grid), retração, costura (z-seam) e compensação dimensional.",
      "   - Diagnóstico e resolução de falhas: delaminação de camadas, empenamento (warping), fiapos (stringing), entupimento por calor (heat creep), under/over-extrusion, layer shift, z-banding, pata de elefante e adesão na mesa (PEI liso/texturizado, cola bastão, spray adesivo).",
      "",
      "2. **Cálculos e Precificação (Simples e Avançados)**:",
      "   - Custo de matéria-prima: Custo = (Preço_do_Rolo / Peso_Total_g) * Consumo_Peça_g.",
      "   - Consumo elétrico: Custo_Energia = (Potência_Impressora_W / 1000) * Horas_Impressão * Tarifa_kWh (use R$ 0,85/kWh se não informado).",
      "   - Depreciação e taxa horária da máquina: Depreciação = (Valor_Impressora / Vida_Útil_Horas) * Horas.",
      "   - Margem de lucro e preço sugerido: Precificação com margem líquida, markup, taxa de desperdício/falhas (ex: 5% a 10%) e impostos.",
      "   - Planejamento de insumos para lotes: Cálculo de quantas bobinas são necessárias para imprimir N peças de X gramas.",
      "",
      "3. **Planejamento e Otimização da Farm**:",
      "   - Escalonamento inteligente: distribuir trabalhos de impressão entre as máquinas disponíveis avaliando compatibilidade de bico (ex: 0.4mm vs 0.6mm), presença de AMS (multicolor), câmara fechada e fila de espera.",
      "   - Previsão de entrega e priorização de ordens de clientes.",
      "",
      "4. **Pesquisa Interna nos Dados da Empresa**:",
      "   - Você possui acesso total aos dados reais e atualizados da empresa do usuário (listados abaixo).",
      "   - Responda dúvidas sobre estoque, telemetria em tempo real, fila de produção, pedidos em aberto, clientes, impressoras ativas e manutenções com base nesses dados.",
      "",
      "5. **Operações no Sistema (Criação, Edição, Exclusão e Cancelamento)**:",
      `   - Usuário atual: ${user.name} (${user.email}). Perfil de acesso: ${user.role}.`,
      isAdminOrManager
        ? [
            "   - REGRA DE CRIAÇÃO/EDIÇÃO/EXCLUSÃO (ADMIN/MANAGER):",
            "     Quando o usuário solicitar cadastrar, criar, editar, atualizar, excluir ou cancelar um registro, você DEVE PREENCHER OBRIGATORIAMENTE o campo 'action' com o objeto da ação correspondente (NÃO deixe action=null nestes casos).",
            "     O frontend do CTRL+Farm exibirá uma caixa de confirmação visual com o botão 'Confirmar e Aplicar'.",
            "     Campos obrigatórios por recurso em create:",
            "       * filament: material ('PLA'|'PETG'|'ABS'|'ASA'|'TPU'|'NYLON'|'PC'|'OTHER'), brand (string), color (string), initialWeightG (number), currentWeightG (number), price (number), lot (opcional string).",
            "       * printer: name (string), model (string), manufacturer (string), nozzleMm (number, ex: 0.4), hasAms (boolean), location (opcional string).",
            "       * customer: name (string), email (opcional string), phone (opcional string), document (opcional string).",
            "       * supplier: name (string), email (opcional string), phone (opcional string), document (opcional string).",
            "       * material: name (string), category ('EQUIPMENT'|'CONSUMABLE'|'SPARE_PART'|'TOOL'|'PACKAGING'|'OTHER'), unit (string), currentQuantity (number), minimumQuantity (number), unitCost (number).",
            "       * order: description (string), quantity (number), unitPrice (number), customerId (UUID do cliente existente).",
            "       * production: name (string), printerId (UUID da impressora), filamentId (UUID do filamento), plannedWeightG (number).",
            "     Para update e delete: forneça o 'id' real do registro existente no contexto. Para update, 'data' deve conter os campos a alterar.",
          ].join("\n")
        : `   - ATENÇÃO DE PERMISSÃO: O usuário possui perfil '${user.role}' (somente-leitura para alterações estruturais). Responda detalhadamente às dúvidas, faça cálculos e planos, mas NÃO gere alterações no banco (mantenha action=null). Se ele pedir para criar/editar/excluir, explique educadamente que seu perfil não possui privilégio de escrita.`,
      "   - Formato de 'action': { 'resource': 'printer'|'filament'|'customer'|'supplier'|'material'|'order'|'production'|'estimate'|'projectFile'|'camera', 'operation': 'create'|'update'|'delete'|'cancel', 'id': string (para update/delete/cancel), 'data': object (para create/update), 'summary': 'resumo claro em português' }.",
      "   - Se o usuário não pediu alteração, ou faltam dados essenciais, defina action=null e pergunte o que falta.",
      "",
      "### FORMATO DE SAÍDA OBRIGATÓRIO:",
      "Retorne SEMPRE um JSON estrito seguindo um destes dois modelos:",
      "",
      "MODELO 1 (Quando o usuário pediu para cadastrar, criar, editar, alterar ou excluir um registro):",
      "{",
      '  "reply": "Explicação em Markdown para o usuário detalhando o que foi preparado.",',
      '  "action": {',
      '    "resource": "filament",',
      '    "operation": "create",',
      '    "data": { "material": "PLA", "brand": "Marca", "color": "Cor", "initialWeightG": 1000, "currentWeightG": 1000, "price": 120 },',
      '    "summary": "Cadastrar filamento PLA Cor Marca 1000g por R$ 120,00"',
      "  }",
      "}",
      "",
      "MODELO 2 (Quando o usuário faz uma pergunta, consulta, diagnóstico, cálculo ou planejamento):",
      "{",
      '  "reply": "Resposta técnica completa em Markdown rico com tópicos, tabelas ou cálculos.",',
      '  "action": null',
      "}",
      "",
      `### DADOS OPERACIONAIS DA EMPRESA (${snapshot.company}):`,
      JSON.stringify(snapshot.data),
    ].join("\n");
  }

  private normalizeAction(value: unknown): AiAction | null {
    if (value === null || value === undefined) return null;
    if (typeof value !== "object" || Array.isArray(value)) return null;
    const action = value as Record<string, unknown>;
    const resources: Resource[] = [
      "printer",
      "filament",
      "customer",
      "supplier",
      "material",
      "order",
      "production",
      "estimate",
      "projectFile",
      "camera",
    ];
    const operations: Operation[] = ["create", "update", "delete", "cancel"];
    if (
      !resources.includes(action.resource as Resource) ||
      !operations.includes(action.operation as Operation)
    ) {
      return null;
    }
    if (action.id !== undefined && (typeof action.id !== "string" || action.id.length > 80)) {
      return null;
    }
    if (
      action.data !== undefined &&
      (typeof action.data !== "object" || action.data === null || Array.isArray(action.data))
    ) {
      return null;
    }
    const data = action.data as Record<string, unknown> | undefined;
    if (
      data &&
      (JSON.stringify(data).length > 20000 ||
        Object.keys(data).some((key) => /password|cipher|streamPath/i.test(key)))
    ) {
      return null;
    }
    const resource = action.resource as Resource;
    const operation = action.operation as Operation;
    const id = typeof action.id === "string" ? action.id : undefined;
    const hasData = Boolean(data && Object.keys(data).length);
    const allowedOperations: Record<Resource, Operation[]> = {
      printer: ["create", "update", "delete"],
      filament: ["create", "update", "delete"],
      customer: ["create", "update", "delete"],
      supplier: ["create", "update", "delete"],
      material: ["create", "update", "delete"],
      order: ["create", "update", "delete", "cancel"],
      production: ["create", "update", "delete"],
      estimate: ["create", "delete"],
      projectFile: ["update", "delete"],
      camera: ["update", "delete"],
    };
    if (!allowedOperations[resource].includes(operation)) return null;
    if (operation === "create" && !hasData) return null;
    if (operation === "update" && (!id || !hasData)) return null;
    if ((operation === "delete" || operation === "cancel") && !id) return null;
    return {
      resource,
      operation,
      ...(id ? { id } : {}),
      ...(data ? { data } : {}),
      summary:
        typeof action.summary === "string"
          ? action.summary.slice(0, 400)
          : `${String(action.operation)} ${resourceLabel[action.resource as Resource]}`,
    };
  }

  private async companySnapshot(companyId: string) {
    const [
      company,
      printers,
      filaments,
      suppliers,
      customers,
      materials,
      orders,
      jobs,
      estimates,
      files,
      cameras,
    ] = await Promise.all([
      this.prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true },
      }),
      this.prisma.printer.findMany({
        where: { companyId },
        take: 80,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          manufacturer: true,
          model: true,
          status: true,
          usageHours: true,
          nozzleMm: true,
          extruderCount: true,
          hasAms: true,
          location: true,
          protocol: true,
          ipAddress: true,
          bedTemp: true,
          targetBedTemp: true,
          nozzleTemp: true,
          targetNozzleTemp: true,
          progressPercent: true,
          currentLayer: true,
          totalLayers: true,
          lastTelemetryAt: true,
        },
      }),
      this.prisma.filament.findMany({
        where: { companyId },
        take: 120,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          material: true,
          brand: true,
          color: true,
          initialWeightG: true,
          currentWeightG: true,
          price: true,
          lot: true,
          supplier: { select: { name: true } },
        },
      }),
      this.prisma.supplier.findMany({
        where: { companyId },
        take: 100,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          document: true,
          email: true,
          phone: true,
        },
      }),
      this.prisma.customer.findMany({
        where: { companyId },
        take: 100,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          document: true,
          _count: { select: { orders: true } },
        },
      }),
      this.prisma.inventoryMaterial.findMany({
        where: { companyId },
        take: 120,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          category: true,
          unit: true,
          currentQuantity: true,
          minimumQuantity: true,
          unitCost: true,
          supplier: { select: { name: true } },
        },
      }),
      this.prisma.customerOrder.findMany({
        where: { companyId },
        take: 100,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          description: true,
          quantity: true,
          unitPrice: true,
          totalAmount: true,
          status: true,
          dueAt: true,
          customer: { select: { name: true } },
          productionJobs: { select: { id: true, name: true, status: true } },
        },
      }),
      this.prisma.productionJob.findMany({
        where: { companyId, archivedAt: null },
        take: 100,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          status: true,
          plannedWeightG: true,
          actualWeightG: true,
          plannedDurationMinutes: true,
          actualDurationSeconds: true,
          startedAt: true,
          activeSince: true,
          printer: { select: { name: true } },
          filament: { select: { material: true, brand: true, color: true } },
          order: { select: { description: true } },
        },
      }),
      this.prisma.pricingEstimate.findMany({
        where: { companyId },
        take: 100,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          productName: true,
          totalCost: true,
          suggestedPrice: true,
          estimatedProfit: true,
          createdAt: true,
        },
      }),
      this.prisma.projectFile.findMany({
        where: { companyId },
        take: 100,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          projectName: true,
          version: true,
          category: true,
          originalName: true,
          sizeBytes: true,
          tags: true,
        },
      }),
      this.prisma.camera.findMany({
        where: { companyId },
        take: 50,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          model: true,
          ipAddress: true,
          quality: true,
          streamConfigured: true,
        },
      }),
    ]);

    return {
      company: company?.name ?? "CTRL+Farm",
      data: {
        printers,
        filaments,
        suppliers,
        customers,
        materials,
        orders,
        production: jobs,
        estimates,
        projectFiles: files,
        cameras,
      },
    };
  }

  private invalidAction(): never {
    throw new BadRequestException(
      "Esta ação não é compatível com os dados ou operações permitidas do CTRL+Farm.",
    );
  }
}
