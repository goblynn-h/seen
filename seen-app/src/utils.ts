export function sanitizeFileName(title: string): string {
  return title.replace(/[/\\?%*:|"<>]/g, '').replace(/\s+/g, '_').slice(0, 40);
}
