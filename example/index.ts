import { Elysia } from 'elysia'
import {logger} from '../src/index.ts';

const app = new Elysia()
    .use(
        logger('dev')
    )
    .get('/', () => 'A')
    .listen(3000)

console.log(`Elysia is running at ${app.server?.hostname}:${app.server?.port}`)

app.fetch(
    new Request('http://localhost:3000/', {})
);

export type App = typeof app
console.log('Server is running on port 3000.')
