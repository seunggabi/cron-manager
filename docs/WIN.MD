# docs/WIN

### `1. 앱이 사용하는 WSL 유저 확인`
```bash
wsl whoami
```

### `2. 실제 crontab 내용 확인`
```bash
wsl crontab -l
```

### `3. cron 데몬 실행 중인지 확인`
```bash
wsl service cron status
```

### `4. 로그 디렉토리 존재 여부`
```bash
wsl ls -la ~/logs/
```

### `5. WSL 로그 파일 존재 여부`
```bash
wsl ls -la ~/logs/
```
