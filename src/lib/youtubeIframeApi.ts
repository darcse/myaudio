type YoutubeApiReady = {
  Player: new (el: HTMLElement | string, options: YoutubePlayerOptions) => YoutubePlayer;
};

export type YoutubePlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  nextVideo: () => void;
  previousVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlaylist: () => string[] | undefined;
  getPlaylistIndex: () => number;
  getPlayerState: () => number;
  setSize: (width: number, height: number) => void;
  loadPlaylist: (args: { list: string; listType?: string; index?: number }) => void;
  destroy: () => void;
  getIframe?: () => HTMLIFrameElement;
};

export type YoutubePlayerOptions = {
  events?: {
    onReady?: (event: { target: YoutubePlayer }) => void;
    onStateChange?: (event: { data: number; target: YoutubePlayer }) => void;
    onError?: (event: { data: number; target: YoutubePlayer }) => void;
  };
};

export const YT_PLAYER_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

type YoutubeWindow = Window & {
  YT?: YoutubeApiReady;
  onYouTubeIframeAPIReady?: () => void;
};

let loadPromise: Promise<YoutubeApiReady> | null = null;

export function loadYoutubeIframeApi(): Promise<YoutubeApiReady> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('YouTube API는 브라우저에서만 사용할 수 있습니다.'));
  }
  const win = window as YoutubeWindow;
  if (win.YT?.Player) return Promise.resolve(win.YT);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const prev = win.onYouTubeIframeAPIReady;
    win.onYouTubeIframeAPIReady = () => {
      prev?.();
      if (win.YT?.Player) {
        resolve(win.YT);
        return;
      }
      reject(new Error('YouTube IFrame API를 불러오지 못했습니다.'));
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => {
        loadPromise = null;
        reject(new Error('YouTube IFrame API를 불러오지 못했습니다.'));
      };
      document.head.appendChild(script);
    }
    if (win.YT?.Player) resolve(win.YT);
  });

  return loadPromise;
}

export function createYoutubePlaylistIframe(playlistId: string): HTMLIFrameElement {
  const iframe = document.createElement('iframe');
  const origin = encodeURIComponent(window.location.origin);
  const list = encodeURIComponent(playlistId);
  iframe.src = `https://www.youtube.com/embed/videoseries?list=${list}&enablejsapi=1&autoplay=1&playsinline=1&rel=0&origin=${origin}`;
  iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  iframe.allowFullscreen = true;
  iframe.title = 'YouTube playlist';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = '0';
  iframe.style.display = 'block';
  return iframe;
}

export function isYoutubePlayerReady(player: YoutubePlayer | null | undefined): player is YoutubePlayer {
  return (
    !!player &&
    typeof player.getCurrentTime === 'function' &&
    typeof player.getDuration === 'function' &&
    typeof player.getPlaylistIndex === 'function'
  );
}

export function applyYoutubeReferrerPolicy(player: YoutubePlayer, container: HTMLElement) {
  const iframe = player.getIframe?.() ?? container.querySelector('iframe');
  iframe?.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
}
