Set WshShell = CreateObject("WScript.Shell")
strCmd = "cmd /c ""C:\Users\admin\Desktop\bgg\cloudflared.exe tunnel --url http://localhost:3000 > C:\Users\admin\Desktop\bgg\tunnel-url.txt 2>&1"""
WshShell.Run strCmd, 0, False
