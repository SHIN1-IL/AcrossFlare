export function isBackupSurfacePath(pathname: string) {
  return /\/(dashboard|app)(\/|$)/.test(pathname);
}
