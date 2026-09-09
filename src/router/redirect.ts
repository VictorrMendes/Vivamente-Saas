/** Aceita somente caminhos locais; o Router continua aplicando os guardas de papel. */
export function safeLoginRedirect(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') ||
      /[\\\u0000-\u0020]/.test(value)) return '/dashboard';
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith('//') || /[\\\u0000-\u0020]/.test(decoded) ||
        /^\/login(?:[/?#]|$)/i.test(decoded)) return '/dashboard';
    return value;
  } catch {
    return '/dashboard';
  }
}
