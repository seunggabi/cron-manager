import { app, Menu, BrowserWindow, shell } from 'electron';

export function createApplicationMenu(mainWindow: BrowserWindow) {
  const isMac = process.platform === 'darwin';

  const template: Electron.MenuItemConstructorOptions[] = [
    // App Menu (macOS only)
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),

    // File Menu
    {
      label: '파일',
      submenu: [
        {
          label: '새 작업',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu:new-job');
          },
        },
        {
          label: '동기화',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.webContents.send('menu:sync');
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },

    // Edit Menu
    {
      label: '편집',
      submenu: [
        { role: 'undo', label: '실행 취소' },
        { role: 'redo', label: '다시 실행' },
        { type: 'separator' },
        { role: 'cut', label: '잘라내기' },
        { role: 'copy', label: '복사' },
        { role: 'paste', label: '붙여넣기' },
        { role: 'selectAll', label: '모두 선택' },
        { type: 'separator' },
        {
          label: '검색',
          accelerator: 'CmdOrCtrl+F',
          click: () => {
            mainWindow.webContents.send('menu:search');
          },
        },
      ],
    },

    // View Menu
    {
      label: '보기',
      submenu: [
        {
          label: '작업 관리',
          accelerator: 'CmdOrCtrl+1',
          click: () => {
            mainWindow.webContents.send('menu:tab', 'jobs');
          },
        },
        {
          label: '환경 변수',
          accelerator: 'CmdOrCtrl+2',
          click: () => {
            mainWindow.webContents.send('menu:tab', 'env');
          },
        },
        {
          label: '백업 관리',
          accelerator: 'CmdOrCtrl+3',
          click: () => {
            mainWindow.webContents.send('menu:tab', 'backups');
          },
        },
        { type: 'separator' },
        { role: 'reload', label: '새로고침' },
        { role: 'forceReload', label: '강제 새로고침' },
        { role: 'toggleDevTools', label: '개발자 도구' },
        { type: 'separator' },
        { role: 'resetZoom', label: '실제 크기' },
        { role: 'zoomIn', label: '확대' },
        { role: 'zoomOut', label: '축소' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '전체 화면' },
      ],
    },

    // Window Menu
    {
      label: '윈도우',
      submenu: [
        { role: 'minimize', label: '최소화' },
        { role: 'zoom', label: '확대/축소' },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const, label: '모두 앞으로 가져오기' },
              { type: 'separator' as const },
              { role: 'window' as const },
            ]
          : [{ role: 'close' as const, label: '닫기' }]),
      ],
    },

    // Help Menu
    {
      label: '도움말',
      submenu: [
        {
          label: 'GitHub 저장소',
          click: async () => {
            await shell.openExternal('https://github.com/seunggabi/cron-manager');
          },
        },
        {
          label: '이슈 보고',
          click: async () => {
            await shell.openExternal('https://github.com/seunggabi/cron-manager/issues');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
