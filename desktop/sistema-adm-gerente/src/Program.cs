using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net.Sockets;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;

namespace SistemaAdmGerente.Desktop
{
    static class Program
    {
        private const string AppTitle = "Sistema ADM Gerente";
        private const string AppSubtitle = "Licenças, Assinaturas, Clientes & Segurança";
        private const string AppVersion = "v1.0.0-BETA";
        private const string MutexId = "Global\\SISTEMA_ADM_GERENTE_SINGLE_INSTANCE";
        private const int ApiPort = 4001;
        private const int WebPort = 4000;
        private const int DbPort = 5432;

        private static Mutex appMutex;
        private static NotifyIcon trayIcon;
        private static ContextMenuStrip trayMenu;
        private static Process apiProcess;
        private static Process webProcess;
        private static Process browserProcess;
        private static string appRootDir;
        private static string admRootDir;
        private static string logsDir;
        private static SplashForm splashForm;

        [STAThread]
        static void Main()
        {
            bool createdNew;
            appMutex = new Mutex(true, MutexId, out createdNew);
            if (!createdNew)
            {
                MessageBox.Show(
                    "O Sistema ADM Gerente já está em execução no seu computador.\nVerifique o ícone na bandeja do sistema (perto do relógio).",
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
                    splashForm.Invoke((Action)(() =>
                    {
                        splashForm.SetStatus("Erro ao iniciar: " + ex.Message);
                        MessageBox.Show(
                            "Ocorreu um erro ao inicializar os serviços do Sistema ADM Gerente:\n\n" + ex.Message +
                            "\n\nConsulte os logs em: " + logsDir,
                            AppTitle,
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Error);
                        ExitApplication();
                    }));
                }
            });

            Application.Run();
        }

        private static void ResolvePaths()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;

