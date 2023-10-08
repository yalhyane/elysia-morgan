export type ParseDataType = { type: 'text' | 'param', value: string, args?: string[] };


// parse template token
export const parseTemplate = (template: string) => {
    const reg = /:([-\w]{2,})(?:\[([^\]]+)\])?/g;
    let result;
    let arr: ParseDataType[] = [];
    let position = 0;
    while ((result = reg.exec(template)) !== null) {
        arr.push({
            type: 'text',
            value: template.substring(position, result.index)
        });
        arr.push({
            type: 'param',
            value: result[1].trim(),
            args: (result[2] || '').trim().split(',')
        });
        position = reg.lastIndex;
    }

    arr.push({
        type: 'text',
        value: template.slice(position)
    });

    return arr.filter(s => !!s);
}

// compile the template
export const compileTemplate = (data: ParseDataType[]) => {
    let fn = `return ""`;


    for (const e of data) {
        if (e.type === 'param') {
            fn = `${fn} + data['${e.value}']`
            continue;
        }

        fn = `${fn} + "${e.value}"`;

    }

    return fn;

}


// render the template
export const renderTemplate = (template: string, data: Record<string, any>) => {
    const fn = Function('data', template);
    return fn(data);
}

export enum LogFormat {

    // Apache combined log format.
    combined = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"',

    // Apache common log format.
    common = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length]',

     // Default format.
     'default' = ':remote-addr - :remote-user [:date] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"',

    // Short format.
    short = ':remote-addr :remote-user :method :url HTTP/:http-version :status :res[content-length] - :response-time ms',

    // Tiny format.
    tiny = ':method :url :status :res[content-length] - :response-time ms',


    // dev format
    dev = ':method :url :status :response-time ms - :res[content-length]',
}

