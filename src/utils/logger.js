const ts = () => new Date().toISOString();

const fmt = (level, args) =>
  `[${ts()}] ${level.toUpperCase()}: ${args
    .map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))
    .join(' ')}`;

export const logger = {
  info: (...args) => console.log(fmt('info', args)),
  warn: (...args) => console.warn(fmt('warn', args)),
  error: (...args) => console.error(fmt('error', args)),
  debug: (...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(fmt('debug', args));
    }
  },
};
