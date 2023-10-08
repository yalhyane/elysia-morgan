import {LoggerContext} from "./index";
import {Buffer} from "buffer";

const TokenParser: Map<string, (ctx: LoggerContext, ...args: string[]) => string|undefined> = new Map()

// request URL
TokenParser.set('url', (ctx: LoggerContext) => {
    try {
        return new URL(ctx.request.url).pathname;
    } catch (e) {
        return ctx.request.url;
    }
});

// request method
TokenParser.set('method', (ctx: LoggerContext) => ctx.request.method);

// request response-time
TokenParser.set('response-time', (ctx: LoggerContext, ...args: string[]) =>  {
    const digits =  +(args[0] || 3);
    if (!ctx.startAt || !ctx.endsAt) {
        // missing request and/or response start time
        return undefined;
    }

    // calculate diff
    const ms = (ctx.endsAt[0] - ctx.startAt[0]) * 1e3 +
        (ctx.endsAt[1] - ctx.startAt[1]) * 1e-6;

    // return truncated value
    return ms.toFixed(digits);
})

// total time in milliseconds
TokenParser.set('total-time',  (ctx: LoggerContext, ...args: string[]) =>  {
    const digits = +(args[0] || 3);
    if (!ctx.startAt || !ctx.endsAt) {
        // missing request and/or response start time
        return undefined;
    }

    // time elapsed from request start
    const elapsed = process.hrtime(ctx.startAt);

    // cover to milliseconds
    const ms = (elapsed[0] * 1e3) + (elapsed[1] * 1e-6)

    // return truncated value
    return ms.toFixed(digits);
})


// current date
TokenParser.set('date', (ctx: LoggerContext, ...args: string[]) => {
    let format = args[0] || 'web';
    const date = new Date();
    switch (format) {
        case 'clf':
            return dateToCLF(date);
        case 'iso':
            return date.toISOString();
        case 'web':
            return date.toUTCString();
    }
    return undefined;
})

// response status code
TokenParser.set('status', (ctx: LoggerContext) =>  {

    let status = ctx.set.status || 200;

    // convert status to number
    if (typeof status === 'string') {
        return status;
    }

    if (ctx.options?.format !== 'dev') {
        return `${status}`;
    }
    const reset = "\x1b[0m";

    const color = status >= 500 ? "\x1b[31m" // red
        : status >= 400 ? "\x1b[33m" // yellow
            : status >= 300 ? "\x1b[36m" // cyan
                : status >= 200 ? "\x1b[32m" // green
                    : "\x1b[0m" // no color

    return `${color}${status}${reset}`;

})


// request referrer
TokenParser.set('referrer', (ctx: LoggerContext) => {
    return ctx.request.referrer || undefined;
});

// HTTP version
TokenParser.set('http-version', (ctx: LoggerContext) => {

    // bun does not support httpVersion yet
    return '1.1';
});

// request user-agent
TokenParser.set('user-agent', (ctx: LoggerContext) => {
    return ctx.request.headers.get('user-agent') || undefined;
})

// request header
TokenParser.set('req', ({request: req}: LoggerContext, ...args: string[]) => {
    const header = args[0] || '';
    if (header.length > 0) {
        return req.headers.get(header) || undefined;
    }
    return undefined;
});

// response header
TokenParser.set('res', (ctx: LoggerContext, ...args: string[]) => {
    const header = args[0] || '';
    if (header.length > 0) {
        return ctx.set.headers[header] || undefined;
    }
    return undefined;
})

// content-length
TokenParser.set('content-length', (ctx: LoggerContext) => {
    return `${ctx.set.headers['content-length'] || 0}`;
})


// user-ip
TokenParser.set('remote-addr', (ctx: LoggerContext) => {
    return getClientIP(ctx.request.headers) || undefined;
})

// username
TokenParser.set('remote-user', (ctx: LoggerContext) => {
    return getBasicAuthUser(ctx.request);
});


export const tokens = TokenParser.keys();
export default TokenParser;




const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Ensure two-digit day, hour, minute, and second formatting
const pad = (num: number) => (num < 10 ? "0" : "") + num;

function dateToCLF(date: Date) {

    const day = date.getUTCDate();
    const month = months[date.getUTCMonth()];
    const year = date.getUTCFullYear();
    const hour = date.getUTCHours();
    const minute = date.getUTCMinutes();
    const second = date.getUTCSeconds();
    const timezoneOffset = -date.getTimezoneOffset(); // Convert to minutes and reverse the sign
    const timezoneHours = Math.floor(timezoneOffset / 60);
    const timezoneMinutes = Math.abs(timezoneOffset) % 60;


    return `${pad(day)}/${month}/${year}:${pad(hour)}:${pad(minute)}:${pad(second)} ${timezoneHours < 0 ? '-' : '+'}${pad(Math.abs(timezoneHours))}${pad(timezoneMinutes)}`;
}

// List of known IP headers to check
const knownIpHeaderNames: string[] = [
    'x-forwarded-for',
    'forwarded-for',
    'forwarded',
    'x-real-ip',
    'remote-addr',
    'cf-connecting-ip',
    'fastly-ip',
    'akamai-requestip',
    'true-client-ip',
    'x-client-ip',
    'x-remote-ip',
    'http_x_forwarded_for',
    'http_x_real_ip',
    'http_remote_addr',
];

/**
 * Get the client's IP address from a set of headers.
 *
 * @param headers - The HTTP headers object.
 * @returns The client's IP address or null if not found.
 */
function getClientIP(headers: Headers): string | null | undefined {
    // Check the de-facto standard header
    if (headers.get('x-forwarded-for')) {
        const ipList = headers.get('x-forwarded-for')?.split(',');
        return ipList ? (ipList[0] || '').trim() : null;
    }

    let clientIP: string | null = null;

    // Iterate through the specified header keys
    for (const key of knownIpHeaderNames) {
        clientIP = headers.get(key);
        if (clientIP) {
            break;
        }
    }

    return clientIP;
}

// parse basic-auth
function getBasicAuthUser(req: Request) {
    const header = req.headers.get('authorization');
    if (header === null || !header.toLowerCase().startsWith('basic ')) {
        return undefined;
    }

    const token = header.slice('Basic '.length);


    return Buffer.from(token, 'base64').toString('utf-8').split(':')[0];
}
