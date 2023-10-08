import Elysia, {Context} from "elysia";
import {compileTemplate, LogFormat, ParseDataType, parseTemplate, renderTemplate} from "./template";
import tokenParser from "./tokens";
import * as bun from "bun";
import {FileSink} from "bun";
export {LogFormat} from './template'
export {tokens as LogTokens} from './tokens.ts';


type SkipFunc = (ctx: LoggerContext) => boolean

export type LoggerOptions = {
    format?: string;
    immediate?: boolean;
    stream?: FileSink|typeof process.stdout;
    skip?: SkipFunc;
}

export type LoggerContext = {
    templateFn: string;
    tokens: ParseDataType[];
    request: Context['request'];
    set: Context['set'];
    store: Context['store'];
    startAt?: [number, number];
    endsAt?: [number, number];
    startTime?: Date;
    endTime?: Date;
    response?: any;
    options?: LoggerOptions
}


function logRequest(options: LoggerOptions, ctx: LoggerContext) {

    const skip = options.skip;

    if (typeof skip === 'function' && skip(ctx)) {
        return
    }


    const fmt = options.format;
    const stream = (options.stream || bun.stdout.writer({}));

    if (fmt === undefined) {
        return;
    }

    const line = getFormatLine(ctx);


    stream.write(line + "\n");

    if ('flush' in stream && typeof stream.flush === 'function') {
        stream.flush();
    }

}

export const logger = (
    options: LoggerOptions|string
) => {
    options = <LoggerOptions>(typeof options === 'string' ? {format: options} : options);
    options.immediate = typeof options.immediate === 'undefined' ? false : options.immediate;


    let fmt = options.format;
    if (!fmt) {
        throw new Error(`Format is not defined`);
    }

    if (Object.keys(LogFormat).includes(fmt)) {
        fmt = LogFormat[<keyof typeof LogFormat>fmt];
    }

    // escape double quotes
    fmt = fmt?.replace(/"/g, '\\"');

    const templateAst = parseTemplate(fmt);
    const templateFn = compileTemplate(templateAst);
    const tokens: ParseDataType[] = <ParseDataType[]>templateAst.map(a => {
        if (a.type === 'param') {
            const token = a.value;
            if (!tokenParser.has(token)) {
                throw new TypeError(`unknown token ${token} in format`);
            }
            return a;
        }
        return null;
    }).filter(t => !!t);

    return new Elysia({
        name: 'elysia-log',
        seed: {options}
    })
        // .state('options', options)
        .decorate(() => ({
            tokens,
            templateFn,
            options: options as LoggerOptions,
        }))
        .derive((ctx) => {
            return {
                startAt: process.hrtime(),
                startTime: new Date(),
                endsAt: undefined,
                endTime: undefined,
            } as {
                startAt: [number, number];
                startTime: Date;
                endsAt?: [number, number]
                endTime?: Date
            }
        })
        .onRequest((ctx) => {
            // in case of error
            ctx.startAt = process.hrtime();
            ctx.startTime = new Date();

            const options = ctx.options;
            if (options.immediate) {
                logRequest(options, {
                    ...ctx
                });
                return;
            }
        })
        .onAfterHandle((context) => {
            context.endsAt = process.hrtime();
            context.endTime = new Date();
        })
        .onResponse((ctx) => {
            const options = ctx.options;
            if (!options.immediate) {
                logRequest(options, {
                    ...ctx
                });
            }
        })
        .onError((ctx) => {
            const options = ctx.options;
            if (ctx.code === "NOT_FOUND") {
                ctx.set.status = 404;
            }
            if (!options.immediate) {
                ctx.endsAt = process.hrtime();
                ctx.endTime = new Date();
                logRequest(options, {
                    ...ctx
                });
            }
        });
}


function getTokenData(ctx: LoggerContext) {
    const tokens = ctx.tokens || [];
    return tokens.reduce<Record<string, string>>((data, token) => {
        data[token.value] = (tokenParser.get(token.value) as any)(ctx, ...(token.args || []))
        return data;
    }, {});
}

function getFormatLine(ctx: LoggerContext) {
    const data = getTokenData(ctx);
    return renderTemplate(ctx.templateFn, data) ;
}
