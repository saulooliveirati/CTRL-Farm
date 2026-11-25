using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Net.Sockets;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

namespace CtrlFarm.Desktop
{
    static class Program
    {
        private const string AppTitle = "CTRL-Farm Industrial Platform";
        private const string AppVersion = "v1.0.0-BETA";
        private const string MutexId = "Global\\CTRL_FARM_DESKTOP_SINGLE_INSTANCE";
        private const int ApiPort = 3001;
        private const int WebPort = 3000;
        private const int DbPort = 5432;

        [DllImport("user32.dll")]
        private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [DllImport("user32.dll")]
        private static extern bool SetForegroundWindow(IntPtr hWnd);

        private const int SW_RESTORE = 9;
        private const int SW_MINIMIZE = 6;
        private const int SW_SHOW = 5;

        private static Mutex appMutex;
        private static NotifyIcon trayIcon;
        private static ContextMenuStrip trayMenu;
        private static Process apiProcess;
        private static Process webProcess;
        private static Process mediamtxProcess;
        private static Process browserProcess;
        private static Process postgresProcess;
        private static string portablePgDataDir;
        private static string portablePgCtlExe;
        private static string appRootDir;
        private static string logsDir;
        private static string dataDir;
        private static SplashForm splashForm;
        private static string currentLocale = "pt-BR";
        public static string CurrentLocale { get { return currentLocale; } }

        [STAThread]
        static void Main()
        {
            bool createdNew;
            appMutex = new Mutex(true, MutexId, out createdNew);
            if (!createdNew)
            {
                MessageBox.Show(
                    "O CTRL-Farm já está em execução no seu computador.\nVerifique o ícone na bandeja do sistema (perto do relógio).",
                    AppTitle,
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information);
                return;
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            ResolvePaths();
            InitLogs();

            splashForm = new SplashForm();
            splashForm.Show();
            Application.DoEvents();

            ThreadPool.QueueUserWorkItem(_ =>
            {
                try
                {
                    StartServicesWorkflow();
                }
                catch (Exception ex)
                {
                    Log("Erro fatal na inicialização: " + ex.Message + "\n" + ex.StackTrace);
                    if (splashForm != null && !splashForm.IsDisposed)
                    {
                        splashForm.Invoke((Action)(() =>
                        {
                            splashForm.SetStatus("Erro ao iniciar: " + ex.Message);
                            MessageBox.Show(
                                "Ocorreu um erro ao inicializar os serviços do CTRL-Farm:\n\n" + ex.Message +
                                "\n\nConsulte os logs em: " + logsDir,
                                AppTitle,
                                MessageBoxButtons.OK,
                                MessageBoxIcon.Error);
                            ExitApplication();
                        }));
                    }
                }
            });

            Application.Run();
        }

        private static void ResolvePaths()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            dataDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "CTRL-Farm");
            logsDir = Path.Combine(dataDir, "Logs");

            if (!Directory.Exists(dataDir)) Directory.CreateDirectory(dataDir);
            if (!Directory.Exists(logsDir)) Directory.CreateDirectory(logsDir);

            // 0. Prioridade: Ler idioma configurado (pt-BR, en, es, fr, de)
            string detectedLocale = ReadConfigLocale(Path.Combine(baseDir, "ctrlfarm.config.json"));
            if (string.IsNullOrEmpty(detectedLocale))
            {
                detectedLocale = ReadConfigLocale(Path.Combine(dataDir, "ctrlfarm.config.json"));
            }
            if (string.IsNullOrEmpty(detectedLocale))
            {
                detectedLocale = ReadRegistryLocale();
            }
            if (!string.IsNullOrEmpty(detectedLocale))
            {
                currentLocale = NormalizeLocale(detectedLocale);
            }

            // 1. Prioridade: Ler caminho configurado em ctrlfarm.config.json
            string detectedRoot = ReadConfigAppRootDir(Path.Combine(baseDir, "ctrlfarm.config.json"));
            if (string.IsNullOrEmpty(detectedRoot))
            {
                detectedRoot = ReadConfigAppRootDir(Path.Combine(dataDir, "ctrlfarm.config.json"));
            }

            // 2. Registro do Windows (onde o instalador grava o caminho oficial)
            if (string.IsNullOrEmpty(detectedRoot))
            {
                detectedRoot = ReadRegistryAppRootDir();
            }

            // 3. Caminhos relativos a partir do executavel (modo dev / pacote autocontido)
            if (string.IsNullOrEmpty(detectedRoot))
            {
                if (IsValidAppRoot(baseDir))
                {
                    detectedRoot = baseDir;
                }
                else if (IsValidAppRoot(Path.Combine(baseDir, "..", "..")))
                {
                    detectedRoot = Path.GetFullPath(Path.Combine(baseDir, "..", ".."));
                }
                else if (IsValidAppRoot(Path.Combine(baseDir, "..")))
                {
                    detectedRoot = Path.GetFullPath(Path.Combine(baseDir, ".."));
                }
                else if (IsValidAppRoot(Path.Combine(baseDir, "..", "..", "..")))
                {
                    detectedRoot = Path.GetFullPath(Path.Combine(baseDir, "..", "..", ".."));
                }
            }

            // 4. Locais conhecidos da maquina do desenvolvedor e instalacoes tipicas
            if (string.IsNullOrEmpty(detectedRoot))
            {
                string[] candidates = new string[]
                {
                    @"E:\CTRL-Farm",
                    @"D:\CTRL-Farm",
                    @"C:\CTRL-Farm",
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "CTRL-Farm"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "source", "repos", "CTRL-Farm"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Desktop", "CTRL-Farm"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Documents", "CTRL-Farm")
                };

                foreach (var cand in candidates)
                {
                    if (IsValidAppRoot(cand))
                    {
                        detectedRoot = cand;
                        break;
                    }
                }
            }

            // 5. Varredura por todas as unidades ativas do sistema
            if (string.IsNullOrEmpty(detectedRoot))
            {
                try
                {
                    foreach (var drive in DriveInfo.GetDrives())
                    {
                        if (drive.IsReady)
                        {
                            string driveCand = Path.Combine(drive.RootDirectory.FullName, "CTRL-Farm");
                            if (IsValidAppRoot(driveCand))
                            {
                                detectedRoot = driveCand;
                                break;
                            }
                        }
                    }
                }
                catch { }
            }