            // Check if run from within sistema-adm-gerente folder
            if (Directory.Exists(Path.Combine(baseDir, "api")) && Directory.Exists(Path.Combine(baseDir, "web")))
            {
                admRootDir = baseDir;
                appRootDir = Path.GetFullPath(Path.Combine(baseDir, ".."));
            }
            // Check if run from workspace root
            else if (Directory.Exists(Path.Combine(baseDir, "sistema-adm-gerente")))
            {
                appRootDir = baseDir;
                admRootDir = Path.Combine(baseDir, "sistema-adm-gerente");
            }
            // Check if run from desktop\sistema-adm-gerente\dist
            else if (Directory.Exists(Path.Combine(baseDir, "..", "..", "sistema-adm-gerente")))
            {
                appRootDir = Path.GetFullPath(Path.Combine(baseDir, "..", ".."));
                admRootDir = Path.Combine(appRootDir, "sistema-adm-gerente");
            }
            else
            {
                admRootDir = baseDir;
                appRootDir = baseDir;
            }
        }

        private static void InitLogs()
        {
            try
            {
                string localApp = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                logsDir = Path.Combine(localApp, "Sistema-ADM-Gerente", "logs");
                if (!Directory.Exists(logsDir))
                {
                    Directory.CreateDirectory(logsDir);
                }
            }
            catch
            {
                logsDir = Path.GetTempPath();
            }
        }

        private static void Log(string message)
        {
            try
            {
                string line = string.Format("[{0:yyyy-MM-dd HH:mm:ss}] {1}{2}", DateTime.Now, message, Environment.NewLine);
                string logFile = Path.Combine(logsDir, "sistema-adm.log");
                File.AppendAllText(logFile, line);
            }
            catch { }
        }

        private static void StartServicesWorkflow()
        {
            UpdateSplash(10, "Verificando ambiente do sistema...");
            Log("=== Iniciando Sistema ADM Gerente " + AppVersion + " ===");
            Log("Diretório ADM: " + admRootDir);

            // 1. Check Node.js
            UpdateSplash(20, "Verificando runtime Node.js...");
            if (!CheckCommandAvailable("node"))
            {
                throw new Exception("Node.js não foi encontrado no sistema. Por favor instale o Node.js v18+.");
            }

            // 2. Check Database port
            UpdateSplash(35, "Verificando banco de dados PostgreSQL...");
            bool dbOnline = IsPortOpen("127.0.0.1", DbPort, 1500);
            if (!dbOnline)
            {
                Log("Aviso: Banco de Dados na porta 5432 não respondeu de imediato. Continuando...");
            }

            // 3. Start or attach ADM API (Port 4001)
            UpdateSplash(50, "Inicializando API Administrativa (Porta 4001)...");
            StartAdmApiIfNeeded();

            // 4. Start or attach ADM Web (Port 4000)
            UpdateSplash(70, "Inicializando Painel Web ADM (Porta 4000)...");
            StartAdmWebIfNeeded();

            // 5. Wait for Web and API readiness
            UpdateSplash(85, "Aguardando prontidão dos serviços e Firebase...");
            WaitForPort(ApiPort, 30);
            WaitForPort(WebPort, 30);

            // 6. Launch Desktop Window & Tray
            UpdateSplash(100, "Conectando interface...");
            Thread.Sleep(400);

            splashForm.Invoke((Action)(() =>
            {
                splashForm.Hide();
                SetupTrayIcon();
                LaunchChromiumAppWindow();
            }));
        }

        private static void StartAdmApiIfNeeded()
        {
            if (IsPortOpen("127.0.0.1", ApiPort, 1000))
            {
                Log("API do Sistema ADM já está em execução na porta " + ApiPort);
                return;
            }

            string apiDir = Path.Combine(admRootDir, "api");
            string mainJs = Path.Combine(apiDir, "dist", "main.js");

            ProcessStartInfo psi = new ProcessStartInfo();
            psi.WorkingDirectory = apiDir;
            psi.CreateNoWindow = true;
            psi.UseShellExecute = false;
            psi.RedirectStandardOutput = true;
            psi.RedirectStandardError = true;

            if (File.Exists(mainJs))
            {
                psi.FileName = "node";
                psi.Arguments = "dist/main.js";
                Log("Iniciando ADM API via node dist/main.js...");
            }
            else
            {
                psi.FileName = "cmd.exe";
                psi.Arguments = "/c pnpm start";
                Log("Iniciando ADM API via pnpm start...");
            }

            apiProcess = new Process();
            apiProcess.StartInfo = psi;
            apiProcess.OutputDataReceived += (s, e) => { if (!string.IsNullOrEmpty(e.Data)) Log("[API] " + e.Data); };
            apiProcess.ErrorDataReceived += (s, e) => { if (!string.IsNullOrEmpty(e.Data)) Log("[API-ERR] " + e.Data); };
            apiProcess.Start();
            apiProcess.BeginOutputReadLine();
            apiProcess.BeginErrorReadLine();
        }

        private static void StartAdmWebIfNeeded()
        {
            if (IsPortOpen("127.0.0.1", WebPort, 1000))
            {
                Log("Painel Web do Sistema ADM já está em execução na porta " + WebPort);
                return;
            }

            string webDir = Path.Combine(admRootDir, "web");

            ProcessStartInfo psi = new ProcessStartInfo();
            psi.WorkingDirectory = webDir;
            psi.CreateNoWindow = true;
            psi.UseShellExecute = false;
            psi.RedirectStandardOutput = true;
            psi.RedirectStandardError = true;

            string standaloneJs = Path.Combine(webDir, ".next", "standalone", "server.js");
            if (File.Exists(standaloneJs))
            {
                psi.FileName = "node";
                psi.Arguments = ".next/standalone/server.js";
                psi.EnvironmentVariables["PORT"] = "4000";
            }
            else
            {
                psi.FileName = "cmd.exe";
                psi.Arguments = "/c pnpm start";
            }

            Log("Iniciando ADM Web na porta 4000...");
            webProcess = new Process();
            webProcess.StartInfo = psi;
            webProcess.OutputDataReceived += (s, e) => { if (!string.IsNullOrEmpty(e.Data)) Log("[WEB] " + e.Data); };
            webProcess.ErrorDataReceived += (s, e) => { if (!string.IsNullOrEmpty(e.Data)) Log("[WEB-ERR] " + e.Data); };
            webProcess.Start();
            webProcess.BeginOutputReadLine();
            webProcess.BeginErrorReadLine();
        }

        private static void LaunchChromiumAppWindow()
        {
            string url = "http://localhost:4000";
            string edgePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe");
            string chromePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Google\Chrome\Application\chrome.exe");

            string userProfileDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Sistema-ADM-Gerente", "BrowserProfile");

            string targetBrowser = null;
            if (File.Exists(edgePath)) targetBrowser = edgePath;
            else if (File.Exists(chromePath)) targetBrowser = chromePath;

            if (targetBrowser != null)
            {
                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = targetBrowser,
                    Arguments = string.Format("--app={0} --user-data-dir=\"{1}\" --window-size=1440,900", url, userProfileDir),
                    UseShellExecute = false
                };
                browserProcess = Process.Start(psi);
                Log("Navegador Chromium iniciado em App Mode: " + targetBrowser);
            }
            else
            {
                Process.Start(url);
                Log("Navegador padrão acionado para URL: " + url);
            }
        }

        private static void SetupTrayIcon()
        {
            trayMenu = new ContextMenuStrip();
            trayMenu.BackColor = Color.FromArgb(16, 24, 39);
            trayMenu.ForeColor = Color.FromArgb(248, 250, 252);
            trayMenu.ShowImageMargin = false;

            ToolStripMenuItem itemOpen = new ToolStripMenuItem("🛡️ Abrir Sistema ADM Gerente");
            itemOpen.Font = new Font("Segoe UI", 9f, FontStyle.Bold);
            itemOpen.Click += (s, e) => { LaunchChromiumAppWindow(); };

            ToolStripMenuItem itemBrowser = new ToolStripMenuItem("🌐 Abrir no Navegador Externo");
            itemBrowser.Click += (s, e) => { Process.Start("http://localhost:4000"); };

            ToolStripMenuItem itemSwagger = new ToolStripMenuItem("📑 Documentação da API (Swagger)");
            itemSwagger.Click += (s, e) => { Process.Start("http://localhost:4001/docs"); };

            ToolStripMenuItem itemCheckFirebase = new ToolStripMenuItem("🔄 Forçar Checagem de Licenças & Firebase");
            itemCheckFirebase.Click += (s, e) =>
            {
                TriggerGlobalSync();
            };

            ToolStripMenuItem itemLogs = new ToolStripMenuItem("📝 Abrir Pasta de Logs");
            itemLogs.Click += (s, e) => { Process.Start(logsDir); };

            ToolStripMenuItem itemAbout = new ToolStripMenuItem("ℹ️ Sobre o ADM Gerente");
            itemAbout.Click += (s, e) =>
            {
                MessageBox.Show(
                    AppTitle + " - " + AppSubtitle + "\nVersão: " + AppVersion + "\n\n" +
                    "Painel Oficial de Gerenciamento e Emissão de Licenças RSA / Firebase\n" +
                    "Integração contínua com a Farm de Impressão 3D CTRL-Farm.",
                    AppTitle,
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information);
            };

            ToolStripMenuItem itemExit = new ToolStripMenuItem("❌ Encerrar Sistema e Serviços");
            itemExit.ForeColor = Color.FromArgb(251, 113, 133);
            itemExit.Click += (s, e) => { ExitApplication(); };

            trayMenu.Items.Add(itemOpen);
            trayMenu.Items.Add(itemBrowser);
            trayMenu.Items.Add(itemSwagger);
            trayMenu.Items.Add(new ToolStripSeparator());
            trayMenu.Items.Add(itemCheckFirebase);
            trayMenu.Items.Add(itemLogs);
            trayMenu.Items.Add(itemAbout);
            trayMenu.Items.Add(new ToolStripSeparator());
            trayMenu.Items.Add(itemExit);

            trayIcon = new NotifyIcon();
            trayIcon.Text = AppTitle + " " + AppVersion;
            trayIcon.ContextMenuStrip = trayMenu;
            trayIcon.Visible = true;

            // Load icon
            try
            {
                string iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "icon.ico");
                if (!File.Exists(iconPath))
                {
                    iconPath = Path.Combine(admRootDir, "icon.ico");
                }
                if (File.Exists(iconPath))
                {
                    trayIcon.Icon = new Icon(iconPath);
                }
                else
                {
                    trayIcon.Icon = SystemIcons.Shield;
                }
            }
            catch
            {
                trayIcon.Icon = SystemIcons.Shield;
            }

            trayIcon.DoubleClick += (s, e) => { LaunchChromiumAppWindow(); };
        }

        private static void TriggerGlobalSync()
        {
            ThreadPool.QueueUserWorkItem(_ =>
            {
                try
                {
                    System.Net.HttpWebRequest req = (System.Net.HttpWebRequest)System.Net.WebRequest.Create("http://localhost:4001/api/v1/subscriptions/check-now");
                    req.Method = "POST";
                    req.Timeout = 5000;
                    using (System.Net.HttpWebResponse resp = (System.Net.HttpWebResponse)req.GetResponse())
                    {
                        if ((int)resp.StatusCode >= 200 && (int)resp.StatusCode < 300)
                        {
                            trayIcon.ShowBalloonTip(3000, "Sincronização Firebase", "Checagem global de licenças e assinaturas executada com sucesso!", ToolTipIcon.Info);
                            return;
                        }
                    }
                }
                catch (Exception ex)
                {
                    trayIcon.ShowBalloonTip(3000, "Sincronização Firebase", "Resultado: " + ex.Message, ToolTipIcon.Warning);
                }
            });
        }

        private static void UpdateSplash(int percent, string status)
        {
            if (splashForm != null && !splashForm.IsDisposed)
            {
                splashForm.Invoke((Action)(() =>
                {
                    splashForm.SetProgress(percent);
                    splashForm.SetStatus(status);
                }));
            }
        }

        private static bool IsPortOpen(string host, int port, int timeoutMs)
        {
            try
            {
                using (TcpClient client = new TcpClient())
                {
                    IAsyncResult result = client.BeginConnect(host, port, null, null);
                    bool success = result.AsyncWaitHandle.WaitOne(timeoutMs);
                    if (!success) return false;
                    client.EndConnect(result);
                    return true;
                }
            }
            catch
            {
                return false;
            }
        }

        private static void WaitForPort(int port, int maxSeconds)
        {
            int elapsed = 0;
            while (elapsed < maxSeconds)
            {
                if (IsPortOpen("127.0.0.1", port, 800))
                {
                    return;
                }
                Thread.Sleep(800);
                elapsed++;
            }
            Log("Aviso: Tempo limite atingido aguardando porta " + port);
        }

        private static bool CheckCommandAvailable(string cmd)
        {
            try
            {
                Process p = new Process();
                p.StartInfo.FileName = cmd;
                p.StartInfo.Arguments = "-v";
                p.StartInfo.UseShellExecute = false;
                p.StartInfo.RedirectStandardOutput = true;
                p.StartInfo.CreateNoWindow = true;
                p.Start();
                p.WaitForExit(3000);
                return p.ExitCode == 0;
            }
            catch
            {
                return false;
            }
        }

        private static void ExitApplication()
        {
            Log("Encerrando Sistema ADM Gerente...");
            if (trayIcon != null)
            {
                trayIcon.Visible = false;
                trayIcon.Dispose();
            }

            KillProcessTree(apiProcess);
            KillProcessTree(webProcess);
            KillProcessTree(browserProcess);

            if (appMutex != null)
            {
                appMutex.ReleaseMutex();
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
                    Process killer = Process.Start(new ProcessStartInfo
                    {
                        FileName = "taskkill",
                        Arguments = string.Format("/PID {0} /T /F", p.Id),
                        CreateNoWindow = true,
                        UseShellExecute = false
                    });
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

        public SplashForm()
        {
            this.FormBorderStyle = FormBorderStyle.None;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.Size = new Size(520, 260);
            this.BackColor = Color.FromArgb(10, 15, 27); // #0a0f1b
            this.ShowInTaskbar = true;
            this.TopMost = true;

            InitializeCustomComponents();
        }

        private void InitializeCustomComponents()
        {
            Panel borderPanel = new Panel
            {
                Dock = DockStyle.Fill,
                BackColor = Color.FromArgb(10, 15, 27),
                Padding = new Padding(2)
            };
            borderPanel.Paint += (s, e) =>
            {
                using (Pen pen = new Pen(Color.FromArgb(32, 201, 151), 2))
                {
                    e.Graphics.DrawRectangle(pen, 1, 1, this.Width - 3, this.Height - 3);
                }
            };

            lblTitle = new Label
            {
                Text = "SISTEMA ADM GERENTE",
                Font = new Font("Segoe UI", 16f, FontStyle.Bold),
                ForeColor = Color.FromArgb(32, 201, 151), // Neon Emerald
                Location = new Point(24, 28),
                AutoSize = true
            };

            lblSubtitle = new Label
            {
                Text = "Gestão de Licenças, Assinaturas, Clientes & Segurança v1.0.0-BETA",
                Font = new Font("Segoe UI", 9.5f, FontStyle.Regular),
                ForeColor = Color.FromArgb(148, 163, 184),
                Location = new Point(26, 62),
                AutoSize = true
            };

            lblStatus = new Label
            {
                Text = "Inicializando ambiente gerencial...",
                Font = new Font("Segoe UI", 9.5f, FontStyle.Regular),
                ForeColor = Color.FromArgb(248, 250, 252),
                Location = new Point(26, 140),
                Size = new Size(468, 24)
            };

            progressBar = new ProgressBar
            {
                Location = new Point(26, 172),
                Size = new Size(468, 14),
                Style = ProgressBarStyle.Continuous,
                Value = 5
            };

            Label lblFooter = new Label
            {
                Text = "Comunicação Firebase Cloud & Suporte Offline Ativos",
                Font = new Font("Segoe UI", 8.5f, FontStyle.Italic),
                ForeColor = Color.FromArgb(100, 116, 139),
                Location = new Point(26, 218),
                AutoSize = true
            };

            borderPanel.Controls.Add(lblTitle);
            borderPanel.Controls.Add(lblSubtitle);
            borderPanel.Controls.Add(lblStatus);
            borderPanel.Controls.Add(progressBar);
            borderPanel.Controls.Add(lblFooter);

            this.Controls.Add(borderPanel);
        }

        public void SetProgress(int value)
        {
            if (progressBar != null)
            {
                progressBar.Value = Math.Min(100, Math.Max(0, value));
            }
        }

        public void SetStatus(string text)
        {
            if (lblStatus != null)
            {
                lblStatus.Text = text;
            }
        }
    }
}
