export type Locale = "pt-BR" | "en" | "es" | "fr" | "de";

export interface LanguageOption {
  code: Locale;
  label: string;
  shortLabel: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "pt-BR", label: "Português (Brasil)", shortLabel: "PT-BR", flag: "🇧🇷" },
  { code: "en", label: "English (US)", shortLabel: "EN", flag: "🇺🇸" },
  { code: "es", label: "Español", shortLabel: "ES", flag: "🇪🇸" },
  { code: "fr", label: "Français", shortLabel: "FR", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", shortLabel: "DE", flag: "🇩🇪" },
];

export const DEFAULT_LOCALE: Locale = "pt-BR";

export const translations: Record<Locale, Record<string, string>> = {
  "pt-BR": {
    // Navbar
    "nav.features": "Recursos",
    "nav.monitoring": "Monitoramento",
    "nav.downloads": "Downloads",
    "nav.access": "Acessar o Sistema",
    "nav.signup": "Cadastre-se",
    "nav.installGuide": "Guia de Instalação",

    // Hero
    "hero.badge": "Versão Oficial de Testes Beta para Fazendas Pioneiras",
    "hero.badgeSub": "100% Autocontido & Sem Docker",
    "hero.title1": "A Plataforma Completa para",
    "hero.title2": "Fazendas de Impressão 3D",
    "hero.subtitle": "Monitore, gerencie e otimize sua operação 3D em tempo real, com telemetria avançada, controle de filamentos e automação inteligente.",
    "hero.ctaPrimary": "Cadastre-se Grátis",
    "hero.ctaSecondary": "Acessar o Sistema",
    "hero.desktopBadge": "Aplicativo Desktop para Windows (.exe) e macOS (.dmg)",

    // Mockup 3D
    "mockup.title": "CTRL+Farm Enterprise Dashboard",
    "mockup.online": "ONLINE • 127.0.0.1",
    "mockup.navDashboard": "Dashboard",
    "mockup.navPrinters": "Impressoras",
    "mockup.navFilaments": "Filamentos",
    "mockup.navCameras": "Câmeras RTSP",
    "mockup.navSettings": "Ajustes",
    "mockup.printer": "Impressora",
    "mockup.statusPrinting": "Imprimindo",
    "mockup.statusHeating": "Aquecendo",
    "mockup.statusFinishing": "Finalizando",
    "mockup.statusReady": "Pronta",
    "mockup.activityTitle": "Telemetria de Atividade",
    "mockup.activityUptime": "+18.4% disponibilidade",
    "mockup.filamentsTitle": "Filamentos Ativos",
    "mockup.filamentsSpools": "180 Bobinas",
    "mockup.todayConsumption": "Consumo Hoje",
    "mockup.efficiency": "Eficiência",

    // Downloads Section
    "downloads.title": "Download dos Instaladores Oficiais",
    "downloads.subtitle": "Instalação nativa em 1 clique para Windows e macOS com PostgreSQL portátil embutido e inicialização sem telas de comando.",
    "downloads.detecting": "Detectando seu sistema operacional...",
    "downloads.detectedWin": "Detectamos que você usa Windows. Recomendamos o instalador CTRL-Farm-Setup.exe.",
    "downloads.detectedMac": "Detectamos que você usa macOS. Recomendamos o pacote CTRL-Farm.dmg.",
    "downloads.detectedOther": "Selecione abaixo a versão correspondente ao seu sistema operacional:",
    "downloads.recommended": "Recomendado",
    "downloads.winTitle": "CTRL-Farm para Windows",
    "downloads.winDesc": "Instalador 1-clique com PostgreSQL portátil embutido (< 40 MB RAM), atalho na Área de Trabalho e inicialização transparente.",
    "downloads.winBtn": "Baixar CTRL-Farm para Windows (.exe)",
    "downloads.macTitle": "CTRL-Farm para macOS",
    "downloads.macDesc": "Imagem DMG universal compatível com Apple Silicon (M1/M2/M3/M4) e Intel. Arraste para Aplicativos e execute nativamente.",
    "downloads.macBtn": "Baixar CTRL-Farm para macOS (.dmg)",
    "downloads.copyLink": "Copiar link direto",
    "downloads.copied": "✓ Copiado!",
    "downloads.viewManual": "Ver Manual Passo a Passo de Instalação (Windows & Mac)",

    // Specs
    "specs.install": "Instalação",
    "specs.installVal": "1 Clique Nativo",
    "specs.installSub": "Sem comandos manuais",
    "specs.postgres": "PostgreSQL",
    "specs.postgresVal": "< 40 MB RAM",
    "specs.postgresSub": "Zero exigência de Docker",
    "specs.runtime": "Node.js Runtime",
    "specs.runtimeVal": "100% Embutido",
    "specs.runtimeSub": "Sem dependências externas",
    "specs.license": "Licenciamento",
    "specs.licenseVal": "RSA Seguro",
    "specs.licenseSub": "Isolamento multi-tenant",

    // Steps
    "steps.subtitle": "Simplicidade de Implantação",
    "steps.title": "Como Começar em 4 Passos Rápidos",
    "steps.desc": "Do download ao painel completo de controle em menos de 2 minutos.",
    "steps.step1": "Passo 1: Download",
    "steps.step1Desc": "Baixe o instalador oficial de acordo com o seu sistema operacional: .exe para Windows ou .dmg para macOS.",
    "steps.step2": "Passo 2: Instalação 1-Clique",
    "steps.step2Desc": "Windows: Execute o instalador. macOS: Abra o .dmg e arraste para a pasta Aplicativos.",
    "steps.step3": "Passo 3: Inicialização",
    "steps.step3Desc": "O aplicativo inicia silenciosamente o banco de dados leve e os serviços locais, abrindo uma janela limpa.",
    "steps.step4": "Passo 4: Ativação",
    "steps.step4Desc": "Copie o seu ID de Instalação gerado na tela inicial e envie ao administrador para receber a Chave de Licença.",

    // Dashboard Header
    "header.operation": "CTRL+Farm · Operação",
    "header.licenseActive": "Plano Ativo",
    "header.licenseWarning": "Sem Licença",
    "header.roleAdmin": "Administrador",
    "header.roleManager": "Moderador",
    "header.roleOperator": "Operação",
    "header.roleViewer": "Padrão",
    "header.logout": "Sair",

    // Footer
    "footer.rights": "Desenvolvido para operações de alta escala • 2026",
    "footer.tagline": "Plataforma Industrial de Impressão 3D",
  },

  "en": {
    // Navbar
    "nav.features": "Features",
    "nav.monitoring": "Monitoring",
    "nav.downloads": "Downloads",
    "nav.access": "Access System",
    "nav.signup": "Sign Up",
    "nav.installGuide": "Installation Guide",

    // Hero
    "hero.badge": "Official Beta Testing Release for Pioneer Farms",
    "hero.badgeSub": "100% Self-Contained & Docker-Free",
    "hero.title1": "The Complete Platform for",
    "hero.title2": "3D Printing Farms",
    "hero.subtitle": "Monitor, manage, and optimize your 3D operation in real-time with advanced telemetry, filament tracking, and intelligent automation.",
    "hero.ctaPrimary": "Sign Up Free",
    "hero.ctaSecondary": "Access System",
    "hero.desktopBadge": "Desktop App for Windows (.exe) and macOS (.dmg)",

    // Mockup 3D
    "mockup.title": "CTRL+Farm Enterprise Dashboard",
    "mockup.online": "ONLINE • 127.0.0.1",
    "mockup.navDashboard": "Dashboard",
    "mockup.navPrinters": "Printers",
    "mockup.navFilaments": "Filaments",
    "mockup.navCameras": "RTSP Cameras",
    "mockup.navSettings": "Settings",
    "mockup.printer": "Printer",
    "mockup.statusPrinting": "Printing",
    "mockup.statusHeating": "Heating",
    "mockup.statusFinishing": "Finishing",
    "mockup.statusReady": "Ready",
    "mockup.activityTitle": "Activity Telemetry",
    "mockup.activityUptime": "+18.4% uptime",
    "mockup.filamentsTitle": "Active Filaments",
    "mockup.filamentsSpools": "180 Spools",
    "mockup.todayConsumption": "Today's Consumption",
    "mockup.efficiency": "Efficiency",

    // Downloads Section
    "downloads.title": "Download Official Installers",
    "downloads.subtitle": "Native 1-click installer for Windows and macOS with built-in portable PostgreSQL and zero-console startup.",
    "downloads.detecting": "Detecting your operating system...",
    "downloads.detectedWin": "We detected you are using Windows. We recommend the CTRL-Farm-Setup.exe installer.",
    "downloads.detectedMac": "We detected you are using macOS. We recommend the CTRL-Farm.dmg package.",
    "downloads.detectedOther": "Select the appropriate version for your operating system below:",
    "downloads.recommended": "Recommended",
    "downloads.winTitle": "CTRL-Farm for Windows",
    "downloads.winDesc": "1-click installer with embedded lightweight PostgreSQL (< 40 MB RAM), Desktop shortcut, and silent startup.",
    "downloads.winBtn": "Download CTRL-Farm for Windows (.exe)",
    "downloads.macTitle": "CTRL-Farm for macOS",
    "downloads.macDesc": "Universal DMG image compatible with Apple Silicon (M1/M2/M3/M4) and Intel. Drag to Applications and run natively.",
    "downloads.macBtn": "Download CTRL-Farm for macOS (.dmg)",
    "downloads.copyLink": "Copy direct link",
    "downloads.copied": "✓ Copied!",
    "downloads.viewManual": "View Step-by-Step Installation Manual (Windows & Mac)",

    // Specs
    "specs.install": "Installation",
    "specs.installVal": "1-Click Native",
    "specs.installSub": "No manual commands",
    "specs.postgres": "PostgreSQL",
    "specs.postgresVal": "< 40 MB RAM",
    "specs.postgresSub": "Zero Docker required",
    "specs.runtime": "Node.js Runtime",
    "specs.runtimeVal": "100% Embedded",
    "specs.runtimeSub": "No external dependencies",
    "specs.license": "Licensing",
    "specs.licenseVal": "Secure RSA",
    "specs.licenseSub": "Multi-tenant isolation",

    // Steps
    "steps.subtitle": "Simple Deployment",
    "steps.title": "Get Started in 4 Quick Steps",
    "steps.desc": "From download to a fully operational control panel in under 2 minutes.",
    "steps.step1": "Step 1: Download",
    "steps.step1Desc": "Download the official installer for your operating system: .exe for Windows or .dmg for macOS.",
    "steps.step2": "Step 2: 1-Click Install",
    "steps.step2Desc": "Windows: Run the installer. macOS: Open the .dmg and drag to your Applications folder.",
    "steps.step3": "Step 3: Startup",
    "steps.step3Desc": "The app silently boots the lightweight database and local services, launching a clean desktop window.",
    "steps.step4": "Step 4: Activation",
    "steps.step4Desc": "Copy your Installation ID from the home screen and send it to your administrator to receive your License Key.",

    // Dashboard Header
    "header.operation": "CTRL+Farm · Operations",
    "header.licenseActive": "Active Plan",
    "header.licenseWarning": "Unlicensed",
    "header.roleAdmin": "Administrator",
    "header.roleManager": "Manager",
    "header.roleOperator": "Operator",
    "header.roleViewer": "Viewer",
    "header.logout": "Sign Out",

    // Footer
    "footer.rights": "Engineered for high-scale operations • 2026",
    "footer.tagline": "Industrial 3D Printing Management Platform",
  },

  "es": {
    // Navbar
    "nav.features": "Recursos",
    "nav.monitoring": "Monitoreo",
    "nav.downloads": "Descargas",
    "nav.access": "Acceder al Sistema",
    "nav.signup": "Registrarse",
    "nav.installGuide": "Guía de Instalación",

    // Hero
    "hero.badge": "Versión Oficial de Pruebas Beta para Granjas Pioneras",
    "hero.badgeSub": "100% Autónomo y Sin Docker",
    "hero.title1": "La Plataforma Completa para",
    "hero.title2": "Granjas de Impresión 3D",
    "hero.subtitle": "Monitorea, gestiona y optimiza tu operación 3D en tiempo real con telemetría avanzada, control de filamentos y automatización inteligente.",
    "hero.ctaPrimary": "Registrarse Gratis",
    "hero.ctaSecondary": "Acceder al Sistema",
    "hero.desktopBadge": "Aplicación de Escritorio para Windows (.exe) y macOS (.dmg)",

    // Mockup 3D
    "mockup.title": "CTRL+Farm Enterprise Dashboard",
    "mockup.online": "EN LÍNEA • 127.0.0.1",
    "mockup.navDashboard": "Panel",
    "mockup.navPrinters": "Impresoras",
    "mockup.navFilaments": "Filamentos",
    "mockup.navCameras": "Cámaras RTSP",
    "mockup.navSettings": "Ajustes",
    "mockup.printer": "Impresora",
    "mockup.statusPrinting": "Imprimiendo",
    "mockup.statusHeating": "Calentando",
    "mockup.statusFinishing": "Finalizando",
    "mockup.statusReady": "Lista",
    "mockup.activityTitle": "Telemetría de Actividad",
    "mockup.activityUptime": "+18.4% disponibilidad",
    "mockup.filamentsTitle": "Filamentos Activos",
    "mockup.filamentsSpools": "180 Bobinas",
    "mockup.todayConsumption": "Consumo Hoy",
    "mockup.efficiency": "Eficiencia",

    // Downloads Section
    "downloads.title": "Descarga de Instaladores Oficiales",
    "downloads.subtitle": "Instalación nativa en 1 clic para Windows y macOS con PostgreSQL portátil integrado y arranque sin pantallas de comandos.",
    "downloads.detecting": "Detectando tu sistema operativo...",
    "downloads.detectedWin": "Detectamos que usas Windows. Recomendamos el instalador CTRL-Farm-Setup.exe.",
    "downloads.detectedMac": "Detectamos que usas macOS. Recomendamos el paquete CTRL-Farm.dmg.",
    "downloads.detectedOther": "Selecciona a continuación la versión correspondiente a tu sistema operativo:",
    "downloads.recommended": "Recomendado",
    "downloads.winTitle": "CTRL-Farm para Windows",
    "downloads.winDesc": "Instalador 1-clic con PostgreSQL portátil embebido (< 40 MB RAM), acceso directo en Escritorio e inicio transparente.",
    "downloads.winBtn": "Descargar CTRL-Farm para Windows (.exe)",
    "downloads.macTitle": "CTRL-Farm para macOS",
    "downloads.macDesc": "Imagen DMG universal compatible con Apple Silicon (M1/M2/M3/M4) e Intel. Arrastra a Aplicaciones y ejecuta nativamente.",
    "downloads.macBtn": "Descargar CTRL-Farm para macOS (.dmg)",
    "downloads.copyLink": "Copiar enlace directo",
    "downloads.copied": "✓ ¡Copiado!",
    "downloads.viewManual": "Ver Manual Paso a Paso de Instalación (Windows & Mac)",

    // Specs
    "specs.install": "Instalación",
    "specs.installVal": "1 Clic Nativo",
    "specs.installSub": "Sin comandos manuales",
    "specs.postgres": "PostgreSQL",
    "specs.postgresVal": "< 40 MB RAM",
    "specs.postgresSub": "Cero requisito de Docker",
    "specs.runtime": "Node.js Runtime",
    "specs.runtimeVal": "100% Integrado",
    "specs.runtimeSub": "Sin dependencias externas",
    "specs.license": "Licenciamiento",
    "specs.licenseVal": "RSA Seguro",
    "specs.licenseSub": "Aislamiento multi-tenant",

    // Steps
    "steps.subtitle": "Despliegue Sencillo",
    "steps.title": "Comienza en 4 Pasos Rápidos",
    "steps.desc": "De la descarga al panel de control completo en menos de 2 minutos.",
    "steps.step1": "Paso 1: Descarga",
    "steps.step1Desc": "Descarga el instalador oficial según tu sistema operativo: .exe para Windows o .dmg para macOS.",
    "steps.step2": "Paso 2: Instalación 1-Clic",
    "steps.step2Desc": "Windows: Ejecuta el instalador. macOS: Abre el .dmg y arrastra a la carpeta Aplicaciones.",
    "steps.step3": "Paso 3: Inicio",
    "steps.step3Desc": "La app inicia silenciosamente la base de datos ligera y los servicios locales, abriendo una ventana limpia.",
    "steps.step4": "Paso 4: Activación",
    "steps.step4Desc": "Copia tu ID de Instalación generado en la pantalla inicial y envíalo al administrador para recibir tu Licencia.",

    // Dashboard Header
    "header.operation": "CTRL+Farm · Operación",
    "header.licenseActive": "Plan Activo",
    "header.licenseWarning": "Sin Licencia",
    "header.roleAdmin": "Administrador",
    "header.roleManager": "Moderador",
    "header.roleOperator": "Operación",
    "header.roleViewer": "Estándar",
    "header.logout": "Cerrar Sesión",

    // Footer
    "footer.rights": "Desarrollado para operaciones de alta escala • 2026",
    "footer.tagline": "Plataforma Industrial de Impresión 3D",
  },

  "fr": {
    // Navbar
    "nav.features": "Fonctionnalités",
    "nav.monitoring": "Surveillance",
    "nav.downloads": "Téléchargements",
    "nav.access": "Accéder au Système",
    "nav.signup": "S'inscrire",
    "nav.installGuide": "Guide d'Installation",

    // Hero
    "hero.badge": "Version Officielle de Test Bêta pour Fermes Pionnières",
    "hero.badgeSub": "100% Autonome & Sans Docker",
    "hero.title1": "La Plateforme Complète pour",
    "hero.title2": "Fermes d'Impression 3D",
    "hero.subtitle": "Surveillez, gérez et optimisez votre atelier 3D en temps réel avec télémétrie avancée, suivi des filaments et automatisation intelligente.",
    "hero.ctaPrimary": "Inscription Gratuite",
    "hero.ctaSecondary": "Accéder au Système",
    "hero.desktopBadge": "Application Desktop pour Windows (.exe) et macOS (.dmg)",

    // Mockup 3D
    "mockup.title": "CTRL+Farm Enterprise Dashboard",
    "mockup.online": "EN LIGNE • 127.0.0.1",
    "mockup.navDashboard": "Tableau de bord",
    "mockup.navPrinters": "Imprimantes",
    "mockup.navFilaments": "Filaments",
    "mockup.navCameras": "Caméras RTSP",
    "mockup.navSettings": "Paramètres",
    "mockup.printer": "Imprimante",
    "mockup.statusPrinting": "Impression",
    "mockup.statusHeating": "Chauffe",
    "mockup.statusFinishing": "Finition",
    "mockup.statusReady": "Prête",
    "mockup.activityTitle": "Télémétrie d'Activité",
    "mockup.activityUptime": "+18.4% disponibilité",
    "mockup.filamentsTitle": "Filaments Actifs",
    "mockup.filamentsSpools": "180 Bobines",
    "mockup.todayConsumption": "Consommation Jour",
    "mockup.efficiency": "Efficacité",

    // Downloads Section
    "downloads.title": "Télécharger les Installateurs Officiels",
    "downloads.subtitle": "Installation native en 1 clic pour Windows et macOS avec PostgreSQL portable intégré et démarrage sans invite de commande.",
    "downloads.detecting": "Détection de votre système d'exploitation...",
    "downloads.detectedWin": "Nous avons détecté Windows. Nous recommandons l'installateur CTRL-Farm-Setup.exe.",
    "downloads.detectedMac": "Nous avons détecté macOS. Nous recommandons le paquet CTRL-Farm.dmg.",
    "downloads.detectedOther": "Sélectionnez ci-dessous la version correspondant à votre système :",
    "downloads.recommended": "Recommandé",
    "downloads.winTitle": "CTRL-Farm pour Windows",
    "downloads.winDesc": "Installateur 1-clic avec PostgreSQL portable embarqué (< 40 Mo RAM), raccourci Bureau et démarrage transparent.",
    "downloads.winBtn": "Télécharger CTRL-Farm pour Windows (.exe)",
    "downloads.macTitle": "CTRL-Farm pour macOS",
    "downloads.macDesc": "Image DMG universelle compatible Apple Silicon (M1/M2/M3/M4) et Intel. Glissez vers Applications et lancez nativement.",
    "downloads.macBtn": "Télécharger CTRL-Farm pour macOS (.dmg)",
    "downloads.copyLink": "Copier le lien direct",
    "downloads.copied": "✓ Copié !",
    "downloads.viewManual": "Voir le Manuel d'Installation (Windows & Mac)",

    // Specs
    "specs.install": "Installation",
    "specs.installVal": "1 Clic Natif",
    "specs.installSub": "Sans commandes manuelles",
    "specs.postgres": "PostgreSQL",
    "specs.postgresVal": "< 40 Mo RAM",
    "specs.postgresSub": "Zéro conteneur Docker",
    "specs.runtime": "Node.js Runtime",
    "specs.runtimeVal": "100% Embarqué",
    "specs.runtimeSub": "Aucune dépendance externe",
    "specs.license": "Licence",
    "specs.licenseVal": "RSA Sécurisé",
    "specs.licenseSub": "Isolation multi-tenant",

    // Steps
    "steps.subtitle": "Déploiement Simplifié",
    "steps.title": "Démarrer en 4 Étapes Rapides",
    "steps.desc": "Du téléchargement au tableau de bord complet en moins de 2 minutes.",
    "steps.step1": "Étape 1 : Téléchargement",
    "steps.step1Desc": "Téléchargez l'installateur officiel : .exe pour Windows ou .dmg pour macOS.",
    "steps.step2": "Étape 2 : Installation 1 Clic",
    "steps.step2Desc": "Windows : Exécutez l'installateur. macOS : Ouvrez le .dmg et glissez vers Applications.",
    "steps.step3": "Étape 3 : Démarrage",
    "steps.step3Desc": "L'application démarre silencieusement la base de données et les services locaux dans une fenêtre propre.",
    "steps.step4": "Étape 4 : Activation",
    "steps.step4Desc": "Copiez votre ID d'Installation et transmettez-le à l'administrateur pour recevoir votre Clé de Licence.",

    // Dashboard Header
    "header.operation": "CTRL+Farm · Opération",
    "header.licenseActive": "Plan Actif",
    "header.licenseWarning": "Sans Licence",
    "header.roleAdmin": "Administrateur",
    "header.roleManager": "Modérateur",
    "header.roleOperator": "Opérateur",
    "header.roleViewer": "Standard",
    "header.logout": "Déconnexion",

    // Footer
    "footer.rights": "Développé pour les opérations à grande échelle • 2026",
    "footer.tagline": "Plateforme Industrielle de Gestion d'Impression 3D",
  },

  "de": {
    // Navbar
    "nav.features": "Funktionen",
    "nav.monitoring": "Überwachung",
    "nav.downloads": "Downloads",
    "nav.access": "Systemzugriff",
    "nav.signup": "Registrieren",
    "nav.installGuide": "Installationsanleitung",

    // Hero
    "hero.badge": "Offizielle Beta-Testversion für Pionier-Farmen",
    "hero.badgeSub": "100% Eigenständig & Ohne Docker",
    "hero.title1": "Die Komplette Plattform für",
    "hero.title2": "3D-Druck-Farmen",
    "hero.subtitle": "Überwachen, verwalten und optimieren Sie Ihren 3D-Betrieb in Echtzeit mit fortschrittlicher Telemetrie, Filamentkontrolle und intelligenter Automatisierung.",
    "hero.ctaPrimary": "Kostenlos Registrieren",
    "hero.ctaSecondary": "Systemzugriff",
    "hero.desktopBadge": "Desktop-Anwendung für Windows (.exe) und macOS (.dmg)",

    // Mockup 3D
    "mockup.title": "CTRL+Farm Enterprise Dashboard",
    "mockup.online": "ONLINE • 127.0.0.1",
    "mockup.navDashboard": "Dashboard",
    "mockup.navPrinters": "Drucker",
    "mockup.navFilaments": "Filamente",
    "mockup.navCameras": "RTSP-Kameras",
    "mockup.navSettings": "Einstellungen",
    "mockup.printer": "Drucker",
    "mockup.statusPrinting": "Druckt",
    "mockup.statusHeating": "Aufheizen",
    "mockup.statusFinishing": "Abschließen",
    "mockup.statusReady": "Bereit",
    "mockup.activityTitle": "Aktivitäts-Telemetrie",
    "mockup.activityUptime": "+18.4% Betriebszeit",
    "mockup.filamentsTitle": "Aktive Filamente",
    "mockup.filamentsSpools": "180 Spulen",
    "mockup.todayConsumption": "Verbrauch Heute",
    "mockup.efficiency": "Effizienz",

    // Downloads Section
    "downloads.title": "Offizielle Installationsprogramme Herunterladen",
    "downloads.subtitle": "Native 1-Klick-Installation für Windows und macOS mit integriertem portablem PostgreSQL und Start ohne Konsolenfenster.",
    "downloads.detecting": "Betriebssystem wird erkannt...",
    "downloads.detectedWin": "Windows erkannt. Wir empfehlen das Installationsprogramm CTRL-Farm-Setup.exe.",
    "downloads.detectedMac": "macOS erkannt. Wir empfehlen das CTRL-Farm.dmg Paket.",
    "downloads.detectedOther": "Wählen Sie unten die passende Version für Ihr Betriebssystem aus:",
    "downloads.recommended": "Empfohlen",
    "downloads.winTitle": "CTRL-Farm für Windows",
    "downloads.winDesc": "1-Klick-Installer mit integriertem leichtgewichtigem PostgreSQL (< 40 MB RAM), Desktop-Verknüpfung und lautlosem Start.",
    "downloads.winBtn": "CTRL-Farm für Windows herunterladen (.exe)",
    "downloads.macTitle": "CTRL-Farm für macOS",
    "downloads.macDesc": "Universelles DMG-Image kompatibel mit Apple Silicon (M1/M2/M3/M4) und Intel. In Programme ziehen und nativ ausführen.",
    "downloads.macBtn": "CTRL-Farm für macOS herunterladen (.dmg)",
    "downloads.copyLink": "Direktlink kopieren",
    "downloads.copied": "✓ Kopiert!",
    "downloads.viewManual": "Schritt-für-Schritt Installationsanleitung ansehen (Windows & Mac)",

    // Specs
    "specs.install": "Installation",
    "specs.installVal": "1-Klick Nativ",
    "specs.installSub": "Keine manuellen Befehle",
    "specs.postgres": "PostgreSQL",
    "specs.postgresVal": "< 40 MB RAM",
    "specs.postgresSub": "Kein Docker erforderlich",
    "specs.runtime": "Node.js Runtime",
    "specs.runtimeVal": "100% Integriert",
    "specs.runtimeSub": "Keine externen Abhängigkeiten",
    "specs.license": "Lizenzierung",
    "specs.licenseVal": "Sicheres RSA",
    "specs.licenseSub": "Multi-Tenant-Isolation",

    // Steps
    "steps.subtitle": "Einfache Bereitstellung",
    "steps.title": "In 4 Schnellen Schritten Starten",
    "steps.desc": "Vom Download bis zum voll funktionsfähigen Kontrollpanel in unter 2 Minuten.",
    "steps.step1": "Schritt 1: Download",
    "steps.step1Desc": "Laden Sie das offizielle Installationsprogramm herunter: .exe für Windows oder .dmg für macOS.",
    "steps.step2": "Schritt 2: 1-Klick-Installation",
    "steps.step2Desc": "Windows: Installationsprogramm ausführen. macOS: .dmg öffnen und in Programme ziehen.",
    "steps.step3": "Schritt 3: Start",
    "steps.step3Desc": "Die Anwendung startet lautlos die schlanke Datenbank und lokale Dienste in einem sauberen Fenster.",
    "steps.step4": "Schritt 4: Aktivierung",
    "steps.step4Desc": "Kopieren Sie Ihre Installations-ID und senden Sie sie an den Administrator, um Ihren Lizenzschlüssel zu erhalten.",

    // Dashboard Header
    "header.operation": "CTRL+Farm · Betrieb",
    "header.licenseActive": "Aktiver Plan",
    "header.licenseWarning": "Keine Lizenz",
    "header.roleAdmin": "Administrator",
    "header.roleManager": "Moderator",
    "header.roleOperator": "Bedienung",
    "header.roleViewer": "Standard",
    "header.logout": "Abmelden",

    // Footer
    "footer.rights": "Entwickelt für industrielle Skalierung • 2026",
    "footer.tagline": "Industrielle 3D-Druck-Management-Plattform",
  },
};

export function getTranslation(locale: Locale, key: string, fallback?: string): string {
  const dict = translations[locale] || translations[DEFAULT_LOCALE];
  if (dict && dict[key]) {
    return dict[key];
  }
  // Fallback to default locale (pt-BR)
  const defaultDict = translations[DEFAULT_LOCALE];
  if (defaultDict && defaultDict[key]) {
    return defaultDict[key];
  }
  return fallback || key;
}
