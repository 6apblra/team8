declare module 'ws' {
    export class WebSocket extends EventEmitter {
        static readonly CONNECTING: number;
        static readonly OPEN: number;
        static readonly CLOSING: number;
        static readonly CLOSED: number;

        constructor(address: string | URL, options?: any);
        constructor(address: string | URL, protocols?: string | string[], options?: any);

        readonly readyState: number;
        readonly url: string;
        readonly CONNECTING: number;
        readonly OPEN: number;
        readonly CLOSING: number;
        readonly CLOSED: number;

        close(code?: number, reason?: string): void;
        ping(data?: any, mask?: boolean, cb?: (err: Error) => void): void;
        pong(data?: any, mask?: boolean, cb?: (err: Error) => void): void;
        send(data: any, cb?: (err?: Error) => void): void;
        send(data: any, options: { mask?: boolean; binary?: boolean; compress?: boolean; fin?: boolean }, cb?: (err?: Error) => void): void;
        terminate(): void;

        on(event: 'close', listener: (code: number, reason: Buffer) => void): this;
        on(event: 'error', listener: (err: Error) => void): this;
        on(event: 'message', listener: (data: Buffer) => void): this;
        on(event: 'open', listener: () => void): this;
        on(event: 'ping' | 'pong', listener: (data: Buffer) => void): this;
        on(event: string | symbol, listener: (...args: any[]) => void): this;
    }

    export class WebSocketServer extends EventEmitter {
        constructor(options?: {
            host?: string;
            port?: number;
            server?: any;
            path?: string;
            noServer?: boolean;
        });

        close(cb?: (err?: Error) => void): void;
        handleUpgrade(request: any, socket: any, upgradeHead: any, callback: (client: WebSocket) => void): void;

        on(event: 'connection', listener: (socket: WebSocket, request: any) => void): this;
        on(event: 'error', listener: (error: Error) => void): this;
        on(event: 'close', listener: () => void): this;
        on(event: string | symbol, listener: (...args: any[]) => void): this;
    }

    import { EventEmitter } from 'events';
}
