# 🌳 Plant

[![npm](https://img.shields.io/npm/v/@plant/plant.svg?style=flat-square)](https://npmjs.com/package/@plant/plant)
[![Travis](https://img.shields.io/travis/rumkin/plant.svg?style=flat-square)](https://travis-ci.org/rumkin/plant)
[![npm](https://img.shields.io/npm/dw/@plant/plant.svg?style=flat-square)](https://npmjs.com/package/@plant/plant)
![](https://img.shields.io/badge/size-52%20KiB-blue.svg?style=flat-square)

---

Plant is ES2017 WhatWG standard based web server created with modular architecture in mind
and functional design patterns on practice. It uses cascades (an isolated customizable contexts)
to be modular and pure.

## 💪 Features

- Modular.
- Powerful.
- Predictable.
- WhatWG standards friendly.
- Lightweight (52Kb).

## Install

Production version from NPM registry:

```
npm i @plant/plant
```

Latest dev version from github:
```bash
npm i rumkin/plant
```

## Usage

Plant is using cascades: independent modifiable context protected from intersection.

```javascript
const http = require('http');
const Plant = require('@plant/plant');

const plant = new Plant();

// Send text response
plant.use('/greet', async function({res}, next) {
    res.body = 'Hello World';
});

// Build request handler
http.createServer(plant.handler())
.listen(8080);
```

## Examples

* [Cookie handling](https://github.com/rumkin/plant/tree/master/examples) example.
* [File serving](https://github.com/rumkin/plant/tree/master/examples) example.
* [Context separations](https://github.com/rumkin/plant/tree/master/examples/context.js) example.
* [Session](https://github.com/rumkin/plant/tree/master/examples/session.js) example.

## Cascades

Cascades is is isolated scopes presented with Context objects. Each level
of cascade could modify context on it's own without touching overlaying context.

Default context contains **req**, **res** and **socket** items. And you can
specify your own context to underlaying cascades:

```javascript
plant.use(async function({req, res, socket}, next) => {
    await next({});
});

plant.use(async (ctx, next) => {
    ctx; // -> {}
});
```

It allow to create predictable behaviour and avoid unexpected side effects to
change. Plant itself overwrite default node.js HTTP Request and Response objects
with Plant.Request and Plant.Response.

## Router

Plant designed to be API and WebApps ready. So it provide router out from the box.

```javascript
const Plant = require('@plant/plant');
const {Router} = Plant;

const plant = new Plant();

// Greeting manager
class GreetManager {
    constructor(user) {
        this.user = user;
    }

    greet() {
        return `Hello, ${this.user}`;
    }
}

// Greeting manager router
function greetingRouter(manager) {
    const router = new Router();

    router.get('/', ({res}) => {
        res.body = manager.greet();
    });

    return router;
}

plant.use('/guest', greetingRouter(new GreetManager('guest')));
plant.use('/admin', greetingRouter(new GreetManager('Admin')));
plant.use('/world', greetingRouter(new GreetManager('World')));
```

Routers are stackable too so it's possible to create complex routers.

## API

### Plant Type

Plant is the handlers configuration tool. It allow to
specify execution order, define routes and set uncaught error handler. It has no readable props.

### Plant.constuctor()
```text
([options:PlantOptions]) -> Plant
```

#### PlantOptions Type
```text
{
    handlers: Handlers[] = [],
    errorHandler: (Error) -> void = console.log,
    context: Object = {},
}
```

Plant server configuration options.

|Property|Description|
|:-------|:----------|
|handlers| Array of request handlers added to cascade|
|errorHandler| This error handler will capture unhandled error when response is send|
|context| Default context values. Empty object by default|

### Plant.use()
```text
([route:String], ...handlers:Handler) -> Plant
```

This method do several things:
1. If route specified add route.
2. If handler count greater than one it creates turn for request which allow
to change Request execution direction.

##### Example

```javascript
function conditionHandler({res}, next) {
    if ('n' in req.url.query) {
        return next();
    }
}

plant.use('/a', conditionHandler, ({res}) => res.text('n param passed'));
plant.use('/a', ({res}) => res.text('n param not passed'));
```

### Plant.or()
```text
(...handlers: Handler) -> Router
```

Add handlers in parallel. Plant will iterate over handler until response body is set.

##### Example

```javascript
plant.or(
    // Executed. Send nothing, so go to the next handler.
    ({req}) => {},
    // Executed. Send 'ok'.
    ({res}) => { res.body = 'ok'; },
    // Not executed. Previous handler set response body.
    ({req}) => {}
);
```

### Plant.and()
```text
(...handlers:Handle) -> Plant
```
This method set new cascades. It's the same as call `use` for each handler.

##### Example
```javascript
function add({i = 0, ctx}, next) {
    return next({...ctx, i: i + 1});
}

// This ...
plant.and(add, add, add, ({i, res}) => res.send(i)); // i is 3

// ... is same as call `use` serially:
plant.use(add);
plant.use(add);
plant.use(add);
plant.use(({i, res}) => res.send(i)); // i is 3

```

### Plant.router()

```text
(route:Router, routes:RouterOptions) -> Plant
```

Route method initialize new router with `params` and add it into cascade.

##### Example

```javascript
// Few useful handlers
function handleGetUser({req, res}) { /* get user and return response */ }
function handleUpdateUser({req, res}) {/* update user and return response */}

// Configure with routes mapping.
plant.router({
    'get /users/:id': handleGetUser,
    'put /users/:id': handleUpdateUser,
});

// Configure with factory function
plant.router((router) => {
    router.get('/users/:id', handleGetUser);
    router.put('/users/:id', handleUpdateUser);
});
```

### Plant.handler()

```text
() -> http.RequestListener
```

This method returns requestListener value for native node.js http/https server:

##### Example

```javascript
http.createServer(plant.handler())
.listen(8080);
```

### Handler Type

This type specify cascadable function or object which has method to create such function.

```javascript
const router = new Router();
router.get('/', ({res}) => {
    res.body = 'Hello';
});

server.use(router.handler());
```

### Router Type

Router allow to group url-dependent functions and extract params from URL.

##### Example

```javascript
const plant = new Plant();
const router = new Plant.Router;

router.get('/', () => { /* get resource */ });
router.post('/', () => { /* post resource */ });
router.delete('/', () => { /* delete resource */ });

plant.use(router);
```

### Router.get()

```text
(url:String, ...handlers:Handle) -> Router
```

##### Example

```javascript
router
```

### Request Type

```text
{
    url: UrlObject,
    method: String,
    headers: Headers,
    sender: String,
    domains: String[],
    path: String,
    basePath: String,
    body: Buffer|Null,
    data: Object,
    stream: Stream,
}
```

|Property|Description|
|:-------|:----------|
|url| Url is a result of `url.parse` call. It's presented with [UrlObject](https://nodejs.org/dist/latest-v9.x/docs/api/url.html#url_legacy_urlobject) |
|method| Lowercased HTTP method |
|headers| WhatWG Headers object |
|sender| Request sender URI. Usually it is an client IP address |
|domains| Domains name separated by '.' in reverse order |
|path| Current unprocessed pathname part |
|basePath| Pathname part processed by overlaying handler |
|body| Request body. It is `null` by default before body reading|
|data| Data contains values passed within body JSON or Multipart Form|
|stream| Is Readable stream of Request body|

### Request.is()
```text
(type:String|String[]) -> Boolean
```

Determine if request header 'content-type' contains `type`. Needle `type` can be
a mimetype('text/html') or shorthand ('json', 'html', etc.).

This method uses [type-is](https://www.npmjs.com/package/type-is) package.

### Response Type
```text
{
    statusCode: Number,
    headers: Headers,
    body: Buffer|Stream|String|Null
}
```

|Property|Description|
|:-------|:----------|
|statusCode| Status code. `200` By default|
|headers| Response headers as Whatwg Headers object|
|body| Response body. Default is `null`|

### Response.status()
```text
(statusCode:number) -> Response
```

Set response `statusCode` property.

##### Example

```javascript
res.status(200)
.send('Hello');
```

### Response.redirect()

```text
(url:String) -> Response
```

Redirect page to another url. Set empty body.

##### Example

```javascript
res.redirect('../users')
.text('Page moved');
```

### Response.json()

```text
(json:*) -> Response
```

Convert JS value as response converting it to JSON string. Set `application/json` content type.

```javascript
res.json({number: 3.14159});
```

### Response.text()

```text
(text:String) -> Response
```

Send text as response. Set `text/plain` content type.

##### Example

```javascript
res.text('3.14159');
```

### Response.html()

```text
(html:String) -> Response
```
Send string as response. Set `text/html` content type.

##### Example

```javascript
res.html('<html><body>3.14159</body></html>');
```

### Response.stream()

```text
(stream:Readable) -> Response
```
Send Readable stream in response.

##### Example

```javascript
res.headers.set('content-type', 'application/octet-stream');
res.stream(fs.createReadStream(req.path));
```

### Response.send()

```text
(content:String|Buffer|Stream) -> Response
```

Set any string-like value as response.

### Response.end()

```text
() -> Response
```

Set empty body.

### Headers interface

Plant is using [WhatWG Headers](https://developer.mozilla.org/en-US/docs/Web/API/Headers) for Request and Response.

```javascript
// Request headers
plant.use(async function({req}, next) {
    if (req.headers.has('authorization')) {
        const auth = req.headers.get('authorization');
        // Process authorization header...
    }

    await next();
});

// Response headers
plant.use(async function({req, res}, next) {
    res.headers.set('content-type', 'image/png');
    res.send(fs.createReadStream('logo.png'));
});
```

> Request Headers object has immutable mode (Headers.MODE_IMMUTABLE) and
according to specification it will throw each time when you try to modify it.

### Error capturing

With cascade async model errors could be captured with try/catch:

```javascript
plant.use(async function({req, res}, next) {
    try {
        await next();
    } catch (error) {
        res.status(500);

        if (req.is('json')) {
            res.json({
                error: error.message,
            });
        } else {
            res.text(error.message);
        }
    }
});
```

### Difference from Koa

Plant tries to be more lightweight like connect and has simple interface like express. It uses async cascades like in Koa, but plant's context has other nature. Plant's context is customizable but isolated. It passed with `next` call:

```javascript
async function sendVersion({res, v}) {
    res.text(`version: ${v}`);
}

plant.use('/api/v1', async function(ctx, next) {
    ctx.v = 1;
    // Update ctx
    await next(ctx);
}, sendVersion); // This will send 1

plant.use('/api/v2', async function(ctx, next) {
    ctx.v = 2;
    // Update ctx
    await next(ctx);
}, sendVersion); // This will send 2
```

Also plant is using express-like response methods: text, html, json, send:

```javascript
plant.use(async function({req, res}) {
    res.send(req.stream);
});
```

### Difference from Express

The first: middlewares are called handlers. Plant is an object (not a function), it has no `listen` method at all.
Request and Response objects are not ancestors of http.IncomingMessage and http.ServerResponse.

Request object has `domains` property instead of `subdomains` and has *all* parts of host from tld zone:

```javascript
req.domains; // -> ['com', 'github', 'api'] for api.github.com
```

### Other custom behaviour

Request method property value is lowercased:

```javascript
req.method; // -> 'get'
```

## License

MIT.