            // Se detectou uma raiz valida, salva a associacao para acelerar proximas execucoes
            if (!string.IsNullOrEmpty(detectedRoot) && IsValidAppRoot(detectedRoot))
            {
                appRootDir = Path.GetFullPath(detectedRoot);
                SaveConfigAppRootDir(appRootDir);
            }
            else
            {
                appRootDir = baseDir;
            }
        }

        private static bool IsValidAppRoot(string candidate)
        {
            if (string.IsNullOrEmpty(candidate)) return false;
            try
            {
                if (!Directory.Exists(candidate)) return false;
                if (File.Exists(Path.Combine(candidate, "package.json"))) return true;
                if (Directory.Exists(Path.Combine(candidate, "apps", "api")) &&
                    Directory.Exists(Path.Combine(candidate, "apps", "web"))) return true;
                if (File.Exists(Path.Combine(candidate, "apps", "api", "dist", "main.js"))) return true;
            }
            catch { }
            return false;
        }

        private static string ReadConfigAppRootDir(string configPath)
        {
            try
            {
                if (File.Exists(configPath))
                {
                    string content = File.ReadAllText(configPath);
                    int idx = content.IndexOf("\"appRootDir\"", StringComparison.OrdinalIgnoreCase);
                    if (idx >= 0)
                    {
                        int colon = content.IndexOf(':', idx);
                        if (colon >= 0)
                        {
                            int firstQuote = content.IndexOf('"', colon);
                            if (firstQuote >= 0)
                            {
                                int secondQuote = content.IndexOf('"', firstQuote + 1);
                                if (secondQuote >= 0)
                                {
                                    string raw = content.Substring(firstQuote + 1, secondQuote - firstQuote - 1);
                                    string clean = raw.Replace("\\\\", "\\").Trim();
                                    if (IsValidAppRoot(clean)) return clean;
                                }
                            }
                        }
                    }
                }
            }
            catch { }
            return null;
        }

        private static string ReadRegistryAppRootDir()
        {
            try
            {
                using (RegistryKey key = Registry.CurrentUser.OpenSubKey(@"Software\CTRL-Farm"))
                {
                    if (key != null)
                    {
                        string val = key.GetValue("AppRootDir") as string;
                        if (IsValidAppRoot(val)) return val;
                    }
                }
            }
            catch { }
            try
            {
                using (RegistryKey key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\CTRL-Farm"))
                {
                    if (key != null)
                    {
                        string val = key.GetValue("AppRootDir") as string;
                        if (IsValidAppRoot(val)) return val;
                        string loc = key.GetValue("InstallLocation") as string;
                        if (IsValidAppRoot(loc)) return loc;
                    }
                }
            }
            catch { }
            return null;
        }

        private static void SaveConfigAppRootDir(string root)
        {
            try
            {
                string langShort = currentLocale.Split('-')[0];
                string json = string.Format("{{\r\n  \"appRootDir\": \"{0}\",\r\n  \"locale\": \"{1}\",\r\n  \"language\": \"{2}\",\r\n  \"updatedAt\": \"{3:yyyy-MM-dd HH:mm:ss}\"\r\n}}",
                    root.Replace("\\", "\\\\"), currentLocale, langShort, DateTime.Now);
                string dataConfig = Path.Combine(dataDir, "ctrlfarm.config.json");
                File.WriteAllText(dataConfig, json);

                string baseConfig = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "ctrlfarm.config.json");
                try { File.WriteAllText(baseConfig, json); } catch { }

                using (RegistryKey key = Registry.CurrentUser.CreateSubKey(@"Software\CTRL-Farm"))
                {
                    if (key != null)
                    {
                        key.SetValue("AppRootDir", root);
                        key.SetValue("Locale", currentLocale);
                    }
                }
            }
            catch { }
        }

        private static string ReadConfigLocale(string configPath)
        {
            try
            {
                if (File.Exists(configPath))
                {
                    string content = File.ReadAllText(configPath);
                    int idx = content.IndexOf("\"locale\"", StringComparison.OrdinalIgnoreCase);
                    if (idx >= 0)
                    {
                        int colon = content.IndexOf(':', idx);
                        if (colon >= 0)
                        {
                            int firstQuote = content.IndexOf('"', colon);
                            if (firstQuote >= 0)
                            {
                                int secondQuote = content.IndexOf('"', firstQuote + 1);
                                if (secondQuote >= 0)
                                {
                                    return content.Substring(firstQuote + 1, secondQuote - firstQuote - 1).Trim();
                                }
                            }
                        }
                    }
                }
            }
            catch { }
            return null;
        }

        private static string ReadRegistryLocale()
        {
            try
            {
                using (RegistryKey key = Registry.CurrentUser.OpenSubKey(@"Software\CTRL-Farm"))
                {
                    if (key != null)
                    {
                        string val = key.GetValue("Locale") as string;
                        if (!string.IsNullOrEmpty(val)) return val;
                    }
                }
            }
            catch { }
            return null;
        }

        private static string NormalizeLocale(string val)
        {
            if (string.IsNullOrEmpty(val)) return "pt-BR";
            val = val.Trim();
            if (val.StartsWith("en", StringComparison.OrdinalIgnoreCase)) return "en";
            if (val.StartsWith("es", StringComparison.OrdinalIgnoreCase)) return "es";
            if (val.StartsWith("fr", StringComparison.OrdinalIgnoreCase)) return "fr";
            if (val.StartsWith("de", StringComparison.OrdinalIgnoreCase)) return "de";
            if (val.StartsWith("pt", StringComparison.OrdinalIgnoreCase)) return "pt-BR";
            return val;
        }

        private static void SaveLocale(string newLocale)
        {
            try
            {
                currentLocale = NormalizeLocale(newLocale);
                string root = !string.IsNullOrEmpty(appRootDir) ? appRootDir : AppDomain.CurrentDomain.BaseDirectory;
                string langShort = currentLocale.Split('-')[0];
                string json = string.Format("{{\r\n  \"appRootDir\": \"{0}\",\r\n  \"locale\": \"{1}\",\r\n  \"language\": \"{2}\",\r\n  \"updatedAt\": \"{3:yyyy-MM-dd HH:mm:ss}\"\r\n}}",
                    root.Replace("\\", "\\\\"), currentLocale, langShort, DateTime.Now);

                string dataConfig = Path.Combine(dataDir, "ctrlfarm.config.json");
                File.WriteAllText(dataConfig, json);

                string baseConfig = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "ctrlfarm.config.json");
                try { File.WriteAllText(baseConfig, json); } catch { }

                using (RegistryKey key = Registry.CurrentUser.CreateSubKey(@"Software\CTRL-Farm"))
                {
                    if (key != null)
                    {
                        key.SetValue("Locale", currentLocale);
                    }
                }
            }
            catch { }
        }

        public static string L(string key)
        {
            string lang = currentLocale.ToLowerInvariant();
            if (lang.StartsWith("en"))
            {
                switch (key)
                {
                    case "splash_init": return "Initializing local services...";
                    case "splash_init_db": return "Verifying environment and local database...";
                    case "splash_db_ready": return "Local database ready...";
                    case "splash_init_cam": return "Starting MediaMTX (Streaming & RTSP/WebRTC cameras)...";
                    case "splash_init_api": return "Starting CTRL-Farm NestJS API (Port 3001)...";
                    case "splash_init_web": return "Starting Next.js Web Interface (Port 3000)...";
                    case "splash_validating": return "Validating local ports 3001 and 3000...";
                    case "splash_waiting_web": return "Waiting for Next.js Web Interface to start...";
                    case "splash_ready": return "CTRL-Farm ready! Opening main window...";
                    case "card_db": return "Database:";
                    case "card_db_val": return "Ready";
                    case "card_cam": return "Camera Streaming:";
                    case "card_cam_val": return "Active";
                    case "card_ports": return "Ports:";
                    case "tray_open": return "🖥️  Open / Restore CTRL-Farm";
                    case "tray_minimize": return "🗕  Minimize Window";
                    case "tray_restart": return "🔄  Restart Local Services";
                    case "tray_external": return "🌐  Open in External Browser";
                    case "tray_logs": return "📂  Open Logs Folder";
                    case "tray_status": return "ℹ️  Local Components Status";
                    case "tray_language": return "🌐  Language / Idioma";
                    case "tray_exit": return "❌  Exit CTRL-Farm";
                    case "balloon_active": return "CTRL-Farm is active and operational on port 3000.\nDouble-click to open native window.";
                    case "balloon_restart": return "Local services restarted successfully!";
                    case "lang_changed": return "Language changed to English (US).";
                    case "status_title": return "Current Status of CTRL-Farm Components:";
                    case "status_db": return "• PostgreSQL Database (5432): {0}";
                    case "status_api": return "• NestJS API & Licensing (3001): {1}";
                    case "status_web": return "• Next.js Web Interface (3000): {2}";
                    case "status_cam": return "• MediaMTX Camera Server (8890): {3}";
                    case "status_install_dir": return "Installation Folder: {0}";
                    case "status_logs_dir": return "Logs Folder: {0}";
                    case "status_connected": return "Connected";
                    case "status_operational": return "Operational (200 OK)";
                    case "status_offline": return "Offline";
                    case "status_active": return "Streaming Active";
                }
            }
            else if (lang.StartsWith("es"))
            {
                switch (key)
                {
                    case "splash_init": return "Inicializando servicios locales...";
                    case "splash_init_db": return "Verificando entorno y base de datos local...";
                    case "splash_db_ready": return "Base de datos local lista...";
                    case "splash_init_cam": return "Iniciando MediaMTX (Streaming y cámaras RTSP/WebRTC)...";
                    case "splash_init_api": return "Iniciando API NestJS de CTRL-Farm (Puerto 3001)...";
                    case "splash_init_web": return "Iniciando Interfaz Web Next.js (Puerto 3000)...";
                    case "splash_validating": return "Validando disponibilidad de puertos 3001 y 3000...";
                    case "splash_waiting_web": return "Esperando inicio de interfaz Web Next.js...";
                    case "splash_ready": return "¡CTRL-Farm listo! Abriendo ventana principal...";
                    case "card_db": return "Base de Datos:";
                    case "card_db_val": return "Lista";
                    case "card_cam": return "Streaming Cámaras:";
                    case "card_cam_val": return "Activo";
                    case "card_ports": return "Puertos:";
                    case "tray_open": return "🖥️  Abrir / Restaurar CTRL-Farm";
                    case "tray_minimize": return "🗕  Minimizar Ventana";
                    case "tray_restart": return "🔄  Reiniciar Servicios Locales";
                    case "tray_external": return "🌐  Abrir en Navegador Externo";
                    case "tray_logs": return "📂  Abrir Carpeta de Logs";
                    case "tray_status": return "ℹ️  Estado de Componentes Locales";
                    case "tray_language": return "🌐  Idioma / Language";
                    case "tray_exit": return "❌  Salir de CTRL-Farm";
                    case "balloon_active": return "CTRL-Farm está activo y operativo en el puerto 3000.\nHaz doble clic para abrir la ventana nativa.";
                    case "balloon_restart": return "¡Servicios locales reiniciados con éxito!";
                    case "lang_changed": return "Idioma cambiado a Español.";
                    case "status_title": return "Estado Actual de los Componentes CTRL-Farm:";
                    case "status_db": return "• Base de Datos PostgreSQL (5432): {0}";
                    case "status_api": return "• API NestJS & Licenciamiento (3001): {1}";
                    case "status_web": return "• Interfaz Web Next.js (3000): {2}";
                    case "status_cam": return "• Servidor de Cámaras MediaMTX (8890): {3}";
                    case "status_install_dir": return "Carpeta de Instalación: {0}";
                    case "status_logs_dir": return "Carpeta de Logs: {0}";
                    case "status_connected": return "Conectado";
                    case "status_operational": return "Operativo (200 OK)";
                    case "status_offline": return "Desconectado";
                    case "status_active": return "Transmisión Activa";
                }
            }
            else if (lang.StartsWith("fr"))
            {
                switch (key)
                {
                    case "splash_init": return "Initialisation des services locaux...";
                    case "splash_init_db": return "Vérification de l'environnement et base de données...";
                    case "splash_db_ready": return "Base de données locale prête...";
                    case "splash_init_cam": return "Démarrage MediaMTX (Streaming et caméras RTSP/WebRTC)...";
                    case "splash_init_api": return "Démarrage de l'API NestJS (Port 3001)...";
                    case "splash_init_web": return "Démarrage de l'interface Web Next.js (Port 3000)...";
                    case "splash_validating": return "Validation des ports 3001 et 3000...";
                    case "splash_waiting_web": return "Attente de l'interface Web Next.js...";
                    case "splash_ready": return "CTRL-Farm prêt ! Ouverture de la fenêtre...";
                    case "card_db": return "Base de données:";
                    case "card_db_val": return "Prête";
                    case "card_cam": return "Streaming Caméras:";
                    case "card_cam_val": return "Actif";
                    case "card_ports": return "Ports:";
                    case "tray_open": return "🖥️  Ouvrir / Restaurer CTRL-Farm";
                    case "tray_minimize": return "🗕  Réduire la Fenêtre";
                    case "tray_restart": return "🔄  Redémarrer les Services Locaux";
                    case "tray_external": return "🌐  Ouvrir dans le Navigateur";
                    case "tray_logs": return "📂  Ouvrir le Dossier des Logs";
                    case "tray_status": return "ℹ️  État des Composants Locaux";
                    case "tray_language": return "🌐  Langue / Language";
                    case "tray_exit": return "❌  Quitter CTRL-Farm";
                    case "balloon_active": return "CTRL-Farm est actif sur le port 3000.\nDouble-cliquez pour ouvrir.";
                    case "balloon_restart": return "Services locaux redémarrés avec succès !";
                    case "lang_changed": return "Langue modifiée en Français.";
                    case "status_title": return "État Actuel des Composants CTRL-Farm :";
                    case "status_db": return "• Base de données PostgreSQL (5432) : {0}";
                    case "status_api": return "• API NestJS & Licence (3001) : {1}";
                    case "status_web": return "• Interface Web Next.js (3000) : {2}";
                    case "status_cam": return "• Serveur de Caméras MediaMTX (8890) : {3}";
                    case "status_install_dir": return "Dossier d'Installation : {0}";
                    case "status_logs_dir": return "Dossier de Logs : {0}";
                    case "status_connected": return "Connecté";
                    case "status_operational": return "Opérationnel (200 OK)";
                    case "status_offline": return "Hors ligne";
                    case "status_active": return "Transmission Active";
                }
            }
            else if (lang.StartsWith("de"))
            {
                switch (key)
                {
                    case "splash_init": return "Lokale Dienste werden initialisiert...";
                    case "splash_init_db": return "Umgebung und lokale Datenbank werden geprüft...";
                    case "splash_db_ready": return "Lokale Datenbank bereit...";
                    case "splash_init_cam": return "MediaMTX wird gestartet (Streaming und RTSP/WebRTC)...";
                    case "splash_init_api": return "CTRL-Farm NestJS-API wird gestartet (Port 3001)...";
                    case "splash_init_web": return "Next.js Web-Interface wird gestartet (Port 3000)...";
                    case "splash_validating": return "Lokale Ports 3001 und 3000 werden geprüft...";
                    case "splash_waiting_web": return "Warten auf Next.js Web-Interface...";
                    case "splash_ready": return "CTRL-Farm bereit! Hauptfenster wird geöffnet...";
                    case "card_db": return "Datenbank:";
                    case "card_db_val": return "Bereit";
                    case "card_cam": return "Kamera-Streaming:";
                    case "card_cam_val": return "Aktiv";
                    case "card_ports": return "Ports:";
                    case "tray_open": return "🖥️  CTRL-Farm Öffnen / Wiederherstellen";
                    case "tray_minimize": return "🗕  Fenster Minimieren";
                    case "tray_restart": return "🔄  Lokale Dienste Neu Starten";
                    case "tray_external": return "🌐  Im Externen Browser Öffnen";
                    case "tray_logs": return "📂  Log-Ordner Öffnen";
                    case "tray_status": return "ℹ️  Status Lokaler Komponenten";
                    case "tray_language": return "🌐  Sprache / Language";
                    case "tray_exit": return "❌  CTRL-Farm Beenden";
                    case "balloon_active": return "CTRL-Farm ist aktiv auf Port 3000.\nDoppelklicken zum Öffnen.";
                    case "balloon_restart": return "Lokale Dienste erfolgreich neu gestartet!";
                    case "lang_changed": return "Sprache auf Deutsch geändert.";
                    case "status_title": return "Aktueller Status der CTRL-Farm Komponenten:";
                    case "status_db": return "• PostgreSQL-Datenbank (5432): {0}";
                    case "status_api": return "• NestJS API & Lizenzierung (3001): {1}";
                    case "status_web": return "• Next.js Web-Interface (3000): {2}";
                    case "status_cam": return "• MediaMTX Kamera-Server (8890): {3}";
                    case "status_install_dir": return "Installationsordner: {0}";
                    case "status_logs_dir": return "Log-Ordner: {0}";
                    case "status_connected": return "Verbunden";
                    case "status_operational": return "Betriebsbereit (200 OK)";
                    case "status_offline": return "Offline";
                    case "status_active": return "Übertragung Aktiv";
                }
            }

            // Padrão: Português (Brasil)
            switch (key)
            {
                case "splash_init": return "Inicializando serviços locais...";
                case "splash_init_db": return "Verificando ambiente e banco de dados local...";
                case "splash_db_ready": return "Banco de dados local pronto...";
                case "splash_init_cam": return "Iniciando MediaMTX (Streaming & Câmeras RTSP/WebRTC)...";
                case "splash_init_api": return "Iniciando API NestJS do CTRL-Farm (Porta 3001)...";
                case "splash_init_web": return "Iniciando Interface Web Next.js (Porta 3000)...";
                case "splash_validating": return "Validando disponibilidade das portas locais 3001 e 3000...";
                case "splash_waiting_web": return "Aguardando interface Web Next.js inicializar...";
                case "splash_ready": return "CTRL-Farm pronto! Abrindo janela principal...";
                case "card_db": return "Banco de Dados:";
                case "card_db_val": return "Pronto";
                case "card_cam": return "Streaming de Câmeras:";
                case "card_cam_val": return "Ativo";
                case "card_ports": return "Portas:";
                case "tray_open": return "🖥️  Abrir / Restaurar CTRL-Farm";
                case "tray_minimize": return "🗕  Minimizar Janela";
                case "tray_restart": return "🔄  Reiniciar Serviços Locais";
                case "tray_external": return "🌐  Abrir no Navegador Externo";
                case "tray_logs": return "📂  Abrir Pasta de Logs";
                case "tray_status": return "ℹ️  Status dos Componentes Locais";
                case "tray_language": return "🌐  Idioma / Language";
                case "tray_exit": return "❌  Encerrar CTRL-Farm";
                case "balloon_active": return "CTRL-Farm está ativo e operacional na porta 3000.\nClique duas vezes para abrir a janela nativa.";
                case "balloon_restart": return "Serviços locais reiniciados com sucesso!";
                case "lang_changed": return "Idioma alterado para Português (Brasil).";
                case "status_title": return "Status Atual dos Componentes CTRL-Farm:";
                case "status_db": return "• Banco de Dados PostgreSQL (5432): {0}";
                case "status_api": return "• API NestJS & Licensing (3001): {1}";
                case "status_web": return "• Interface Web Next.js (3000): {2}";
                case "status_cam": return "• Servidor de Câmeras MediaMTX (8890): {3}";
                case "status_install_dir": return "Pasta de Instalação: {0}";
                case "status_logs_dir": return "Pasta de Logs: {0}";
                case "status_connected": return "Conectado";
                case "status_operational": return "Operacional (200 OK)";
                case "status_offline": return "Offline";
                case "status_active": return "Transmissão Ativa";
                default: return key;
            }
        }

        private static string SafeWorkingDirectory(params string[] candidateDirs)
        {
            if (candidateDirs != null)
            {
                foreach (var dir in candidateDirs)
                {
                    if (!string.IsNullOrEmpty(dir))
                    {
                        try
                        {
                            if (Directory.Exists(dir)) return dir;
                        }
                        catch { }
                    }
                }
            }
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            return Directory.Exists(baseDir) ? baseDir : Path.GetTempPath();
        }

        private static void InitLogs()
        {
            Log("=================================================");
            Log("Iniciando " + AppTitle + " " + AppVersion);
            Log("Diretório Raiz: " + appRootDir);
            Log("Diretório de Dados: " + dataDir);
            Log("Diretório de Logs: " + logsDir);
            Log("=================================================");
        }

        public static void Log(string message)
        {
            try
            {
                string logFile = Path.Combine(logsDir, "launcher.log");
                string line = string.Format("[{0:yyyy-MM-dd HH:mm:ss}] {1}", DateTime.Now, message);
                File.AppendAllText(logFile, line + Environment.NewLine);

                if (!string.IsNullOrEmpty(appRootDir) && Directory.Exists(appRootDir))
                {
                    string devLogs = Path.Combine(appRootDir, "logs");
                    if (!Directory.Exists(devLogs)) Directory.CreateDirectory(devLogs);
                    File.AppendAllText(Path.Combine(devLogs, "launcher.log"), line + Environment.NewLine);
                }
            }
            catch { }
        }

        private static void StartServicesWorkflow()
        {
            UpdateSplash(L("splash_init_db"), 15);
            CheckDatabaseService();

            UpdateSplash(L("splash_init_cam"), 35);
            StartMediaMtxService();

            UpdateSplash(L("splash_init_api"), 50);
            StartApiProcess();

            UpdateSplash(L("splash_init_web"), 70);
            StartWebProcess();

            UpdateSplash(L("splash_validating"), 90);
            WaitForPort(ApiPort, 35000);
            WaitForPort(WebPort, 45000);

            if (!IsPortOpen(WebPort, 1500))
            {
                Log("Aviso: Porta 3000 ainda inicializando. Aguardando até 15s adicionais...");
                UpdateSplash(L("splash_waiting_web"), 95);
                WaitForPort(WebPort, 15000);
            }

            UpdateSplash(L("splash_ready"), 100);
            Thread.Sleep(800);

            if (splashForm != null && !splashForm.IsDisposed)
            {
                splashForm.Invoke((Action)(() =>
                {
                    splashForm.Hide();
                    SetupTrayIcon();
                    LaunchAppWindow();
                }));
            }
        }

        private static void UpdateSplash(string text, int progress)
        {
            if (splashForm != null && !splashForm.IsDisposed)
            {
                splashForm.Invoke((Action)(() => splashForm.SetProgress(text, progress)));
            }
        }

        private static void CheckDatabaseService()
        {
            // 1. Se a porta 5432 já estiver ativa (serviço local pré-instalado)
            if (IsPortOpen(DbPort, 1200))
            {
                Log("PostgreSQL detectado ativo na porta 5432 (instância existente/serviço local).");
                return;
            }

            Log("Porta 5432 fechada. Buscando binários do PostgreSQL Portátil (baixo consumo < 50MB RAM)...");

            string[] candidatePgCtl = new string[]
            {
                Path.Combine(appRootDir, "bin", "pgsql", "bin", "pg_ctl.exe"),
                Path.Combine(appRootDir, "pgsql", "bin", "pg_ctl.exe"),
                Path.Combine(appRootDir, "bin", "postgres", "bin", "pg_ctl.exe"),
                Path.Combine(dataDir, "pgsql", "bin", "pg_ctl.exe")
            };

            string foundPgCtl = null;
            foreach (var candidate in candidatePgCtl)
            {
                if (File.Exists(candidate))
                {
                    foundPgCtl = candidate;
                    break;
                }
            }

            if (foundPgCtl != null)
            {
                try
                {
                    portablePgCtlExe = foundPgCtl;
                    string pgsqlRoot = Path.GetFullPath(Path.Combine(Path.GetDirectoryName(foundPgCtl), ".."));
                    string dataCandidate1 = Path.Combine(pgsqlRoot, "data");
                    string dataCandidate2 = Path.Combine(dataDir, "pgdata");
                    portablePgDataDir = Directory.Exists(dataCandidate1) ? dataCandidate1 : dataCandidate2;

                    string pgLogFile = Path.Combine(logsDir, "postgres.log");

                    if (!Directory.Exists(portablePgDataDir))
                    {
                        string initDbExe = Path.Combine(Path.GetDirectoryName(foundPgCtl), "initdb.exe");
                        if (File.Exists(initDbExe))
                        {
                            Log("Inicializando cluster de dados PostgreSQL leve em: " + portablePgDataDir);
                            Directory.CreateDirectory(portablePgDataDir);
                            ProcessStartInfo initPsi = new ProcessStartInfo(initDbExe, string.Format("-D \"{0}\" -U postgres -E UTF8 --no-locale -A trust", portablePgDataDir))
                            {
                                CreateNoWindow = true,
                                UseShellExecute = false,
                                WindowStyle = ProcessWindowStyle.Hidden
                            };
                            Process initProc = Process.Start(initPsi);
                            initProc.WaitForExit(15000);
                        }
                    }

                    Log("Iniciando PostgreSQL Portátil: " + foundPgCtl + " -D " + portablePgDataDir);
                    ProcessStartInfo startPsi = new ProcessStartInfo(foundPgCtl, string.Format("start -D \"{0}\" -l \"{1}\" -o \"-p {2}\"", portablePgDataDir, pgLogFile, DbPort))
                    {
                        WorkingDirectory = SafeWorkingDirectory(Path.GetDirectoryName(foundPgCtl), dataDir, appRootDir, AppDomain.CurrentDomain.BaseDirectory),
                        CreateNoWindow = true,
                        UseShellExecute = false,
                        WindowStyle = ProcessWindowStyle.Hidden
                    };
                    postgresProcess = Process.Start(startPsi);
                    postgresProcess.WaitForExit(6000);

                    if (IsPortOpen(DbPort, 6000))
                    {
                        Log("PostgreSQL Portátil ativo com sucesso na porta 5432! Consumo estimado < 45 MB RAM.");
                        return;
                    }
                }
                catch (Exception ex)
                {
                    Log("Aviso ao tentar iniciar PostgreSQL portátil: " + ex.Message);
                }
            }
            else
            {
                Log("PostgreSQL Portátil não encontrado nos diretórios locais. Continuando com verificação de serviço...");
            }

            if (!IsPortOpen(DbPort, 2000))
            {
                Log("Aviso: PostgreSQL na porta 5432 ainda não respondeu. A API tentará conectar conforme inicializa.");
            }
        }

        private static void StartMediaMtxService()
        {
            try
            {
                string mediamtxExe = Path.Combine(appRootDir, "bin", "mediamtx", "mediamtx.exe");
                string mediamtxYml = Path.Combine(appRootDir, "bin", "mediamtx", "mediamtx.yml");

                if (!File.Exists(mediamtxExe))
                {
                    Log("Executável do MediaMTX não encontrado em: " + mediamtxExe);
                    return;
                }

                if (IsPortOpen(8890, 800) || IsPortOpen(9998, 800))
                {
                    Log("MediaMTX já está em execução.");
                    return;
                }

                ProcessStartInfo psi = new ProcessStartInfo(mediamtxExe, "\"" + mediamtxYml + "\"")
                {
                    WorkingDirectory = SafeWorkingDirectory(Path.GetDirectoryName(mediamtxExe), appRootDir, AppDomain.CurrentDomain.BaseDirectory),
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    WindowStyle = ProcessWindowStyle.Hidden
                };
                mediamtxProcess = Process.Start(psi);
                Log("MediaMTX iniciado com PID: " + mediamtxProcess.Id);
            }
            catch (Exception ex)
            {
                Log("Aviso não fatal ao iniciar MediaMTX: " + ex.Message);
            }
        }

        private static void StartApiProcess()
        {
            try
            {
                if (IsPortOpen(ApiPort, 1000))
                {
                    Log("API CTRL-Farm já está rodando na porta " + ApiPort);
                    return;
                }

                string apiDir = Path.Combine(appRootDir, "apps", "api");
                string workingDir = SafeWorkingDirectory(apiDir, appRootDir, AppDomain.CurrentDomain.BaseDirectory);

                string distMain = Path.Combine(apiDir, "dist", "main.js");
                if (!File.Exists(distMain))
                {
                    distMain = Path.Combine(apiDir, "dist", "main");
                }
                if (!File.Exists(distMain))
                {
                    distMain = Path.Combine(appRootDir, "dist", "apps", "api", "main.js");
                }
                if (!File.Exists(distMain))
                {
                    distMain = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "apps", "api", "dist", "main.js");
                }

                string nodeExe = FindNodeExecutable();
                Log("Executando Node API com: " + nodeExe + " -> " + distMain + " em " + workingDir);

                if (!File.Exists(distMain))
                {
                    Log("Aviso: Binário da API não encontrado em: " + distMain + ". O aplicativo prosseguirá em modo resiliente.");
                    return;
                }

                ProcessStartInfo psi = new ProcessStartInfo(nodeExe, "\"" + distMain + "\"")
                {
                    WorkingDirectory = workingDir,
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    WindowStyle = ProcessWindowStyle.Hidden,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                };
                psi.EnvironmentVariables["PORT"] = ApiPort.ToString();
                psi.EnvironmentVariables["NODE_ENV"] = "production";

                apiProcess = new Process { StartInfo = psi, EnableRaisingEvents = true };
                apiProcess.OutputDataReceived += (s, e) => { if (!string.IsNullOrEmpty(e.Data)) AppendLog("api.log", e.Data); };
                apiProcess.ErrorDataReceived += (s, e) => { if (!string.IsNullOrEmpty(e.Data)) AppendLog("api.log", "[ERROR] " + e.Data); };

                apiProcess.Start();
                apiProcess.BeginOutputReadLine();
                apiProcess.BeginErrorReadLine();
                Log("Processo da API iniciado silenciosamente com PID: " + apiProcess.Id);
            }
            catch (Exception ex)
            {
                Log("Aviso não fatal ao iniciar processo da API: " + ex.Message);
            }
        }

        private static void StartWebProcess()
        {
            try
            {
                if (IsPortOpen(WebPort, 1000))
                {
                    Log("Interface Web já está rodando na porta " + WebPort);
                    return;
                }

                string webDir = Path.Combine(appRootDir, "apps", "web");
                string workingDir = SafeWorkingDirectory(webDir, appRootDir, AppDomain.CurrentDomain.BaseDirectory);
                string nodeExe = FindNodeExecutable();

                string serverJs = Path.Combine(webDir, "server.js");
                if (!File.Exists(serverJs))
                {
                    serverJs = Path.Combine(appRootDir, "server.js");
                }
                if (!File.Exists(serverJs))
                {
                    serverJs = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "apps", "web", "server.js");
                }

                ProcessStartInfo psi;

                if (File.Exists(serverJs))
                {
                    Log("Iniciando Interface Web via server.js nativo: " + serverJs);
                    psi = new ProcessStartInfo(nodeExe, string.Format("\"{0}\"", serverJs));
                }
                else
                {
                    string[] candidateNextCli = new string[]
                    {
                        Path.Combine(webDir, "node_modules", "next", "dist", "bin", "next"),
                        Path.Combine(appRootDir, "node_modules", "next", "dist", "bin", "next"),
                        Path.Combine(webDir, "node_modules", ".bin", "next.cmd"),
                        Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "node_modules", "next", "dist", "bin", "next")
                    };

                    string foundNextCli = null;
                    foreach (var cand in candidateNextCli)
                    {
                        if (File.Exists(cand))
                        {
                            foundNextCli = cand;
                            break;
                        }
                    }

                    if (foundNextCli != null && foundNextCli.EndsWith(".cmd", StringComparison.OrdinalIgnoreCase))
                    {
                        psi = new ProcessStartInfo("cmd.exe", string.Format("/c \"\"{0}\" start -p {1} -H 0.0.0.0\"", foundNextCli, WebPort));
                    }
                    else if (foundNextCli != null)
                    {
                        psi = new ProcessStartInfo(nodeExe, string.Format("\"{0}\" start -p {1} -H 0.0.0.0", foundNextCli, WebPort));
                    }
                    else
                    {
                        psi = new ProcessStartInfo("cmd.exe", string.Format("/c npm start -- -p {0} -H 0.0.0.0", WebPort));
                    }
                }

                psi.WorkingDirectory = workingDir;
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;
                psi.WindowStyle = ProcessWindowStyle.Hidden;
                psi.RedirectStandardOutput = true;
                psi.RedirectStandardError = true;
                psi.EnvironmentVariables["PORT"] = WebPort.ToString();
                psi.EnvironmentVariables["HOSTNAME"] = "0.0.0.0";
                psi.EnvironmentVariables["NODE_ENV"] = "production";
                psi.EnvironmentVariables["NODE_PATH"] = Path.Combine(webDir, "node_modules");

                Log("Executando Next.js Web: " + psi.FileName + " " + psi.Arguments + " em " + workingDir);

                webProcess = new Process { StartInfo = psi, EnableRaisingEvents = true };
                webProcess.OutputDataReceived += (s, e) => { if (!string.IsNullOrEmpty(e.Data)) AppendLog("web.log", e.Data); };
                webProcess.ErrorDataReceived += (s, e) => { if (!string.IsNullOrEmpty(e.Data)) AppendLog("web.log", "[ERROR] " + e.Data); };

                webProcess.Start();
                webProcess.BeginOutputReadLine();
                webProcess.BeginErrorReadLine();
                Log("Processo Web iniciado silenciosamente com PID: " + webProcess.Id);

                // Verificação de sobrevivência do processo com contingência automática
                ThreadPool.QueueUserWorkItem(_ =>
                {
                    Thread.Sleep(5000);
                    if (webProcess != null && webProcess.HasExited && !IsPortOpen(WebPort, 1000))
                    {
                        Log("Aviso: Processo web encerrou prematuramente. Tentando contingência com server.js...");
                        if (File.Exists(serverJs))
                        {
                            try
                            {
                                ProcessStartInfo fallbackPsi = new ProcessStartInfo(nodeExe, string.Format("\"{0}\"", serverJs))
                                {
                                    WorkingDirectory = workingDir,
                                    CreateNoWindow = true,
                                    UseShellExecute = false,
                                    WindowStyle = ProcessWindowStyle.Hidden,
                                    RedirectStandardOutput = true,
                                    RedirectStandardError = true
                                };
                                fallbackPsi.EnvironmentVariables["PORT"] = WebPort.ToString();
                                fallbackPsi.EnvironmentVariables["HOSTNAME"] = "0.0.0.0";
                                fallbackPsi.EnvironmentVariables["NODE_ENV"] = "production";
                                webProcess = new Process { StartInfo = fallbackPsi, EnableRaisingEvents = true };
                                webProcess.OutputDataReceived += (s, e) => { if (!string.IsNullOrEmpty(e.Data)) AppendLog("web.log", e.Data); };
                                webProcess.ErrorDataReceived += (s, e) => { if (!string.IsNullOrEmpty(e.Data)) AppendLog("web.log", "[ERROR] " + e.Data); };
                                webProcess.Start();
                                webProcess.BeginOutputReadLine();
                                webProcess.BeginErrorReadLine();
                                Log("Processo Web de contingência iniciado com PID: " + webProcess.Id);
                            }
                            catch (Exception fex)
                            {
                                Log("Erro ao disparar contingência Web: " + fex.Message);
                            }
                        }
                    }
                });
            }
            catch (Exception ex)
            {
                Log("Aviso não fatal ao iniciar processo Web: " + ex.Message);
            }
        }

        private static string FindNodeExecutable()
        {
            string[] possible = new string[]
            {
                Path.Combine(appRootDir, "bin", "node.exe"),
                Path.Combine(appRootDir, "bin", "node", "node.exe"),
                Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "bin", "node.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs", "node.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "nodejs", "node.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "node", "node.exe"),
                "node"
            };

            foreach (var p in possible)
            {
                if (p == "node" || File.Exists(p)) return p;
            }
            return "node";
        }

        private static void AppendLog(string fileName, string text)
        {
            try
            {
                string line = string.Format("[{0:HH:mm:ss}] {1}\r\n", DateTime.Now, text);
                string path = Path.Combine(logsDir, fileName);
                File.AppendAllText(path, line);

                if (!string.IsNullOrEmpty(appRootDir) && Directory.Exists(appRootDir))
                {
                    string devLogs = Path.Combine(appRootDir, "logs");
                    if (!Directory.Exists(devLogs)) Directory.CreateDirectory(devLogs);
                    File.AppendAllText(Path.Combine(devLogs, fileName), line);
                }
            }
            catch { }
        }

        private static bool IsPortOpen(int port, int timeoutMs = 1000)
        {
            try
            {
                using (var client = new TcpClient())
                {
                    var result = client.BeginConnect("127.0.0.1", port, null, null);
                    bool success = result.AsyncWaitHandle.WaitOne(timeoutMs);
                    if (success && client.Connected)
                    {
                        client.EndConnect(result);
                        return true;
                    }
                }
            }
            catch { }

            try
            {
                using (var client = new TcpClient("localhost", port))
                {
                    return client.Connected;
                }
            }
            catch { }

            return false;
        }

        private static void WaitForPort(int port, int maxWaitMs = 30000)
        {
            int elapsed = 0;
            int step = 800;
            while (elapsed < maxWaitMs)
            {
                if (IsPortOpen(port, 700)) return;
                Thread.Sleep(step);
                elapsed += step;
            }
        }

        public static void LaunchAppWindow()
        {
            // Se o processo do browser já existir e a janela estiver aberta, restaura e foca
            if (browserProcess != null && !browserProcess.HasExited && browserProcess.MainWindowHandle != IntPtr.Zero)
            {
                ShowWindow(browserProcess.MainWindowHandle, SW_RESTORE);
                SetForegroundWindow(browserProcess.MainWindowHandle);
                return;
            }

            string url = string.Format("http://127.0.0.1:{0}?lang={1}", WebPort, currentLocale);
            string profileDir = Path.Combine(dataDir, "WebProfile");

            string browserPath = FindChromiumBrowser();
            if (!string.IsNullOrEmpty(browserPath))
            {
                string args = string.Format(
                    "--app=\"{0}\" --window-size=1440,900 --user-data-dir=\"{1}\" --disable-extensions --enable-features=OverlayScrollbar",
                    url,
                    profileDir);

                try
                {
                    ProcessStartInfo psi = new ProcessStartInfo(browserPath, args)
                    {
                        UseShellExecute = false,
                        CreateNoWindow = false,
                        WindowStyle = ProcessWindowStyle.Normal
                    };
                    browserProcess = Process.Start(psi);
                    Log("Janela nativa do aplicativo aberta em Chromium App Mode com: " + browserPath);
                    return;
                }
                catch (Exception ex)
                {
                    Log("Erro ao abrir navegador em modo app: " + ex.Message);
                }
            }

            // Fallback: abre no navegador padrão do sistema
            try
            {
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            }
            catch (Exception ex)
            {
                Log("Erro ao acionar navegador padrão: " + ex.Message);
            }
        }

        public static void MinimizeAppWindow()
        {
            if (browserProcess != null && !browserProcess.HasExited && browserProcess.MainWindowHandle != IntPtr.Zero)
            {
                ShowWindow(browserProcess.MainWindowHandle, SW_MINIMIZE);
            }
        }

        private static string FindChromiumBrowser()
        {
            string[] paths = new string[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Microsoft", "Edge", "Application", "msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Microsoft", "Edge", "Application", "msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Google", "Chrome", "Application", "chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Google", "Chrome", "Application", "chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Microsoft", "Edge", "Application", "msedge.exe")
            };

            foreach (var p in paths)
            {
                if (File.Exists(p)) return p;
            }
            return null;
        }

        private static void SetupTrayIcon()
        {
            BuildTrayMenu();

            Icon appIcon = LoadAppIcon();

            trayIcon = new NotifyIcon
            {
                Icon = appIcon,
                Text = AppTitle + " (" + L("status_operational") + ")",
                ContextMenuStrip = trayMenu,
                Visible = true
            };

            trayIcon.DoubleClick += (s, e) => LaunchAppWindow();

            trayIcon.ShowBalloonTip(
                4000,
                AppTitle,
                L("balloon_active"),
                ToolTipIcon.Info);
        }

        private static void BuildTrayMenu()
        {
            if (trayMenu == null)
            {
                trayMenu = new ContextMenuStrip();
                trayMenu.BackColor = Color.FromArgb(16, 24, 39);
                trayMenu.ForeColor = Color.FromArgb(248, 250, 252);
                trayMenu.ShowImageMargin = false;
            }
            trayMenu.Items.Clear();

            var titleItem = new ToolStripMenuItem(string.Format("{0} ({1})", AppTitle, AppVersion))
            {
                Enabled = false,
                Font = new Font("Segoe UI", 8.5f, FontStyle.Bold),
                ForeColor = Color.FromArgb(32, 201, 151)
            };
            trayMenu.Items.Add(titleItem);
            trayMenu.Items.Add(new ToolStripSeparator());

            var openItem = new ToolStripMenuItem(L("tray_open"), null, (s, e) => LaunchAppWindow())
            {
                Font = new Font("Segoe UI", 9f, FontStyle.Bold)
            };
            trayMenu.Items.Add(openItem);

            var minimizeItem = new ToolStripMenuItem(L("tray_minimize"), null, (s, e) => MinimizeAppWindow());
            trayMenu.Items.Add(minimizeItem);

            var restartItem = new ToolStripMenuItem(L("tray_restart"), null, (s, e) => RestartServices());
            trayMenu.Items.Add(restartItem);

            var externalItem = new ToolStripMenuItem(L("tray_external"), null, (s, e) =>
            {
                Process.Start(new ProcessStartInfo(string.Format("http://127.0.0.1:{0}?lang={1}", WebPort, currentLocale)) { UseShellExecute = true });
            });
            trayMenu.Items.Add(externalItem);

            var logsItem = new ToolStripMenuItem(L("tray_logs"), null, (s, e) =>
            {
                Process.Start(new ProcessStartInfo("explorer.exe", "\"" + logsDir + "\"") { UseShellExecute = true });
            });
            trayMenu.Items.Add(logsItem);

            trayMenu.Items.Add(new ToolStripSeparator());

            // Submenu de Seleção de Idioma
            var langMenu = new ToolStripMenuItem(L("tray_language"));
            langMenu.DropDownItems.Add(CreateLangMenuItem("🇧🇷  Português (Brasil)", "pt-BR"));
            langMenu.DropDownItems.Add(CreateLangMenuItem("🇺🇸  English (US)", "en"));
            langMenu.DropDownItems.Add(CreateLangMenuItem("🇪🇸  Español", "es"));
            langMenu.DropDownItems.Add(CreateLangMenuItem("🇫🇷  Français", "fr"));
            langMenu.DropDownItems.Add(CreateLangMenuItem("🇩🇪  Deutsch", "de"));
            trayMenu.Items.Add(langMenu);

            var statusItem = new ToolStripMenuItem(L("tray_status"), null, (s, e) => ShowStatusDialog());
            trayMenu.Items.Add(statusItem);

            trayMenu.Items.Add(new ToolStripSeparator());

            var exitItem = new ToolStripMenuItem(L("tray_exit"), null, (s, e) => ExitApplication())
            {
                ForeColor = Color.FromArgb(251, 113, 133)
            };
            trayMenu.Items.Add(exitItem);
        }

        private static ToolStripMenuItem CreateLangMenuItem(string text, string code)
        {
            var item = new ToolStripMenuItem(text, null, (s, e) =>
            {
                SaveLocale(code);
                BuildTrayMenu();
                if (trayIcon != null)
                {
                    trayIcon.Text = AppTitle + " (" + L("status_operational") + ")";
                    trayIcon.ShowBalloonTip(3000, AppTitle, L("lang_changed"), ToolTipIcon.Info);
                }
            });
            item.Checked = (string.Equals(currentLocale, code, StringComparison.OrdinalIgnoreCase) ||
                            (code == "pt-BR" && currentLocale.StartsWith("pt", StringComparison.OrdinalIgnoreCase)));
            return item;
        }

        private static Icon LoadAppIcon()
        {
            string iconPath = Path.Combine(appRootDir, "desktop", "ctrl-farm", "icon.ico");
            if (File.Exists(iconPath))
            {
                try { return new Icon(iconPath); } catch { }
            }
            return SystemIcons.Application;
        }

        private static void ShowStatusDialog()
        {
            bool db = IsPortOpen(DbPort, 600);
            bool api = IsPortOpen(ApiPort, 600);
            bool web = IsPortOpen(WebPort, 600);
            bool cam = IsPortOpen(8890, 600) || IsPortOpen(9998, 600);

            string webDetails = web ? "🟢 " + L("status_operational") : "🔴 " + L("status_offline");
            if (!web)
            {
                try
                {
                    string logFile = Path.Combine(logsDir, "web.log");
                    if (!File.Exists(logFile) && !string.IsNullOrEmpty(appRootDir))
                    {
                        logFile = Path.Combine(appRootDir, "logs", "web.log");
                    }
                    if (File.Exists(logFile))
                    {
                        string[] lines = File.ReadAllLines(logFile);
                        if (lines.Length > 0)
                        {
                            string last = lines[lines.Length - 1].Trim();
                            if (!string.IsNullOrEmpty(last))
                            {
                                webDetails += string.Format(" ({0})", last.Length > 60 ? last.Substring(0, 60) + "..." : last);
                            }
                        }
                    }
                }
                catch { }
            }

            string msg = string.Format(
                "{0}\n\n" +
                L("status_db") + "\n" +
                L("status_api") + "\n" +
                L("status_web") + "\n" +
                L("status_cam") + "\n\n" +
                L("status_install_dir") + "\n" +
                L("status_logs_dir"),
                L("status_title"),
                db ? "🟢 " + L("status_connected") : "🔴 " + L("status_offline"),
                api ? "🟢 " + L("status_operational") : "🔴 " + L("status_offline"),
                webDetails,
                cam ? "🟢 " + L("status_active") : "⚪ " + L("status_offline"),
                appRootDir,
                logsDir);

            MessageBox.Show(msg, "Diagnóstico do Sistema - " + AppTitle, MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        private static void RestartServices()
        {
            KillProcessTree(apiProcess);
            KillProcessTree(webProcess);
            KillProcessTree(mediamtxProcess);

            apiProcess = null;
            webProcess = null;
            mediamtxProcess = null;

            Thread.Sleep(1500);
            StartMediaMtxService();
            StartApiProcess();
            StartWebProcess();

            if (trayIcon != null)
            {
                trayIcon.ShowBalloonTip(3000, AppTitle, "Serviços locais reiniciados com sucesso!", ToolTipIcon.Info);
            }
        }

        public static void ExitApplication()
        {
            Log("Encerrando aplicação e finalizando todos os processos filhos silenciosamente...");
            if (trayIcon != null)
            {
                trayIcon.Visible = false;
                trayIcon.Dispose();
            }

            KillProcessTree(apiProcess);
            KillProcessTree(webProcess);
            KillProcessTree(mediamtxProcess);

            if (!string.IsNullOrEmpty(portablePgCtlExe) && !string.IsNullOrEmpty(portablePgDataDir))
            {
                try
                {
                    ProcessStartInfo stopPsi = new ProcessStartInfo(portablePgCtlExe, string.Format("stop -D \"{0}\" -m fast", portablePgDataDir))
                    {
                        CreateNoWindow = true,
                        UseShellExecute = false,
                        WindowStyle = ProcessWindowStyle.Hidden
                    };
                    Process stopProc = Process.Start(stopPsi);
                    stopProc.WaitForExit(4000);
                    Log("PostgreSQL Portátil finalizado com sucesso.");
                }
                catch { }
            }

            if (appMutex != null)
            {
                try { appMutex.ReleaseMutex(); } catch { }
                appMutex.Dispose();
            }

            Environment.Exit(0);
        }

        private static void KillProcessTree(Process p)
        {
            if (p == null) return;
            try
            {
                if (!p.HasExited)
                {
                    ProcessStartInfo psi = new ProcessStartInfo
                    {
                        FileName = "taskkill",
                        Arguments = string.Format("/PID {0} /T /F", p.Id),
                        CreateNoWindow = true,
                        UseShellExecute = false,
                        WindowStyle = ProcessWindowStyle.Hidden
                    };
                    Process killer = Process.Start(psi);
                    if (killer != null)
                    {
                        killer.WaitForExit(3000);
                    }
                }
            }
            catch { }
        }
    }

    public class SplashForm : Form
    {
        private int currentProgress = 15;
        private string currentStatus = "Inicializando serviços locais...";
        private Icon appIcon;

        public SplashForm()
        {
            this.FormBorderStyle = FormBorderStyle.None;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.Size = new Size(680, 380);
            this.BackColor = Color.FromArgb(10, 15, 27); // #0a0f1b Dark Industrial
            this.ShowInTaskbar = true;
            this.TopMost = true;

            this.SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.UserPaint | ControlStyles.DoubleBuffer | ControlStyles.OptimizedDoubleBuffer, true);

            try
            {
                string iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "icon.ico");
                if (File.Exists(iconPath))
                {
                    appIcon = new Icon(iconPath);
                }
            }
            catch { }
        }

        public void SetProgress(string status, int progress)
        {
            currentStatus = status;
            currentProgress = Math.Min(100, Math.Max(0, progress));
            this.Invalidate();
        }

        public void SetStatus(string status)
        {
            currentStatus = status;
            this.Invalidate();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;

            int w = this.Width;
            int h = this.Height;

            // 1. Fundo Gradiente Industrial Profundo
            using (var bgBrush = new LinearGradientBrush(new Rectangle(0, 0, w, h), Color.FromArgb(12, 18, 32), Color.FromArgb(8, 12, 22), 90f))
            {
                g.FillRectangle(bgBrush, 0, 0, w, h);
            }

            // 2. Moldura e Cantos Decorativos Estilo Cyber HUD (┌ ┐ └ ┘)
            using (var framePen = new Pen(Color.FromArgb(30, 41, 59), 1.5f)) // #1e293b
            {
                g.DrawRectangle(framePen, 8, 8, w - 16, h - 16);
            }

            using (var cornerPen = new Pen(Color.FromArgb(32, 201, 151), 2.5f)) // #20c997
            {
                // Top-Left
                g.DrawLine(cornerPen, 8, 28, 8, 8);
                g.DrawLine(cornerPen, 8, 8, 28, 8);
                // Top-Right
                g.DrawLine(cornerPen, w - 28, 8, w - 8, 8);
                g.DrawLine(cornerPen, w - 8, 8, w - 8, 28);
                // Bottom-Left
                g.DrawLine(cornerPen, 8, h - 28, 8, h - 8);
                g.DrawLine(cornerPen, 8, h - 8, 28, h - 8);
                // Bottom-Right
                g.DrawLine(cornerPen, w - 28, h - 8, w - 8, h - 8);
                g.DrawLine(cornerPen, w - 8, h - 8, w - 8, h - 28);
            }

            // Controles decorativos no topo direito (Ranhuras ventilação, minimizar e fechar)
            using (var ventPen = new Pen(Color.FromArgb(51, 65, 85), 1.5f))
            {
                for (int i = 0; i < 5; i++)
                {
                    g.DrawLine(ventPen, w - 110 + (i * 6), 22, w - 106 + (i * 6), 16);
                }
            }
            using (var ctrlPen = new Pen(Color.FromArgb(100, 116, 139), 1.8f))
            {
                // Minimize: —
                g.DrawLine(ctrlPen, w - 62, 20, w - 50, 20);
                // Close: ✕
                g.DrawLine(ctrlPen, w - 34, 15, w - 24, 25);
                g.DrawLine(ctrlPen, w - 24, 15, w - 34, 25);
            }

            // 3. Grid Isométrico e Ícone da Impressora 3D Holográfica
            int iconX = 40;
            int iconY = 38;
            int iconSize = 74;

            // Grid holográfico de fundo
            using (var gridPen = new Pen(Color.FromArgb(18, 45, 45), 1f))
            {
                for (int gx = 0; gx <= iconSize; gx += 12)
                {
                    g.DrawLine(gridPen, iconX + gx, iconY, iconX + gx, iconY + iconSize);
                }
                for (int gy = 0; gy <= iconSize; gy += 12)
                {
                    g.DrawLine(gridPen, iconX, iconY + gy, iconX + iconSize, iconY + gy);
                }
            }

            // Moldura holográfica ao redor da impressora 3D
            using (var iconBorderPen = new Pen(Color.FromArgb(32, 201, 151), 1.2f))
            {
                g.DrawRectangle(iconBorderPen, iconX, iconY, iconSize, iconSize);
            }

            // Desenho vetorial da Impressora 3D isométrica em neon
            using (var printerPen = new Pen(Color.FromArgb(32, 201, 151), 2.2f))
            using (var partPen = new Pen(Color.FromArgb(56, 189, 248), 1.8f))
            using (var glowBrush = new SolidBrush(Color.FromArgb(32, 201, 151)))
            {
                printerPen.StartCap = LineCap.Round;
                printerPen.EndCap = LineCap.Round;

                // Cubo isométrico externo da impressora
                // Topo
                Point[] topFace = new Point[]
                {
                    new Point(iconX + 37, iconY + 12),
                    new Point(iconX + 60, iconY + 23),
                    new Point(iconX + 37, iconY + 34),
                    new Point(iconX + 14, iconY + 23)
                };
                g.DrawPolygon(printerPen, topFace);

                // Pilares verticais
                g.DrawLine(printerPen, iconX + 14, iconY + 23, iconX + 14, iconY + 54);
                g.DrawLine(printerPen, iconX + 60, iconY + 23, iconX + 60, iconY + 54);
                g.DrawLine(printerPen, iconX + 37, iconY + 34, iconX + 37, iconY + 65);

                // Base inferior
                g.DrawLine(printerPen, iconX + 14, iconY + 54, iconX + 37, iconY + 65);
                g.DrawLine(printerPen, iconX + 37, iconY + 65, iconX + 60, iconY + 54);

                // Eixo X/Y e Cabeçote de Impressão (Extrusora)
                g.DrawLine(partPen, iconX + 25, iconY + 29, iconX + 49, iconY + 40);
                g.FillEllipse(glowBrush, iconX + 34, iconY + 31, 7, 7);

                // Peça sendo impressa na mesa (bloco neon)
                Point[] piece = new Point[]
                {
                    new Point(iconX + 37, iconY + 45),
                    new Point(iconX + 44, iconY + 49),
                    new Point(iconX + 37, iconY + 53),
                    new Point(iconX + 30, iconY + 49)
                };
                g.DrawPolygon(partPen, piece);
            }

            // 4. Tipografia do Cabeçalho
            int textX = iconX + iconSize + 22;

            using (var titleFont = new Font("Segoe UI", 28, FontStyle.Bold))
            using (var titleBrush = new SolidBrush(Color.FromArgb(32, 201, 151))) // #20c997
            {
                g.DrawString("CTRL+Farm", titleFont, titleBrush, textX, iconY - 4);
            }

            using (var subFont = new Font("Segoe UI", 9.5f, FontStyle.Regular))
            using (var subBrush = new SolidBrush(Color.FromArgb(148, 163, 184))) // #94a3b8
            {
                g.DrawString("Plataforma Industrial de Impressão 3D • Gestão Integrada v1.0.0-Beta", subFont, subBrush, textX + 2, iconY + 48);
            }

            // 5. Barra de Progresso Futurista (Pill com Halo Neon)
            int barX = 40;
            int barY = 175;
            int barW = w - 80;
            int barH = 20;

            // Halo / Glow suave externo da barra
            using (var glowPen = new Pen(Color.FromArgb(35, 32, 201, 151), 6f))
            using (var barPath = GetRoundedRectPath(new Rectangle(barX, barY, barW, barH), 10))
            {
                g.DrawPath(glowPen, barPath);
            }

            // Fundo escuro da barra
            using (var barBgBrush = new SolidBrush(Color.FromArgb(15, 23, 42))) // #0f172a
            using (var barBorderPen = new Pen(Color.FromArgb(30, 58, 70), 1.5f))
            using (var barPath = GetRoundedRectPath(new Rectangle(barX, barY, barW, barH), 10))
            {
                g.FillPath(barBgBrush, barPath);
                g.DrawPath(barBorderPen, barPath);
            }

            // Preenchimento do progresso em gradiente neon
            int fillW = Math.Max(16, (int)((barW - 4) * (currentProgress / 100.0)));
            using (var fillBrush = new LinearGradientBrush(new Rectangle(barX + 2, barY + 2, fillW, barH - 4), Color.FromArgb(32, 201, 151), Color.FromArgb(74, 222, 128), 0f))
            using (var fillPath = GetRoundedRectPath(new Rectangle(barX + 2, barY + 2, fillW, barH - 4), 8))
            {
                g.FillPath(fillBrush, fillPath);
            }

            // Ponto de luz brilhante na ponta do progresso
            if (currentProgress > 4)
            {
                using (var tipBrush = new SolidBrush(Color.FromArgb(240, 253, 250)))
                {
                    g.FillEllipse(tipBrush, barX + fillW - 8, barY + 5, 8, 8);
                }
            }

            // Badge Flutuante de Porcentagem (ex: "84%")
            int badgeW = 48;
            int badgeH = 22;
            int badgeX = Math.Min(barX + barW - badgeW, Math.Max(barX + 4, barX + fillW - (badgeW / 2)));
            int badgeY = barY - 28;

            using (var badgeBg = new SolidBrush(Color.FromArgb(30, 41, 59))) // #1e293b
            using (var badgeBorder = new Pen(Color.FromArgb(51, 65, 85), 1.2f))
            using (var badgePath = GetRoundedRectPath(new Rectangle(badgeX, badgeY, badgeW, badgeH), 8))
            {
                g.FillPath(badgeBg, badgePath);
                g.DrawPath(badgeBorder, badgePath);
            }

            using (var badgeFont = new Font("Segoe UI", 8.5f, FontStyle.Bold))
            using (var badgeTextBrush = new SolidBrush(Color.FromArgb(203, 213, 225)))
            {
                string pctText = currentProgress + "%";
                SizeF pctSize = g.MeasureString(pctText, badgeFont);
                g.DrawString(pctText, badgeFont, badgeTextBrush, badgeX + ((badgeW - pctSize.Width) / 2), badgeY + ((badgeH - pctSize.Height) / 2));
            }

            // 6. Mensagem Dinâmica Centralizada
            using (var statusFont = new Font("Segoe UI", 12f, FontStyle.Regular))
            using (var statusBrush = new SolidBrush(Color.FromArgb(203, 213, 225))) // #cbd5e1
            {
                SizeF statusSize = g.MeasureString(currentStatus, statusFont);
                g.DrawString(currentStatus, statusFont, statusBrush, (w - statusSize.Width) / 2, barY + 36);
            }

            // 7. Cards de Status Inferiores (3 Pílulas Horizontais)
            int cardY = h - 68;
            int cardH = 38;
            int cardW = 186;
            int spacing = 18;
            int startX = (w - (3 * cardW + 2 * spacing)) / 2;

            DrawStatusCard(g, startX, cardY, cardW, cardH, "🗄️", Program.L("card_db"), Program.L("card_db_val"), Color.FromArgb(32, 201, 151));
            DrawStatusCard(g, startX + cardW + spacing, cardY, cardW, cardH, "📹", Program.L("card_cam"), Program.L("card_cam_val"), Color.FromArgb(32, 201, 151));
            DrawStatusCard(g, startX + 2 * (cardW + spacing), cardY, cardW, cardH, "🔗", Program.L("card_ports"), "3000 / 3001", Color.FromArgb(56, 189, 248));
        }

        private void DrawStatusCard(Graphics g, int x, int y, int w, int h, string icon, string label, string val, Color valColor)
        {
            using (var cardBg = new SolidBrush(Color.FromArgb(16, 24, 42))) // #10182a
            using (var cardBorder = new Pen(Color.FromArgb(30, 45, 68), 1.2f))
            using (var path = GetRoundedRectPath(new Rectangle(x, y, w, h), 8))
            {
                g.FillPath(cardBg, path);
                g.DrawPath(cardBorder, path);
            }

            using (var iconFont = new Font("Segoe UI Emoji", 10, FontStyle.Regular))
            using (var labelFont = new Font("Segoe UI", 8.5f, FontStyle.Regular))
            using (var valFont = new Font("Segoe UI", 8.5f, FontStyle.Bold))
            using (var labelBrush = new SolidBrush(Color.FromArgb(148, 163, 184)))
            using (var valBrush = new SolidBrush(valColor))
            {
                g.DrawString(icon, iconFont, Brushes.White, x + 8, y + 8);
                g.DrawString(label, labelFont, labelBrush, x + 30, y + 10);
                SizeF labelSize = g.MeasureString(label, labelFont);
                g.DrawString(val, valFont, valBrush, x + 30 + labelSize.Width - 2, y + 10);
            }
        }

        private static GraphicsPath GetRoundedRectPath(Rectangle rect, int radius)
        {
            GraphicsPath path = new GraphicsPath();
            int d = radius * 2;
            path.AddArc(rect.X, rect.Y, d, d, 180, 90);
            path.AddArc(rect.Right - d, rect.Y, d, d, 270, 90);
            path.AddArc(rect.Right - d, rect.Bottom - d, d, d, 0, 90);
            path.AddArc(rect.X, rect.Bottom - d, d, d, 90, 90);
            path.CloseFigure();
            return path;
        }
    }
}
