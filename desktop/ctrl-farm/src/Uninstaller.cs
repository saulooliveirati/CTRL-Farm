using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

namespace CtrlFarm.Uninstaller
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new UninstallerForm());
        }
    }

    public class UninstallerForm : Form
    {
        private const string AppName = "CTRL-Farm";
        private const string AppTitle = "CTRL-Farm Industrial Platform";
        private const string RegistryKeyName = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\CTRL-Farm";

        private readonly Color bgDark = Color.FromArgb(10, 15, 27);      // #0a0f1b
        private readonly Color cardDark = Color.FromArgb(16, 24, 39);    // #101827
        private readonly Color borderDark = Color.FromArgb(38, 50, 70);   // #263246
        private readonly Color textMain = Color.FromArgb(248, 250, 252);  // #f8fafc
        private readonly Color textMuted = Color.FromArgb(148, 163, 184); // #94a3b8
        private readonly Color neonEmerald = Color.FromArgb(32, 201, 151);// #20c997
        private readonly Color dangerRed = Color.FromArgb(251, 113, 133);  // #fb7185

        private Panel headerPanel;
        private Label lblHeaderTitle;
        private Label lblHeaderSub;
        private Panel contentPanel;
        private Panel footerPanel;
        private Button btnUninstall;
        private Button btnCancel;
        private ProgressBar progressBar;
        private Label lblStatus;
        private CheckBox chkRemoveData;
        private string installDir;

        public UninstallerForm()
        {
            this.Text = "Desinstalador do " + AppTitle;
            this.Size = new Size(580, 420);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.BackColor = bgDark;
            this.ForeColor = textMain;
            this.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);

            installDir = AppDomain.CurrentDomain.BaseDirectory;

            InitializeComponent();
        }

        private void InitializeComponent()
        {
            // Header
            headerPanel = new Panel
            {
                Dock = DockStyle.Top,
                Height = 80,
                BackColor = cardDark,
                Padding = new Padding(24, 16, 24, 16)
            };
            headerPanel.Paint += (s, e) =>
            {
                using (Pen p = new Pen(borderDark, 1))
                {
                    e.Graphics.DrawLine(p, 0, headerPanel.Height - 1, headerPanel.Width, headerPanel.Height - 1);
                }
            };

            lblHeaderTitle = new Label
            {
                Text = "Desinstalação do " + AppTitle,
                Font = new Font("Segoe UI", 13f, FontStyle.Bold),
                ForeColor = dangerRed,
                Location = new Point(24, 16),
                AutoSize = true
            };

            lblHeaderSub = new Label
            {
                Text = "Remoção dos componentes nativos e atalhos do sistema",
                Font = new Font("Segoe UI", 9.5f, FontStyle.Regular),
                ForeColor = textMuted,
                Location = new Point(25, 45),
                AutoSize = true
            };

            headerPanel.Controls.Add(lblHeaderTitle);
            headerPanel.Controls.Add(lblHeaderSub);

            // Footer
            footerPanel = new Panel
            {
                Dock = DockStyle.Bottom,
                Height = 64,
                BackColor = cardDark,
                Padding = new Padding(24, 14, 24, 14)
            };
            footerPanel.Paint += (s, e) =>
            {
                using (Pen p = new Pen(borderDark, 1))
                {
                    e.Graphics.DrawLine(p, 0, 0, footerPanel.Width, 0);
                }
            };

            btnCancel = new Button
            {
                Text = "Cancelar",
                Size = new Size(110, 36),
                Location = new Point(24, 14),
                FlatStyle = FlatStyle.Flat,
                BackColor = cardDark,
                ForeColor = textMain,
                Font = new Font("Segoe UI", 9.5f, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            btnCancel.FlatAppearance.BorderColor = borderDark;
            btnCancel.Click += (s, e) => { this.Close(); };

            btnUninstall = new Button
            {
                Text = "Desinstalar Agora",
                Size = new Size(150, 36),
                Location = new Point(400, 14),
                FlatStyle = FlatStyle.Flat,
                BackColor = dangerRed,
                ForeColor = Color.FromArgb(10, 15, 27),
                Font = new Font("Segoe UI", 9.5f, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            btnUninstall.FlatAppearance.BorderColor = dangerRed;
            btnUninstall.Click += (s, e) => { StartUninstall(); };

            footerPanel.Controls.Add(btnCancel);
            footerPanel.Controls.Add(btnUninstall);

            // Content
            contentPanel = new Panel
            {
                Dock = DockStyle.Fill,
                BackColor = bgDark,
                Padding = new Padding(30)
            };

            Label lblQuestion = new Label
            {
                Text = "Tem certeza de que deseja remover o CTRL-Farm deste computador?\n\n" +
                       "Esta ação encerrará os serviços em execução, removerá os atalhos da Área de Trabalho " +
                       "e Menu Iniciar, e removerá o registro do programa no Windows.",
                ForeColor = textMain,
                Font = new Font("Segoe UI", 10f, FontStyle.Regular),
                Location = new Point(30, 20),
                Size = new Size(510, 80)
            };

            chkRemoveData = new CheckBox
            {
                Text = "Remover também dados de cache e perfis locais em %LOCALAPPDATA%\\CTRL-Farm",
                Checked = false,
                ForeColor = textMuted,
                Font = new Font("Segoe UI", 9f, FontStyle.Regular),
                Location = new Point(30, 110),
                Size = new Size(510, 26)
            };

            progressBar = new ProgressBar
            {
                Location = new Point(30, 155),
                Size = new Size(510, 20),
                Visible = false,
                Style = ProgressBarStyle.Continuous
            };

            lblStatus = new Label
            {
                Text = "Pronto para desinstalar.",
                ForeColor = textMuted,
                Font = new Font("Segoe UI", 9f, FontStyle.Italic),
                Location = new Point(30, 185),
                Size = new Size(510, 24),
                Visible = false
            };

            contentPanel.Controls.Add(lblQuestion);
            contentPanel.Controls.Add(chkRemoveData);
            contentPanel.Controls.Add(progressBar);
            contentPanel.Controls.Add(lblStatus);

            this.Controls.Add(contentPanel);
            this.Controls.Add(footerPanel);
            this.Controls.Add(headerPanel);
        }

        private void StartUninstall()
        {
            btnUninstall.Enabled = false;
            btnCancel.Enabled = false;
            chkRemoveData.Enabled = false;

            progressBar.Visible = true;
            lblStatus.Visible = true;

            ThreadPool.QueueUserWorkItem(_ =>
            {
                try
                {
                    UpdateStatus("Finalizando processos do CTRL-Farm...", 20);
                    KillProcess("CTRL-Farm");
                    KillProcess("mediamtx");

                    Thread.Sleep(500);
                    UpdateStatus("Removendo atalhos da Área de Trabalho e Menu Iniciar...", 50);
                    RemoveShortcuts();

                    Thread.Sleep(300);
                    UpdateStatus("Removendo chaves de registro do Windows...", 75);
                    RemoveRegistryEntries();

                    if (chkRemoveData.Checked)
                    {
                        UpdateStatus("Limpando arquivos locais em %LOCALAPPDATA%...", 90);
                        string localData = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CTRL-Farm");
                        if (Directory.Exists(localData))
                        {
                            try { Directory.Delete(localData, true); } catch { }
                        }
                    }

                    UpdateStatus("Desinstalação concluída com sucesso!", 100);
                    Thread.Sleep(500);

                    this.Invoke((Action)(() =>
                    {
                        MessageBox.Show(
                            "O CTRL-Farm foi desinstalado com sucesso do seu computador.",
                            AppTitle,
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Information);

                        // Agendamento de auto-remoção do executável de desinstalação
                        ScheduleSelfDelete();
                        this.Close();
                    }));
                }
                catch (Exception ex)
                {
                    this.Invoke((Action)(() =>
                    {
                        MessageBox.Show("Erro durante a desinstalação: " + ex.Message, AppTitle, MessageBoxButtons.OK, MessageBoxIcon.Error);
                        this.Close();
                    }));
                }
            });
        }

        private void UpdateStatus(string text, int percent)
        {
            if (!this.IsDisposed)
            {
                this.Invoke((Action)(() =>
                {
                    lblStatus.Text = text;
                    progressBar.Value = Math.Min(100, Math.Max(0, percent));
                }));
            }
        }

        private static void KillProcess(string name)
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = "taskkill",
                    Arguments = string.Format("/IM {0}.exe /F /T", name),
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    WindowStyle = ProcessWindowStyle.Hidden
                };
                Process p = Process.Start(psi);
                if (p != null) p.WaitForExit(3000);
            }
            catch { }
        }

        private static void RemoveShortcuts()
        {
            try
            {
                // Desktop
                string userDesktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                string lnk1 = Path.Combine(userDesktop, "CTRL-Farm.lnk");
                if (File.Exists(lnk1)) File.Delete(lnk1);

                string publicDesktop = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonDesktopDirectory), "CTRL-Farm.lnk");
                if (File.Exists(publicDesktop)) File.Delete(publicDesktop);

                // Start Menu
                string userStart = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs), "CTRL-Farm");
                if (Directory.Exists(userStart)) Directory.Delete(userStart, true);

                string commonStart = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonPrograms), "CTRL-Farm");
                if (Directory.Exists(commonStart)) Directory.Delete(commonStart, true);
            }
            catch { }
        }

        private static void RemoveRegistryEntries()
        {
            try
            {
                Registry.CurrentUser.DeleteSubKeyTree(RegistryKeyName, false);
            }
            catch { }

            try
            {
                Registry.LocalMachine.DeleteSubKeyTree(RegistryKeyName, false);
            }
            catch { }
        }

        private void ScheduleSelfDelete()
        {
            try
            {
                string exePath = Application.ExecutablePath;
                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = "cmd.exe",
                    Arguments = string.Format("/C choice /C Y /N /D Y /T 2 & del /f /q \"{0}\"", exePath),
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    WindowStyle = ProcessWindowStyle.Hidden
                };
                Process.Start(psi);
            }
            catch { }
        }
    }
}
