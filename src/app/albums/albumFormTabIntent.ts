export type AlbumFormTabId = 'basic' | 'tracks' | 'composers';

let pendingAlbumFormTab: AlbumFormTabId | undefined;

export function setPendingAlbumFormTab(tab: AlbumFormTabId | undefined): void {
  pendingAlbumFormTab = tab;
}

export function takePendingAlbumFormTab(): AlbumFormTabId | undefined {
  const tab = pendingAlbumFormTab;
  pendingAlbumFormTab = undefined;
  return tab;
}
