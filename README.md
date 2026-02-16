# Cron Manager

[![Build and Release](https://github.com/seunggabi/cron-manager/actions/workflows/build-release.yml/badge.svg)](https://github.com/seunggabi/cron-manager/actions/workflows/build-release.yml)
[![Latest Release](https://img.shields.io/github/v/release/seunggabi/cron-manager?color=blue)](https://github.com/seunggabi/cron-manager/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![GitHub Stars](https://img.shields.io/github/stars/seunggabi/cron-manager?style=social)](https://github.com/seunggabi/cron-manager/stargazers)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Electron](https://img.shields.io/badge/Electron-28-47848F?logo=electron)](https://www.electronjs.org)

A modern, feature-rich GUI-based crontab manager built with Electron, React, and TypeScript. Manage your cron jobs with ease through an intuitive interface with real-time synchronization, backup management, and advanced features.

## 📥 Download

Download the latest version for your platform:

- 🍎 **macOS**: [Download DMG](https://github.com/seunggabi/cron-manager/releases/latest)
- 🪟 **Windows**: [Download Installer](https://github.com/seunggabi/cron-manager/releases/latest)
- 🐧 **Linux**: [Download AppImage](https://github.com/seunggabi/cron-manager/releases/latest) or [Download DEB](https://github.com/seunggabi/cron-manager/releases/latest)

All releases are automatically built and published via GitHub Actions.

## 📦 Installation

### macOS

1. Download the `.dmg` file from the [latest release](https://github.com/seunggabi/cron-manager/releases/latest)
2. Open the DMG file and drag "Cron Manager" to the Applications folder
3. **Important**: macOS may block the app with a "damaged" error because it's not signed with an Apple Developer certificate

**To bypass Gatekeeper (choose one method):**

**Method 1: Right-click to open (Recommended)**
1. Open Finder and go to Applications
2. **Right-click** (or Control+click) on "Cron Manager"
3. Select "Open" from the menu
4. Click "Open" in the security dialog
5. The app will launch and won't be blocked again

**Method 2: Remove quarantine attribute (Terminal)**

🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨
```bash
sudo xattr -rd com.apple.quarantine "/Applications/Cron Manager.app"
```
🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨

Enter your password when prompted, then launch the app normally.

**Method 3: System Settings**
1. Try to open the app normally (it will be blocked)
2. Open System Settings → Privacy & Security
3. Scroll down to find "Cron Manager was blocked"
4. Click "Open Anyway"
5. Try opening the app again and click "Open"

### Windows

1. Download the `.exe` installer from the [latest release](https://github.com/seunggabi/cron-manager/releases/latest)
2. Run the installer
3. Windows SmartScreen may show a warning - click "More info" and then "Run anyway"
4. Follow the installation wizard

### Linux

**AppImage (Universal)**
1. Download the `.AppImage` file
2. Make it executable: `chmod +x Cron.Manager-*.AppImage`
3. Run it: `./Cron.Manager-*.AppImage`

**Debian/Ubuntu (.deb)**
1. Download the `.deb` file
2. Install: `sudo dpkg -i cron-manager_*_amd64.deb`
3. Run: `cron-manager` or find it in your applications menu

## 📸 Screenshots

### Main Interface - Job Management
![Job Management](example/m1_job.png)
*Manage cron jobs with intuitive UI - ID column, sorting, inline editing*

### Quick Edit Mode
![Quick Edit](example/m1_job_quick_edit.png)
*Double-click to edit job names and schedules inline*

### Environment Variables
![Environment Variables](example/m2_env.png)
*Configure global and per-job environment variables*

### Backup Management
![Backup Management](example/m3_backup.png)
*Automatic backups with diff viewer and restore functionality*

### Multi-Language Support
![Language Selection](example/locale.png)
*8 languages supported: English, Korean, Japanese, Chinese, German, Russian, Hindi, Portuguese*

## ✨ Features

### 📝 Job Management
- **Visual cron job management** - Create, edit, and delete cron jobs through an intuitive UI
- **Real-time crontab synchronization** - Automatically sync with system crontab
- **Job ID column** - Unique identifier for each job with sorting support
- **Job reordering** - Drag and drop to reorganize jobs
- **Enable/disable jobs** - Toggle jobs without deleting them
- **Instant execution** - Run jobs immediately for testing
- **Test mode** - 1-minute test execution with auto-cleanup
- **Next run preview** - See when jobs will execute next

### ⏰ Schedule Management
- **Schedule validation** - Real-time cron expression validation
- **Visual schedule builder** - Predefined schedule presets
- **Next runs preview** - See upcoming execution times (up to 5)
- **Human-readable format** - Understand schedules at a glance
- **Cron expression presets** - Common schedules (hourly, daily, weekly, monthly, etc.)

### 🌍 Environment Variables
- **Global environment variables** - Set variables for all jobs
- **Per-job environment variables** - Job-specific environment configuration
- **Variable validation** - Ensure valid environment variable names
- **Search and filter** - Find variables quickly
- **Sort and organize** - Sort by key or value

### 💾 Backup & Restore
- **Automatic backups** - Crontab backed up on every change
- **Manual backup creation** - Create backups on demand
- **Backup retention** - Configurable retention policy (max files and days)
- **Restore functionality** - Restore from any backup point
- **Diff viewer** - Compare current crontab with backups
- **Search backups** - Find specific backups quickly
- **Countdown timer** - See when backups will be auto-deleted

### 📁 Advanced Features
- **Working directory configuration** - Set execution context per job
- **Log file management** - Configure and view log files
- **Real-time log viewer** - Open logs in Terminal with `tail -f`
- **Log directory creation** - Automatically create log directories
- **Script folder access** - Quick access to script locations
- **Job tagging** - Organize jobs with tags
- **Job descriptions** - Add notes and documentation
- **Resizable columns** - Customize table column widths

### ⌨️ Keyboard Shortcuts
- **Cmd/Ctrl+N** - Create new job
- **Cmd/Ctrl+R** - Sync with crontab
- **Cmd/Ctrl+F** - Search/filter
- **Cmd/Ctrl+1** - Switch to Jobs tab
- **Cmd/Ctrl+2** - Switch to Environment Variables tab
- **Cmd/Ctrl+3** - Switch to Backup Management tab

### 🎨 UI/UX
- **Modern interface** - Clean, intuitive design with Radix UI
- **Dark mode support** - Comfortable viewing in any lighting
- **Responsive tables** - Resizable and sortable columns
- **Search and filter** - Find jobs, variables, and backups quickly
- **Multi-language support** - 8 languages: English, Korean, Japanese, Chinese (Simplified), German, Russian, Hindi, Portuguese (Brazil)
- **GitHub integration** - View repository stars in-app
- **Application menu** - Full macOS/Windows menu support
정리했ㄷ
## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=seunggabi/cron-manager&type=Date)](https://star-history.com/#seunggabi/cron-manager&Date)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

Copyright (c) 2024 seunggabi

## 👤 Author

**seunggabi**

- GitHub: [@seunggabi](https://github.com/seunggabi)
- Repository: [cron-manager](https://github.com/seunggabi/cron-manager)

---

Made with ❤️ using Electron, React, and TypeScript
