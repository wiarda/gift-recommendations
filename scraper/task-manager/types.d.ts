import { Page, Browser } from 'puppeteer';

export type Task = {
    type: string,
    value: string,
};

export interface Pool {
    pool: Task[],
    get: () => Task,
    add: (Task) => Task
}

type PageRef = {
    status: 'Available' | 'Pending',
    idx: number,
    value: Page,
};

export type PageQueue = {
    browser: Promise<Browser>,
    size: number,
    count: number,
    queue: PageRef[],
    dequeue: () => Promise<Page> | null,
    enqueue: (input: Promise<Page>) => void | Error,
    enterIdx: number,
    exitIdx: number,
};