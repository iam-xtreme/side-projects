const logger = {
  error: (message, error) => {
    console.error(`[${new Date().toISOString()}] {ERROR} ${message}`, error);
  },
  info: (message) => {
    console.info(`[${new Date().toISOString()}] {INFO} ${message}`);
  },
  warn: (message, error) => {
    console.warn(`[${new Date().toISOString()}] {WARN} ${message}`, error);
  },
  debug: (message) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${new Date().toISOString()}] {DEBUG} ${message}`);
    }
  },
};

module.exports = logger;