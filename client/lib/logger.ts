/**
 * Client-side logger that only outputs in development mode.
 * In production, all logs are silenced.
 * Replace all console.log/warn/error with log.info/warn/error.
 */

const noop = (..._args: any[]) => { };

const isDev = typeof __DEV__ !== "undefined" ? __DEV__ : true;

export const log = {
    info: isDev ? console.log.bind(console) : noop,
    warn: isDev ? console.warn.bind(console) : noop,
    error: isDev ? console.error.bind(console) : noop,
};
