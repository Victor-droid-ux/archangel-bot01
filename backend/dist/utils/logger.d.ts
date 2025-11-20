import pino from "pino";
declare const baseLogger: pino.Logger<never, boolean>;
/**
 * ✅ Namespaced module logger
 * @example const logger = getLogger("TradeRoute");
 */
export declare const getLogger: (name: string) => pino.Logger<never, boolean>;
export default baseLogger;
//# sourceMappingURL=logger.d.ts.map