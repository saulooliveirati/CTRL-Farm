import { PrismaClient } from "../node_modules/@prisma/adm-client";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";

const prisma = new PrismaClient();

function canonicalJsonStringify(obj: any): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalJsonStringify).join(",") + "]";
  }
  const keys = Object.keys(obj).sort();
  const pairs = keys.map((k) => JSON.stringify(k) + ":" + canonicalJsonStringify(obj[k]));
  return "{" + pairs.join(",") + "}";
}

async function main() {
  console.log("Iniciando limpeza e preparação do Sistema ADM Gerente (Produção)...");

  // 1. Limpeza de todos os dados de teste
  await prisma.licenseValidationLog.deleteMany({});
  await prisma.license.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.auditLog.deleteMany({});
  console.log("✓ Todos os dados de teste (clientes, assinaturas, licenças e logs) foram limpos.");

  // 2. Criar ou Atualizar Usuário Administrador
  const passwordHash = await bcrypt.hash("#Ef2ed688", 10);
  const admin = await prisma.adminUser.upsert({
    where: { username: "Administrador" },
    update: {
      password: passwordHash,
      role: "OWNER",
      active: true,
    },
    create: {
      username: "Administrador",
      name: "Administrador Geral",
      email: "admin@ctrlfarm.com.br",
      password: passwordHash,
      role: "OWNER",
      active: true,
    },
  });
  console.log(`✓ Usuário Administrador configurado: ${admin.username} (Role: ${admin.role})`);

  // 3. Configurar os 6 Planos Oficiais do CTRL-Farm
  const plans = [
    {
      code: "STARTER",
      name: "Plano Starter",
      description: "Ideal para iniciantes e hobistas na impressão 3D.",
      monthlyPrice: 15.0,
      quarterlyPrice: 40.5,
      annualPrice: 144.0,
      maxUsers: 1,
      maxCompanies: 1,
      maxPrinters: 2,
      isPublic: true,
      isTrial: false,
      trialDays: 0,
      features: {
        users: 1,
        companies: 1,
        printers: 2,
        products: true,
        filaments: true,
        basicStock: true,
        basicCosts: true,
        simpleDashboard: true,
        production: false,
        marketplace: false,
        permissions: false,
        multiCompany: false,
        api: false,
        advancedReports: false,
      },
    },
    {
      code: "PROFESSIONAL",
      name: "Plano Professional",
      description: "Para pequenos estúdios e empreendedores da impressão 3D.",
      monthlyPrice: 39.9,
      quarterlyPrice: 107.7,
      annualPrice: 383.0,
      maxUsers: 5,
      maxCompanies: 1,
      maxPrinters: 10,
      isPublic: true,
      isTrial: false,
      trialDays: 0,
      features: {
        users: 5,
        companies: 1,
        printers: 10,
        products: true,
        filaments: true,
        basicStock: true,
        basicCosts: true,
        simpleDashboard: true,
        orders: true,
        customers: true,
        basicFinancial: true,
        reports: true,
        marketplace: true,
        production: false,
        permissions: false,
        multiCompany: false,
        api: false,
        advancedReports: false,
      },
    },
    {
      code: "BUSINESS",
      name: "Plano Business",
      description: "Para fazendas de impressão profissionais com alta escala e múltiplos operadores.",
      monthlyPrice: 89.9,
      quarterlyPrice: 242.7,
      annualPrice: 863.0,
      maxUsers: -1,
      maxCompanies: -1,
      maxPrinters: -1,
      isPublic: true,
      isTrial: false,
      trialDays: 0,
      features: {
        users: -1,
        companies: -1,
        printers: -1,
        products: true,
        filaments: true,
        basicStock: true,
        orders: true,
        customers: true,
        financialComplete: true,
        production: true,
        permissions: true,
        api: true,
        advancedReports: true,
        marketplace: true,
        multiCompany: true,
      },
    },
    {
      code: "ENTERPRISE",
      name: "Plano Enterprise",
      description: "Solução customizada para indústrias, franquias e operações de larga escala.",
      monthlyPrice: 249.0,
      quarterlyPrice: 672.0,
      annualPrice: 2390.0,
      maxUsers: -1,
      maxCompanies: -1,
      maxPrinters: -1,
      isPublic: true,
      isTrial: false,
      trialDays: 0,
      features: {
        allResources: true,
        users: -1,
        companies: -1,
        printers: -1,
        dedicatedSupport: true,
        customIntegrations: true,
        api: true,
        production: true,
        marketplace: true,
        allModules: true,
      },
    },
    {
      code: "TRIAL",
      name: "Plano Trial (7 Dias Grátis)",
      description: "Experimentação completa com recursos do plano Professional por 7 dias.",
      monthlyPrice: 0.0,
      quarterlyPrice: 0.0,
      annualPrice: 0.0,
      maxUsers: 5,
      maxCompanies: 1,
      maxPrinters: 10,
      isPublic: true,
      isTrial: true,
      trialDays: 7,
      features: {
        trialDays: 7,
        autoExpire: true,
        allProfessionalFeatures: true,
        users: 5,
        companies: 1,
        printers: 10,
        orders: true,
        reports: true,
        marketplace: true,
      },
    },
    {
      code: "UNLIMITED_OWNER",
      name: "Plano Unlimited Owner (Privado)",
      description: "Plano interno exclusivo do proprietário. Acesso total irrevogável sem limites.",
      monthlyPrice: 0.0,
      quarterlyPrice: 0.0,
      annualPrice: 0.0,
      maxUsers: -1,
      maxCompanies: -1,
      maxPrinters: -1,
      isPublic: false,
      isTrial: false,
      trialDays: 0,
      features: {
        unlimited: true,
        allResources: true,
        users: -1,
        companies: -1,
        printers: -1,
        masterKey: true,
        noLimits: true,
      },
    },
  ];

  for (const plan of plans) {
    const createdPlan = await prisma.plan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan,
    });
    console.log(`✓ Plano configurado: ${createdPlan.name} (${createdPlan.code})`);
  }

  // 4. Atualização Oficial Cadastrada no ADM
  await prisma.updateRelease.upsert({
    where: { version: "v2.5.0" },
    update: {
      title: "Lançamento Oficial Marketplace Intelligence & Controle de Licenciamento",
      description: "Nova versão com monitoramento diário Shopee, Mercado Livre e TikTok Shop, gestão inteligente de preços e integração criptografada com Sistema ADM Gerente.",
      changelog: [
        "Módulo Marketplace Intelligence com inteligência preditiva e simulação de lucros.",
        "Novo layout escuro moderno com visualização Top 5 e catálogo de oportunidades 3D.",
        "Integração criptográfica RSA 4096-bit com Sistema ADM Gerente para controle de licenças.",
        "Área de controle de atualização com suporte a canal Automático e Manual.",
        "Melhorias de desempenho, telemetria de impressoras 3D e validação offline segura.",
      ],
      isMandatory: false,
      isCritical: false,
      status: "PUBLISHED",
    },
    create: {
      version: "v2.5.0",
      title: "Lançamento Oficial Marketplace Intelligence & Controle de Licenciamento",
      description: "Nova versão com monitoramento diário Shopee, Mercado Livre e TikTok Shop, gestão inteligente de preços e integração criptografada com Sistema ADM Gerente.",
      releaseDate: new Date(),
      isMandatory: false,
      isCritical: false,
      changelog: [
        "Módulo Marketplace Intelligence com inteligência preditiva e simulação de lucros.",
        "Novo layout escuro moderno com visualização Top 5 e catálogo de oportunidades 3D.",
        "Integração criptográfica RSA 4096-bit com Sistema ADM Gerente para controle de licenças.",
        "Área de controle de atualização com suporte a canal Automático e Manual.",
        "Melhorias de desempenho, telemetria de impressoras 3D e validação offline segura.",
      ],
      status: "PUBLISHED",
    },
  });
  console.log("✓ Release oficial v2.5.0 cadastrada.");

  // 5. Configurações Globais do Sistema ADM
  await prisma.systemSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      companyName: "CTRL-Farm Tecnologia do Brasil",
      tradeName: "CTRL-Farm 3D Intelligence Platform",
      document: "48.291.902/0001-34",
      supportEmail: "suporte@ctrlfarm.com.br",
      supportPhone: "(11) 98765-4321",
      defaultOfflineGraceDays: 7,
      autoGenerateLicenseOnPayment: true,
      autoRenewSubscription: true,
      notifyExpiringLicensesDays: 15,
    },
  });
  console.log("✓ Configurações Globais do ADM Gerente inicializadas.");

  // 6. Gateways de Pagamento (Mercado Pago, PagSeguro, InfinitePay, Asaas)
  const gateways = [
    {
      provider: "MERCADO_PAGO",
      name: "Mercado Pago",
      description: "Gateway líder da América Latina com suporte completo a PIX Dinâmico, Cartão de Crédito/Débito e Boleto Bancário.",
      enabled: false,
      isSandbox: true,
      credentials: {
        accessToken: "",
        publicKey: "",
        webhookSecret: "",
      },
      acceptedMethods: ["PIX", "CREDIT_CARD", "DEBIT_CARD", "BOLETO"],
      webhookEndpoint: "/api/v1/payments/webhook/mercado-pago",
    },
    {
      provider: "PAGSEGURO",
      name: "PagBank / PagSeguro",
      description: "Infraestrutura UOL PagBank com conciliação automática, antifraude integrado, PIX, Cartões e Boletos.",
      enabled: false,
      isSandbox: true,
      credentials: {
        token: "",
        appId: "",
        publicKey: "",
      },
      acceptedMethods: ["PIX", "CREDIT_CARD", "BOLETO"],
      webhookEndpoint: "/api/v1/payments/webhook/pagseguro",
    },
    {
      provider: "INFINITEPAY",
      name: "InfinitePay Cloud",
      description: "Taxas ultracompetitivas com liquidação em tempo real, PIX dinâmico imediato e checkout transparente de cartões.",
      enabled: false,
      isSandbox: true,
      credentials: {
        apiKey: "",
        clientSecret: "",
        walletId: "",
        pixKey: "",
      },
      acceptedMethods: ["PIX", "CREDIT_CARD", "DEBIT_CARD"],
      webhookEndpoint: "/api/v1/payments/webhook/infinitepay",
    },
    {
      provider: "ASAAS",
      name: "Asaas Gestão de Assinaturas",
      description: "Plataforma focada em cobranças recorrentes, automação de réguas de cobrança via WhatsApp, PIX e Cartões.",
      enabled: false,
      isSandbox: true,
      credentials: {
        apiKey: "",
        walletId: "",
      },
      acceptedMethods: ["PIX", "CREDIT_CARD", "BOLETO"],
      webhookEndpoint: "/api/v1/payments/webhook/asaas",
    },
  ];

  for (const gw of gateways) {
    await prisma.paymentGatewayConfig.upsert({
      where: { provider: gw.provider },
      update: {
        name: gw.name,
        description: gw.description,
        acceptedMethods: gw.acceptedMethods,
        webhookEndpoint: gw.webhookEndpoint,
      },
      create: gw,
    });
    console.log(`✓ Gateway configurado: ${gw.name} (${gw.provider})`);
  }

  // 7. Registro de Auditoria Limpo Inicial
  await prisma.auditLog.create({
    data: {
      action: "SYSTEM_INITIALIZED",
      performedBy: admin.username,
      adminUserId: admin.id,
      targetType: "SYSTEM",
      details: {
        message: "Sistema ADM Gerente limpo e inicializado com configurações e gateways.",
      },
    },
  });
  console.log("✓ Log inicial de auditoria registrado.");

  console.log("\n🎉 Sistema ADM Gerente 100% LIMPO e pronto para operação oficial!");
}

main()
  .catch((e) => {
    console.error("Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
