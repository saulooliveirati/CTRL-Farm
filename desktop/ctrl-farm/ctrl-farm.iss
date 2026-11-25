; =====================================================================
; Script Inno Setup Oficial - CTRL-Farm Industrial Platform
; Gera CTRL-Farm-Setup.exe com instalacao e desinstalacao 100% nativa
; =====================================================================

#define MyAppName "CTRL-Farm"
#define MyAppFullName "CTRL-Farm Industrial Platform"
#define MyAppVersion "1.0.0-Beta"
#define MyAppPublisher "CTRL-Farm Systems"
#define MyAppURL "https://github.com/saulooliveirati/CTRL-Farm"
#define MyAppExeName "CTRL-Farm.exe"

[Setup]
AppId={{D37D0B9C-7F66-4BEB-84A1-F95D8D6E90F4}
AppName={#MyAppFullName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={localappdata}\Programs\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputDir=dist
OutputBaseFilename=CTRL-Farm-Setup
SetupIconFile=icon.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
DisableProgramGroupPage=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
ShowLanguageDialog=yes
UsePreviousLanguage=yes

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"
Name: "french"; MessagesFile: "compiler:Languages\French.isl"
Name: "german"; MessagesFile: "compiler:Languages\German.isl"

[CustomMessages]
brazilianportuguese.RunProgram=Executar CTRL-Farm agora
english.RunProgram=Launch CTRL-Farm now
spanish.RunProgram=Ejecutar CTRL-Farm ahora
french.RunProgram=Lancer CTRL-Farm maintenant
german.RunProgram=CTRL-Farm jetzt starten

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce

[Files]
Source: "dist\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "icon.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "dist\Uninstall.exe"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\..\bin\*"; DestDir: "{app}\bin"; Flags: ignoreversion recursesubdirs createallsubdirs skipifsourcedoesntexist
Source: "..\..\apps\api\dist\*"; DestDir: "{app}\apps\api\dist"; Flags: ignoreversion recursesubdirs createallsubdirs skipifsourcedoesntexist
Source: "..\..\apps\web\.next\*"; DestDir: "{app}\apps\web\.next"; Flags: ignoreversion recursesubdirs createallsubdirs skipifsourcedoesntexist

[Icons]
Name: "{group}\{#MyAppFullName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\icon.ico"; WorkingDir: "{app}"
Name: "{group}\Desinstalar {#MyAppName}"; Filename: "{uninstallexe}"; WorkingDir: "{app}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\icon.ico"; Tasks: desktopicon; WorkingDir: "{app}"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:RunProgram}"; Flags: nowait postinstall skipifsilent; WorkingDir: "{app}"

[UninstallDelete]
Type: filesandordirs; Name: "{app}\WebProfile"
Type: filesandordirs; Name: "{localappdata}\CTRL-Farm\Logs"

[Code]
procedure CurStepChanged(CurStep: TSetupStep);
var
  SelectedLang: String;
  LocaleCode: String;
  AppDir: String;
  ConfigFile: String;
  ConfigContent: String;
  EscapedAppDir: String;
begin
  if CurStep = ssPostInstall then
  begin
    SelectedLang := ActiveLanguage;
    if (SelectedLang = 'brazilianportuguese') or (SelectedLang = 'portuguese') then
      LocaleCode := 'pt-BR'
    else if SelectedLang = 'spanish' then
      LocaleCode := 'es'
    else if SelectedLang = 'french' then
      LocaleCode := 'fr'
    else if SelectedLang = 'german' then
      LocaleCode := 'de'
    else
      LocaleCode := 'en';

    // 1. Grava no Registro do Windows
    RegWriteStringValue(HKEY_CURRENT_USER, 'Software\CTRL-Farm', 'Locale', LocaleCode);

    AppDir := ExpandConstant('{app}');
    EscapedAppDir := AppDir;
    StringChangeEx(EscapedAppDir, '\', '\\', True);

    ConfigContent := '{' + #13#10 +
      '  "appRootDir": "' + EscapedAppDir + '",' + #13#10 +
      '  "locale": "' + LocaleCode + '",' + #13#10 +
      '  "language": "' + Copy(LocaleCode, 1, 2) + '",' + #13#10 +
      '  "updatedAt": "' + GetDateTimeString('yyyy-mm-dd hh:nn:ss', '-', ':') + '"' + #13#10 +
      '}';

    // 2. Grava no diretorio de instalacao
    ConfigFile := ExpandConstant('{app}\ctrlfarm.config.json');
    SaveStringToFile(ConfigFile, ConfigContent, False);

    // 3. Grava no diretorio LocalAppData do usuario
    ForceDirectories(ExpandConstant('{localappdata}\CTRL-Farm'));
    ConfigFile := ExpandConstant('{localappdata}\CTRL-Farm\ctrlfarm.config.json');
    SaveStringToFile(ConfigFile, ConfigContent, False);
  end;
end;
