export type TimeEndCallback = (elapsedTime: number) => void;
export declare class Timer {
    callback: TimeEndCallback;
    interval: number;
    startTime: number;
    requestId: ReturnType<typeof setTimeout> | null;
    isRunning: boolean;
    count: number;
    lastElapsed: number;
    averageElapsed: number;
    constructor(callback: TimeEndCallback, interval: number);
    start(): void;
    stop(): void;
    tick(): void;
}
