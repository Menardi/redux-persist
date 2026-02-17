export const logger = {
  debug: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'test') {
      console.debug(`redux-persist: ${message}`, ...args);
    }
  },
  log: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`redux-persist: ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`redux-persist: ${message}`, ...args);
    }
  },
  error: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`redux-persist: ${message}`, ...args);
    }
  },
};
