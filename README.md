# elysia-morgan

A plugin for Elysia Web framework that logs requests just like express/morgan middleware.

## Installation

```bash
bun add @yalhyane/elysia-morgan
```

## Example
### Using predefined format
```bash
import { Elysia } from 'elysia'
import { logger, LogFormat } from '@yalhyane/elysia-morgan'

const app = new Elysia()
    .use(logger(LogFormat.tiny)  
    .listen(8080)
```

### Using custom format
```bash
import { Elysia } from 'elysia'
import { logger, LogFormat } from '@yalhyane/elysia-morgan'

const app = new Elysia()
    .use(logger({
      format: '[date] :method :url :status - :response-time ms',
      immediate: false
    })  
    .listen(8080)
```

### Writing logs to a file
```bash
import { Elysia } from 'elysia'
import { logger, LogFormat } from '@yalhyane/elysia-morgan'

const accessLogStream = Bun.file("./access.log").stream();

const app = new Elysia()
    .use(logger({
      format: LogFormat.combined,
      immediate: false,
      stream: accessLogStream
    })  
    .listen(8080)
```

This project was created using `bun init` in bun v1.0.4. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
