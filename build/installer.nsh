; Custom NSIS script for Cron Manager uninstaller
; Cleans up app data on Windows and WSL when uninstalling

!macro customUnInstall
  ; Ask user whether to remove all app data
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Do you want to remove all Cron Manager data?$\n$\nThis includes backups, config, and lock files in:$\n  - $PROFILE\.cron-manager$\n  - WSL: ~/.cron-manager$\n$\nYour crontab jobs will NOT be removed." \
    IDNO skip_data_removal

  ; Remove Windows-side app data
  RMDir /r "$PROFILE\.cron-manager"

  ; Remove WSL-side app data (ignore errors if WSL not available)
  nsExec::Exec '"$WINDIR\system32\wsl.exe" rm -rf ~/.cron-manager'

  skip_data_removal:
!macroend
