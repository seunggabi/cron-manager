import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { LogButton } from '../../components/LogButton';

const mockShowAlert = vi.fn();
const mockOnOpenLog = vi.fn();

const defaultProps = {
  logFile: '~/logs/test.log',
  showAlert: mockShowAlert,
  onOpenLog: mockOnOpenLog,
};

// 모든 pending Promise를 flush
const flushPromises = () => act(async () => {});

beforeEach(() => {
  vi.clearAllMocks();
});

// ────────────────────────────────────────────────────────────
// WSL 모드
// ────────────────────────────────────────────────────────────
describe('LogButton (WSL mode)', () => {
  it('dirExists 체크 없이 즉시 복사 버튼을 렌더링한다', () => {
    render(<LogButton {...defaultProps} isWsl />);
    expect(screen.getByText('logs.copyWslCmd')).toBeInTheDocument();
  });

  it('checkDir API를 호출하지 않는다', () => {
    render(<LogButton {...defaultProps} isWsl />);
    expect(window.electronAPI.logs.checkDir).not.toHaveBeenCalled();
  });

  it('title에 mkdir -p && touch && tail -f 형식의 명령어가 포함된다', () => {
    render(<LogButton {...defaultProps} logFile="~/logs/test.log" isWsl />);
    const btn = screen.getByTitle(/mkdir -p.*touch.*tail -f/);
    expect(btn).toBeInTheDocument();
  });

  it('logFile 경로에서 디렉토리를 올바르게 추출한다', () => {
    render(<LogButton {...defaultProps} logFile="~/logs/app/test.log" isWsl />);
    const btn = screen.getByTitle('mkdir -p ~/logs/app && touch ~/logs/app/test.log && tail -f ~/logs/app/test.log');
    expect(btn).toBeInTheDocument();
  });

  it('슬래시가 없는 경로면 디렉토리를 ~로 처리한다', () => {
    render(<LogButton {...defaultProps} logFile="test.log" isWsl />);
    const btn = screen.getByTitle('mkdir -p ~ && touch test.log && tail -f test.log');
    expect(btn).toBeInTheDocument();
  });

  it('클릭 시 올바른 명령어를 클립보드에 복사한다', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<LogButton {...defaultProps} logFile="~/logs/test.log" isWsl />);
    fireEvent.click(screen.getByText('logs.copyWslCmd'));
    await flushPromises();

    expect(writeText).toHaveBeenCalledWith(
      'mkdir -p ~/logs && touch ~/logs/test.log && tail -f ~/logs/test.log'
    );
  });

  it('복사 후 "logs.copied" 피드백 텍스트가 표시된다', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });

    render(<LogButton {...defaultProps} isWsl />);
    fireEvent.click(screen.getByText('logs.copyWslCmd'));
    await flushPromises();

    expect(screen.getByText('logs.copied')).toBeInTheDocument();
  });

  it('2초 후 복사 피드백이 사라지고 원래 텍스트로 돌아온다', async () => {
    vi.useFakeTimers();
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });

    render(<LogButton {...defaultProps} isWsl />);
    fireEvent.click(screen.getByText('logs.copyWslCmd'));
    await flushPromises();
    expect(screen.getByText('logs.copied')).toBeInTheDocument();

    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(screen.getByText('logs.copyWslCmd')).toBeInTheDocument();

    vi.useRealTimers();
  });
});

// ────────────────────────────────────────────────────────────
// 일반 모드 (non-WSL)
// ────────────────────────────────────────────────────────────
describe('LogButton (non-WSL mode)', () => {
  it('dirExists 확인 중에는 null을 반환한다', () => {
    (window.electronAPI.logs.checkDir as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { exists: true },
    });
    const { container } = render(<LogButton {...defaultProps} />);
    // checkDir가 resolve되기 전 초기 상태는 null
    expect(container.firstChild).toBeNull();
  });

  it('디렉토리가 존재하면 로그 열기 버튼을 렌더링한다', async () => {
    (window.electronAPI.logs.checkDir as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { exists: true },
    });
    render(<LogButton {...defaultProps} />);
    await flushPromises();
    expect(screen.getByText('logs.log')).toBeInTheDocument();
  });

  it('디렉토리가 없으면 디렉토리 생성 버튼을 렌더링한다', async () => {
    (window.electronAPI.logs.checkDir as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { exists: false },
    });
    render(<LogButton {...defaultProps} />);
    await flushPromises();
    expect(screen.getByText('logs.createDir')).toBeInTheDocument();
  });

  it('로그 열기 버튼 클릭 시 onOpenLog를 호출한다', async () => {
    (window.electronAPI.logs.checkDir as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { exists: true },
    });
    render(<LogButton {...defaultProps} />);
    await flushPromises();

    fireEvent.click(screen.getByText('logs.log'));
    expect(mockOnOpenLog).toHaveBeenCalledWith('~/logs/test.log', undefined);
  });

  it('workingDir가 있으면 onOpenLog에 함께 전달한다', async () => {
    (window.electronAPI.logs.checkDir as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { exists: true },
    });
    render(<LogButton {...defaultProps} workingDir="/home/user/app" />);
    await flushPromises();

    fireEvent.click(screen.getByText('logs.log'));
    expect(mockOnOpenLog).toHaveBeenCalledWith('~/logs/test.log', '/home/user/app');
  });

  it('디렉토리 생성 버튼 클릭 시 createDir API를 호출한다', async () => {
    (window.electronAPI.logs.checkDir as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { exists: false },
    });
    (window.electronAPI.logs.createDir as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
    });
    render(<LogButton {...defaultProps} />);
    await flushPromises();

    fireEvent.click(screen.getByText('logs.createDir'));
    await flushPromises();

    expect(window.electronAPI.logs.createDir).toHaveBeenCalledWith('~/logs/test.log', undefined);
  });

  it('createDir 성공 후 로그 열기 버튼으로 전환된다', async () => {
    (window.electronAPI.logs.checkDir as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { exists: false },
    });
    (window.electronAPI.logs.createDir as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
    });
    render(<LogButton {...defaultProps} />);
    await flushPromises();

    fireEvent.click(screen.getByText('logs.createDir'));
    await flushPromises();

    expect(screen.getByText('logs.log')).toBeInTheDocument();
  });

  it('createDir 실패 시 showAlert를 호출한다', async () => {
    (window.electronAPI.logs.checkDir as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { exists: false },
    });
    (window.electronAPI.logs.createDir as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      error: 'Permission denied',
    });
    render(<LogButton {...defaultProps} />);
    await flushPromises();

    fireEvent.click(screen.getByText('logs.createDir'));
    await flushPromises();

    expect(mockShowAlert).toHaveBeenCalledWith('Permission denied', 'error');
  });

  it('checkDir API 실패 시 버튼을 렌더링하지 않는다', async () => {
    (window.electronAPI.logs.checkDir as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Network error')
    );
    const { container } = render(<LogButton {...defaultProps} />);
    await flushPromises();
    expect(container.firstChild).toBeNull();
  });
});
