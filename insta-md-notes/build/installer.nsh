!macro customInstall
  ; Prompt for custom savePath
  StrCpy $0 "$INSTDIR\user_data"
  WriteIniStr "$INSTDIR\user-config.ini" "Settings" "savePath" $0
!macroend
