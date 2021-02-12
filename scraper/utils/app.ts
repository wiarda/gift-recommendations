const EventEmitter = require('events');
import { createStream } from './fsutils';

export const exit = (): void => process.exit(0);
const noop = () => void 0;

export const createApp = (path: string, unmount: () => void = noop) => {
    const app = new EventEmitter();
    const stream = createStream(path);

    app.on('cleanup', msg => {
        console.log(msg || "Unmounting...")
        unmount();
        process.exit(0);
    });

    app.on('append', msg => {
        stream.write(`${msg}\n`);
    })

    process.on('SIGINT', () => {
        console.log('SIGINT');
        unmount();
        process.exit(0);
    });

    process.on('uncaughtException', e => {
        console.error('UNCAUGHT EXCEPTION');
        console.error(e);
        // app.emit('cleanup');
    });

    process.on('unhandledRejection', e => {
        console.error('UNHANDLED REJECTION');
        console.error(e);
        // app.emit('cleanup');
    });

    process.on('exit', code => {
        if (code === 0) {
            console.log('OK. EXITING.');
        } else {
            console.log(`Exiting with code ${code}`);
        }
    });

    return app;
}