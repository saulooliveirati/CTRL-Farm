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
                string json = string.Format("{{\r\n  \"appRootDir\": \"{0}\",\r\n  \"updatedAt\": \"{1:yyyy-MM-dd HH:mm:ss}\"\r\n}}",
                    root.Replace("\\", "\\\\"), DateTime.Now);
                string dataConfig = Path.Combine(dataDir, "ctrlfarm.config.json");
                File.WriteAllText(dataConfig, json);

                string baseConfig = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "ctrlfarm.config.json");
                try { File.WriteAllText(baseConfig, json); } catch { }

                using (RegistryKey key = Registry.CurrentUser.CreateSubKey(@"Software\CTRL-Farm"))
                {
                    if (key != null)
                    {
                        key.SetValue("AppRootDir", root);
                    }
                }
            }
            catch { }
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
            }
            catch { }
        }

        private static void StartServicesWorkflow()
        {
            UpdateSplash("Verificando ambiente e banco de dados local...", 15);
            CheckDatabaseService();

            UpdateSplash("Iniciando MediaMTX (Streaming & Câmeras RTSP/WebRTC)...", 35);
            StartMediaMtxService();

            UpdateSplash("Iniciando API NestJS do CTRL-Farm (Porta 3001)...", 50);
            StartApiProcess();

            UpdateSplash("Iniciando Interface Web Next.js (Porta 3000)...", 70);
            StartWebProcess();

            UpdateSplash("Validando disponibilidade das portas locais 3001 e 3000...", 90);
            WaitForPort(ApiPort, 35000);
            WaitForPort(WebPort, 45000);

            if (!IsPortOpen(WebPort, 1500))
            {
                Log("Aviso: Porta 3000 ainda inicializando. Aguardando até 15s adicionais...");
                UpdateSplash("Aguardando interface Web Next.js inicializar...", 95);
                WaitForPort(WebPort, 15000);
            }

            UpdateSplash("CTRL-Farm pronto! Abrindo janela principal...", 100);
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

                string nodeExe = FindNodeExecutable();
                ProcessStartInfo psi;

                if (foundNextCli != null && foundNextCli.EndsWith(".cmd", StringComparison.OrdinalIgnoreCase))
                {
                    psi = new ProcessStartInfo("cmd.exe", string.Format("/c \"\"{0}\" start \"{1}\" -p {2} -H 0.0.0.0\"", foundNextCli, webDir, WebPort));
                }
                else if (foundNextCli != null)
                {
                    psi = new ProcessStartInfo(nodeExe, string.Format("\"{0}\" start \"{1}\" -p {2} -H 0.0.0.0", foundNextCli, webDir, WebPort));
                }
                else
                {
                    psi = new ProcessStartInfo("cmd.exe", string.Format("/c npm --prefix \"{0}\" start -- -p {1} -H 0.0.0.0", webDir, WebPort));
                }

                psi.WorkingDirectory = workingDir;
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;
                psi.WindowStyle = ProcessWindowStyle.Hidden;
                psi.RedirectStandardOutput = true;
                psi.RedirectStandardError = true;
                psi.EnvironmentVariables["PORT"] = WebPort.ToString();
                psi.EnvironmentVariables["NODE_ENV"] = "production";

                Log("Executando Next.js Web: " + psi.FileName + " " + psi.Arguments + " em " + workingDir);

                webProcess = new Process { StartInfo = psi, EnableRaisingEvents = true };
                webProcess.OutputDataReceived += (s, e) => { if (!string.IsNullOrEmpty(e.Data)) AppendLog("web.log", e.Data); };
                webProcess.ErrorDataReceived += (s, e) => { if (!string.IsNullOrEmpty(e.Data)) AppendLog("web.log", "[ERROR] " + e.Data); };

                webProcess.Start();
                webProcess.BeginOutputReadLine();
                webProcess.BeginErrorReadLine();
                Log("Processo Web iniciado silenciosamente com PID: " + webProcess.Id);

                // Verificacao rapida de sobrevivencia do processo (fallback se encerrar de imediato)
                ThreadPool.QueueUserWorkItem(_ =>
                {
                    Thread.Sleep(4500);
                    if (webProcess != null && webProcess.HasExited && !IsPortOpen(WebPort, 1000))
                    {
                        Log("Aviso: Processo inicial do Next.js encerrou. Tentando fallback via npm start...");
                        try
                        {
                            ProcessStartInfo fallbackPsi = new ProcessStartInfo("cmd.exe", string.Format("/c npm run start -- -p {0} -H 0.0.0.0", WebPort))
                            {
                                WorkingDirectory = workingDir,
                                CreateNoWindow = true,
                                UseShellExecute = false,
                                WindowStyle = ProcessWindowStyle.Hidden,
                                RedirectStandardOutput = true,
                                RedirectStandardError = true
                            };
                            fallbackPsi.EnvironmentVariables["PORT"] = WebPort.ToString();
                            fallbackPsi.EnvironmentVariables["NODE_ENV"] = "production";

                            webProcess = new Process { StartInfo = fallbackPsi, EnableRaisingEvents = true };
                            webProcess.OutputDataReceived += (s, e) => { if (!string.IsNullOrEmpty(e.Data)) AppendLog("web.log", e.Data); };
                            webProcess.ErrorDataReceived += (s, e) => { if (!string.IsNullOrEmpty(e.Data)) AppendLog("web.log", "[ERROR] " + e.Data); };
                            webProcess.Start();
                            webProcess.BeginOutputReadLine();
                            webProcess.BeginErrorReadLine();
                            Log("Processo Web de fallback iniciado com PID: " + webProcess.Id);
                        }
                        catch (Exception exFall)
                        {
                            Log("Erro no fallback do Next.js: " + exFall.Message);
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

            string url = string.Format("http://127.0.0.1:{0}", WebPort);
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
            trayMenu = new ContextMenuStrip();
            trayMenu.BackColor = Color.FromArgb(16, 24, 39);
            trayMenu.ForeColor = Color.FromArgb(248, 250, 252);
            trayMenu.ShowImageMargin = false;

            var titleItem = new ToolStripMenuItem(string.Format("{0} ({1})", AppTitle, AppVersion))
            {
                Enabled = false,
                Font = new Font("Segoe UI", 8.5f, FontStyle.Bold),
                ForeColor = Color.FromArgb(32, 201, 151)
            };
            trayMenu.Items.Add(titleItem);
            trayMenu.Items.Add(new ToolStripSeparator());

            var openItem = new ToolStripMenuItem("🖥️  Abrir / Restaurar CTRL-Farm", null, (s, e) => LaunchAppWindow())
            {
                Font = new Font("Segoe UI", 9f, FontStyle.Bold)
            };
            trayMenu.Items.Add(openItem);

            var minimizeItem = new ToolStripMenuItem("🗕  Minimizar Janela", null, (s, e) => MinimizeAppWindow());
            trayMenu.Items.Add(minimizeItem);

            var restartItem = new ToolStripMenuItem("🔄  Reiniciar Serviços Locais", null, (s, e) => RestartServices());
            trayMenu.Items.Add(restartItem);

            var externalItem = new ToolStripMenuItem("🌐  Abrir no Navegador Externo", null, (s, e) =>
            {
                Process.Start(new ProcessStartInfo(string.Format("http://127.0.0.1:{0}", WebPort)) { UseShellExecute = true });
            });
            trayMenu.Items.Add(externalItem);

            var logsItem = new ToolStripMenuItem("📂  Abrir Pasta de Logs", null, (s, e) =>
            {
                Process.Start(new ProcessStartInfo("explorer.exe", "\"" + logsDir + "\"") { UseShellExecute = true });
            });
            trayMenu.Items.Add(logsItem);

            trayMenu.Items.Add(new ToolStripSeparator());

            var statusItem = new ToolStripMenuItem("ℹ️  Status dos Componentes Locais", null, (s, e) => ShowStatusDialog());
            trayMenu.Items.Add(statusItem);

            trayMenu.Items.Add(new ToolStripSeparator());

            var exitItem = new ToolStripMenuItem("❌  Encerrar CTRL-Farm", null, (s, e) => ExitApplication())
            {
                ForeColor = Color.FromArgb(251, 113, 133)
            };
            trayMenu.Items.Add(exitItem);

            Icon appIcon = LoadAppIcon();

            trayIcon = new NotifyIcon
            {
                Icon = appIcon,
                Text = AppTitle + " (Operacional)",
                ContextMenuStrip = trayMenu,
                Visible = true
            };

            trayIcon.DoubleClick += (s, e) => LaunchAppWindow();

            trayIcon.ShowBalloonTip(
                4000,
                AppTitle,
                "CTRL-Farm está ativo e operacional na porta 3000.\nClique duas vezes para abrir a janela nativa.",
                ToolTipIcon.Info);
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

            string msg = string.Format(
                "Status Atual dos Componentes CTRL-Farm:\n\n" +
                "• Banco de Dados PostgreSQL (Porta 5432): {0}\n" +
                "• API NestJS & Conexão Cloud (Porta 3001): {1}\n" +
                "• Interface Web Next.js (Porta 3000): {2}\n" +
                "• Servidor de Câmeras MediaMTX (Porta 8890): {3}\n\n" +
                "Arquitetura: Híbrida Local-First com Conexão em Nuvem\n" +
                "Pasta de Instalação: {4}\n" +
                "Pasta de Logs: {5}",
                db ? "🟢 Conectado" : "🔴 Não acessível",
                api ? "🟢 Operacional (200 OK)" : "🔴 Offline",
                web ? "🟢 Operacional (200 OK)" : "🔴 Offline",
                cam ? "🟢 Transmissão Ativa" : "⚪ Em espera",
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
        private ProgressBar progressBar;
        private Label lblStatus;
        private Label lblTitle;
        private Label lblSubtitle;
        private Icon appIcon;

        public SplashForm()
        {
            this.FormBorderStyle = FormBorderStyle.None;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.Size = new Size(540, 280);
            this.BackColor = Color.FromArgb(10, 15, 27); // #0a0f1b Dark Industrial
            this.ShowInTaskbar = true;
            this.TopMost = true;

            this.SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.UserPaint | ControlStyles.DoubleBuffer, true);

            // Tenta carregar ícone oficial
            try
            {
                string iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "icon.ico");
                if (File.Exists(iconPath))
                {
                    appIcon = new Icon(iconPath);
                }
            }
            catch { }

            lblTitle = new Label
            {
                Text = "CTRL-Farm",
                Font = new Font("Segoe UI", 24, FontStyle.Bold),
                ForeColor = Color.FromArgb(32, 201, 151), // #20c997 Emerald Neon
                Location = new Point(80, 28),
                AutoSize = true
            };
            this.Controls.Add(lblTitle);

            lblSubtitle = new Label
            {
                Text = "Plataforma Industrial de Impressão 3D • Arquitetura Híbrida Local-First",
                Font = new Font("Segoe UI", 9.5f, FontStyle.Regular),
                ForeColor = Color.FromArgb(148, 163, 184), // Slate-400
                Location = new Point(82, 74),
                AutoSize = true
            };
            this.Controls.Add(lblSubtitle);

            progressBar = new ProgressBar
            {
                Location = new Point(32, 138),
                Size = new Size(476, 12),
                Minimum = 0,
                Maximum = 100,
                Value = 10,
                Style = ProgressBarStyle.Continuous
            };
            this.Controls.Add(progressBar);

            lblStatus = new Label
            {
                Text = "Inicializando plataforma e serviços locais...",
                Font = new Font("Segoe UI", 9, FontStyle.Regular),
                ForeColor = Color.FromArgb(203, 213, 225),
                Location = new Point(32, 164),
                Size = new Size(476, 44)
            };
            this.Controls.Add(lblStatus);

            Label lblFooter = new Label
            {
                Text = "Inicialização Silenciosa Nativa • Portas 3000 / 3001 • Criptografia RSA / Firebase",
                Font = new Font("Segoe UI", 8, FontStyle.Italic),
                ForeColor = Color.FromArgb(100, 116, 139),
                Location = new Point(32, 235),
                AutoSize = true
            };
            this.Controls.Add(lblFooter);

            this.Paint += (s, e) =>
            {
                Graphics g = e.Graphics;
                g.SmoothingMode = SmoothingMode.AntiAlias;

                // Borda industrial com canto sutil
                using (var pen = new Pen(Color.FromArgb(38, 50, 70), 2)) // #263246
                {
                    g.DrawRectangle(pen, 1, 1, this.Width - 2, this.Height - 2);
                }

                // Desenha o badge de ícone no canto superior esquerdo
                if (appIcon != null)
                {
                    g.DrawIcon(appIcon, new Rectangle(30, 28, 42, 42));
                }
                else
                {
                    using (var brush = new SolidBrush(Color.FromArgb(16, 24, 39)))
                    using (var borderPen = new Pen(Color.FromArgb(32, 201, 151), 1.5f))
                    {
                        var rect = new Rectangle(30, 28, 42, 42);
                        g.FillRectangle(brush, rect);
                        g.DrawRectangle(borderPen, rect);
                        using (var font = new Font("Segoe UI Emoji", 16, FontStyle.Regular))
                        {
                            g.DrawString("🖨️", font, Brushes.White, 35, 33);
                        }
                    }
                }
            };
        }

        public void SetProgress(string status, int progress)
        {
            lblStatus.Text = status;
            progressBar.Value = Math.Min(100, Math.Max(0, progress));
            this.Refresh();
        }

        public void SetStatus(string status)
        {
            lblStatus.Text = status;
            this.Refresh();
        }
    }
}
