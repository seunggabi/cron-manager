# Frontend Test Suite

Comprehensive test suite for React components, utilities, hooks, and store using Vitest + React Testing Library.

## Test Coverage

### ✅ Utilities (95%+ coverage target)
- **logFileExtractor.test.ts** - Log file path extraction from commands
  - Tests: 16 tests covering >>, >, 2>>, 2>, &> redirections
  - Edge cases: /dev/null filtering, duplicates, complex commands

- **scriptPathExtractor.test.ts** - Script path extraction from commands
  - Tests: 17 tests covering node, python, bash, sh, php, ruby, perl
  - Edge cases: quotes removal, relative paths, arguments

### ✅ Hooks (85%+ coverage target)
- **useResizableColumns.test.tsx** - Column resize functionality
  - Tests: 12 tests covering initialization, localStorage, resize behavior
  - Features: Minimum width enforcement, cursor styles, multiple table IDs

### ✅ Components (80%+ coverage target)
- **NextRunCell.test.tsx** - Next run time display with countdown
  - Tests: 14 tests covering countdown, urgency colors, date formatting
  - Features: Live updates, urgency pulse animation, cleanup

- **AlertDialog.test.tsx** - Modal alert system
  - Tests: 26 tests covering display, keyboard shortcuts, types
  - Features: Info/success/error/warning icons, ESC/Enter handling

- **JobForm.test.tsx** - Job creation/editing form
  - Tests: 20+ tests covering CRUD, validation, keyboard shortcuts
  - Features: Environment variable parsing, auto-name generation, log extraction

- **GlobalEnvSettings.test.tsx** - Global environment variable management
  - Tests: 30+ tests covering CRUD, search, sort
  - Features: Inline editing, Enter key shortcuts, filtering

- **BackupManager.test.tsx** - Backup management interface
  - Tests: 20+ tests covering list, restore, diff, search
  - Features: Retention policy, file size formatting, diff viewer

### ✅ Store (Zustand)
- **jobStore.test.ts** - Job state management
  - Tests: 20 tests covering all store actions
  - Features: CRUD operations, error handling, loading states

## Running Tests

```bash
# Run all tests in watch mode
npm test

# Run tests once
npm run test:run

# Run with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## Test Configuration

- **Framework**: Vitest 4.x
- **Testing Library**: @testing-library/react
- **Environment**: jsdom
- **Setup**: `src/__tests__/setup.ts`
- **Config**: `vitest.config.ts`

## Coverage Goals

- **Utilities**: 95%+ (simple, pure functions)
- **Hooks**: 85%+ (React hooks with effects)
- **Components**: 80%+ (UI components with interactions)
- **Overall**: 85%+

## Key Test Patterns

### 1. Component Testing
```typescript
it('renders and handles user interaction', async () => {
  render(<Component {...props} />);

  await waitFor(() => {
    expect(screen.getByText('Expected')).toBeInTheDocument();
  });

  const button = screen.getByRole('button');
  fireEvent.click(button);

  expect(mockCallback).toHaveBeenCalled();
});
```

### 2. Hook Testing
```typescript
it('updates state correctly', () => {
  const { result } = renderHook(() => useCustomHook());

  act(() => {
    result.current.updateValue('new');
  });

  expect(result.current.value).toBe('new');
});
```

### 3. Store Testing
```typescript
it('performs async action', async () => {
  mockApi.method = vi.fn().mockResolvedValue(data);

  await useStore.getState().action();

  expect(useStore.getState().items).toEqual(data);
});
```

### 4. Async Testing
```typescript
it('handles async operations', async () => {
  render(<AsyncComponent />);

  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument();
  });
});
```

## Mocked APIs

All Electron APIs are mocked in `setup.ts`:
- `window.electronAPI.jobs.*`
- `window.electronAPI.env.*`
- `window.electronAPI.backups.*`
- `window.electronAPI.config.*`
- `window.electronAPI.files.*`

## Common Issues

### 1. Act Warnings
Wrap state updates in `waitFor()` or `act()`:
```typescript
await waitFor(() => {
  expect(screen.getByText('Updated')).toBeInTheDocument();
});
```

### 2. Timer Issues
Use fake timers for components with intervals:
```typescript
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

vi.advanceTimersByTime(1000);
```

### 3. localStorage Mock
Already mocked in setup.ts. Clear between tests:
```typescript
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});
```

## Test Statistics (Current)

- **Total Tests**: 157
- **Passing**: 124 (79%)
- **Failing**: 33 (21%)
- **Test Files**: 9
- **Coverage**: ~80% (estimated)

## Next Steps

1. Fix remaining failing tests (mostly DOM-related assertions)
2. Add missing component tests (if any)
3. Increase coverage to 90%+ target
4. Add E2E tests with Playwright/Cypress
5. Add visual regression tests with Storybook

## CI/CD Integration

Add to GitHub Actions:
```yaml
- name: Run tests
  run: npm run test:run

- name: Generate coverage
  run: npm run test:coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
```
