; Script generated by the Inno Setup Script Wizard.
; SEE THE DOCUMENTATION FOR DETAILS ON CREATING INNO SETUP SCRIPT FILES!

#define MyAppName "iCEGenius-prog"
#define MyAppVersion "1"
#define MyAppPublisher "Dirk Thieme"
#define MyAppURL "https://github.com/dirkt68/iCEGenius"
#define MyAppExeName "iCEGenius-prog.exe"

[Setup]
; NOTE: The value of AppId uniquely identifies this application. Do not use the same AppId value in installers for other applications.
; (To generate a new GUID, click Tools | Generate GUID inside the IDE.)
AppId={{D83D59B2-F58B-4766-97EC-7540E55AD4C3}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
;AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
; Uncomment the following line to run in non administrative install mode (install for current user only.)
;PrivilegesRequired=lowest
OutputDir=D:\Documents\School\TTU\summer23\project-lab-4\iCEGenius\programmer\c_#\iCEGenius-prog-lib-fixed\installer
OutputBaseFilename=setup-ig
Compression=lzma
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "PathMgr.dll"; DestDir: "{app}"; Flags: uninsneveruninstall;
Source: "D:\Documents\School\TTU\summer23\project-lab-4\iCEGenius\programmer\c_#\iCEGenius-prog-lib-fixed\iCEGenius-prog\iCEGenius-prog\bin\Release\net8.0\win-x64\publish\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
; NOTE: Don't use "Flags: ignoreversion" on any shared system files

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[Tasks]
Name: modifyPath; Description: "&Add to Path"

[Code]
const
  MODIFY_PATH_TASK_NAME = 'modifyPath';  // Specify name of task

// Import AddDirToPath() at setup time ('files:' prefix)
function DLLAddDirToPath(DirName: string; PathType, AddType: DWORD): DWORD;
external 'AddDirToPath@files:PathMgr.dll stdcall setuponly';

procedure AfterMyProgInstall(S: String);
begin
  DLLAddDirToPath(ExpandConstant('{app}'), 0, 0);
end;






