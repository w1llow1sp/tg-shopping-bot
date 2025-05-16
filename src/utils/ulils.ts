export function escapeHtml(text: string): string {
  return text.replace(/[!>#]/g, '\\$&'); // Экранируем !, >, #
}