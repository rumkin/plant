[![npm](https://img.shields.io/npm/v/@plant/plant.svg?style=flat-square)](https://npmjs.com/package/@plant/plant)
[![Travis](https://img.shields.io/travis/rumkin/plant.svg?style=flat-square)](https://travis-ci.org/rumkin/plant)
[![npm](https://img.shields.io/npm/dw/@plant/plant.svg?style=flat-square)](https://npmjs.com/package/@plant/plant)
![](https://img.shields.io/badge/size-71KiB-blue.svg?style=flat-square)

---

Plant is WhatWG standards based web server powered by ES2017, created with
modular architecture and functional design patterns in mind. It uses cascades
and contexts to be modular, pure and less coupled.

Plant is transport agnostic and can work right in the browser using WebSockets
or event PostMessage.

## Features

- 🏎 Faster then Express: **15K** vs **14K** req/sec on Hello World test.
- ☁️ Lightweight: **71 KiB** with comments and 28 KiB when minified.
- 📐 Standards based: uses WhatWG URL and Headers interfaces.

---

## Table of Content

* [Install](#install).
* [Usage](#usage).
* [Examples](#examples).
    * [Gzip example](#gzip-example).
* [API](#api).
    * [Plant](#plant-type).
    * [Handler](#handler-type).
    * [Router](#router-type).
    * [Request](#request-type).
    * [Response](#response-type).
    * [Headers](#headers-type).
    * [Socket](#socket-type).
* [License](#license).

---

## Install

Production version:

```
npm i @plant/plant
```

Or development version:

```
npm i @plant/plant@next
```

## Usage

Plant is abstract web server so it has no builtin transport. It depends on
modules for http, https, ws or even rpc to provide transport layer. In this
example https is using so it package should to be installed
(`npm i @plant/https`).

```javascript
const createServer = require('@plant/https');
const Plant = require('@plant/plant');

const plant = new Plant();

// Send text response
plant.use('/greet', async function({res}) {
    res.body = 'Hello World';
});

// Build request handler
createServer(plant)
.listen(8080);
```

## Examples

* [Hello World](https://github.com/rumkin/plant/tree/master/example/hello-world.js).
* [Echo](https://github.com/rumkin/plant/tree/master/example/echo.js).
* [Router](https://github.com/rumkin/plant/tree/master/example/router.js).
* [Cookie handling](https://github.com/rumkin/plant/tree/master/example/cookie.js).
* [File serving](https://github.com/rumkin/plant/tree/master/example/file.js).
* Response [Gzip compression](https://github.com/rumkin/plant/tree/master/example/gzip.js).
* [Context separations](https://github.com/rumkin/plant/tree/master/example/context.js).
* [Session](https://github.com/rumkin/plant/tree/master/example/session.js).

### Gzip example

Cascades allow to process responses before sending. For example you can gzip
response body:

```javascript
plant.use(async ({req, res}, next) => {
    // Process request
    await next();

    // Create gzip encoder.
    const gzip = zlib.createGzip();
    // Get response body
    const {body} = res;
    // Set Gzip encoding
    res.headers.set('content-encoding', 'gzip');
    // Replace body with stream
    res.stream(gzip);
    // Write data to gzip and close stream.
    gzip.end(body);
});
```

## Cascades explanation

Cascades are nested functions which passes context object to the deepest function.
The flow and depth could be modified using `or` and `and` modifiers. Each level
of cascade could modify context on it's own without touching overlaying
or adjacent context.

Default context contains **req**, **res** and **socket** properties. You can add
your own properties, modify or delete existing:

```javascript
plant.use(async function({req, res, socket}, next) => {
    await next({}); // Set context empty
});

plant.use(async (ctx, next) => {
    ctx; // -> {}
    await next({number: 3.14}); // Create new context with `number` property
});

plant.use(async (ctx, next) => {
    ctx; // -> {number: 3.14}
    await next(); // No context modification
});
```

It allow to create predictable behaviour and avoid unexpected side effects to
change. Plant itself overwrite default node.js HTTP Request and Response objects
with Plant.Request and Plant.Response.

## API

### Plant Type

Plant is the handlers configuration and flow manipulation instrument. It allow to
specify execution order, define routes and set uncaught error handler.
It has no readable props.

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
function conditionHandler({req}, next) {
    if (req.url.searchParams.has('n')) {
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

// Define cascade
plant.and(add, add, add, ({i, res}) => res.text(i)); // i is 3
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

### Router.all()

```text
(url:String, ...handlers:Handle) -> Router
```

Method to add handler for any HTTP method.

### Router.get(), .post(), .put(), .patch(), .delete(), .head(), .options()

```text
(url:String, ...handlers:Handle) -> Router
```

Methods to add handler for exact HTTP method.

##### Example

```javascript
router.get('/users/:id', () => {});
router.post('/users/', () => {});
router.put('/users/:id', () => {});
router.delete('/users/:id', () => {});
// ...
```

### Router.route()

```text
(route:String, ...handlers:Router) -> Router
```

Add `handlers` into routes queue as new router. Subrouter will add matched
url to `basePath` and reduce `path`. This is important for nested routers to
receive url without prefix.

##### Example
```javascript
router.route('/user', ({req}) => {
    req.path; // -> '/'
    req.basePath; // -> '/user'
});
router.get('/user', ({req}) => {
    req.path; // -> '/user'
    req.basePath; // -> '/'
});
```

### Request Type

```text
{
    url: URL,
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
|url| Url is a WhatWG [URL](https://nodejs.org/dist/latest-v9.x/docs/api/url.html#url_class_url) |
|method| Lowercased HTTP method |
|headers| WhatWG Headers object |
|sender| Request sender URI. Usually it is an client IP address |
|domains| Domains name separated by '.' in reverse order |
|path| Current unprocessed pathname part |
|basePath| Pathname part processed by overlaying handler |
|body| Request body. It is `null` by default before body reading|
|data| Data contains values passed within body JSON or Multipart Form|
|stream| Is Readable stream of Request body|

### Request.Request()
```text
(options:RequestOptions) -> Request
```

Creates and configure Request instance. Headers passed to request object should
be in immutable mode.

#### RequestOptions
```text
{
    method:String='get',
    url:String|URL,
    headers:Object|Headers={},
    sender:String,
    body:Buffer|Null=null,
    data:Object={},
    stream:Readable|Null=null,
}
```

### Request.is()
```text
(type:String) -> Boolean
```

Determine if request header 'content-type' contains `type`. Needle `type` can be
a mimetype('text/html') or shorthand ('json', 'html', etc.).

This method uses [type-is](https://www.npmjs.com/package/type-is) package.

### Request.type()
```text
(types:String[]) -> String|Null
```

Check if content-type header contains one of the passed `types`. If so returns
matching value either returns `null`.

##### Example
```javascript
switch(req.type(['json', 'multipart'])) {
    case 'json':
        req.data = JSON.parse(req.body);
        break;
    case 'multipart':
        req.data = parseMultipart(req.body);
        break;
    default:
        req.data = {};
}
```

### Request.accept()
```text
(types:String[]) -> String|Null
```

Check if accept header contains one of the passed `types`. If so returns
matching value either returns `null`.

##### Example
```javascript
switch(req.accept(['json', 'text'])) {
    case 'json':
        res.json({value: 3.14159});
        break;
    case 'text':
        res.text('3.14159');
        break;
    default:
        res.html('<html><body>3.14159</body></html>');
}
```

### Response Type
```text
{
    ok: Boolean,
    hasBody: Boolean,
    statusCode: Number,
    headers: Headers,
    body: Buffer|Stream|String|Null,
}
```

|Property|Description|
|:-------|:----------|
|ok| True if statusCode is in range of 200 and 299|
|hasBody| True if body is not null. Specify is response should be sent|
|statusCode| Status code. `200` By default|
|headers| Response headers as WhatWG Headers object|
|body| Response body. Default is `null`|

### Response.Response()
```text
(options:ResponseOptions) -> Request
```

Creates and configure response options. Headers passed as WhatWG instance should
have mode 'none'.

#### ResponseOptions
```text
{
    statusCode:Number=200,
    headers:Headers|Object={},
    body:Buffer|Stream|String|Null=null,
}
```

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

Send JS value as response with conversion it to JSON string. Set `application/json` content type.

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


### Headers Type

```text
{
    mode: String=Headers.MODE_NONE
}
```

|Property|Description|
|:-------|:----------|
|mode|Headers mutability mode|

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

### Headers.MODE_NONE
```text
String='none'
```

_Constant_. Default Headers mode which allow any modifications.

### Headers.MODE_IMMUTABLE
```text
String='immutable'
```

_Constant_. Headers mode which prevent headers from modifications.

### Headers.Headers()
```text
(headers:HeadersParam, mode:String=Headers.MODE_NONE) -> Headers
```

Constructor accepts header values as object or entries and mode string. Request
headers always immutable so Request.headers will always have MODE_IMMUTABLE mode
value.

#### HeadersParam Type
```text
Object.<String,String>|Array.<Array.<String, String>>
```

##### Example

```javascript
const headers = new Headers({
    'content-type': 'text/plain',
}, Headers.MODE_IMMUTABLE);
// ... same as ...
const headers = new Headers([
    ['content-type', 'text/plain'],
]);
```

### Headers.raw()
```text
(header:String) -> String[]
```

*Nonstandard*. Returns all header values as array. If header is not set returns
empty array.

### Socket Type
```text
{
    isEnded: Boolean = false,
}
```

Socket wraps connection and allow disconnect from other side when needed. To
stop request call `socket.end()`. This will prevent response from be sent and
close connection. All overlay cascades will be executed, but response will not
be sent.

### Socket.Socket()

```text
({onEnd:() -> void}) -> Socket
```

Constructor has one only option `onEnd` which is a function called when
connection ended.

### Socket.isEnded
```text
Boolean
```

Property specifies whether socket is ended. Using to prevent response from
sending and cascade from propagation.

### Socket.end()
```text
() -> void
```

End connection. Call `onEnd` function passed into constructor.

## Error handling

Async cascade model allow to capture errors with try/catch:

```javascript
async function errorHandler({req, res}, next) {
    try {
        await next(); // Run all underlaying handlers
    }
    catch (error) {
        res.status(500);

        if (req.is('json')) {
            res.json({
                error: error.message,
            });
        }
        else {
            res.text(error.message);
        }
    }
};
```

---


## Comparison

Plant is mostly the same as Koa but it has its' own differences.

### Difference from Koa

Plant is trying to be more lightweight like Connect and to have complete interface
like Express. It uses async cascades like in Koa, but plant's context has other
nature. Plant's context is plain object (not a special one) and it could be
modified while moving through cascade but only for underlaying handlers:

```javascript
async function sendVersion({res, v}) {
    res.text(`version: ${v}`);
}

plant.use('/api/v1', async function(ctx, next) {
    ctx.v = 1;
    // Update ctx
    await next(ctx);
}, sendVersion); // This will send `version: 1`

plant.use('/api/v2', async function(ctx, next) {
    ctx.v = 2;
    // Update ctx
    await next(ctx);
}, sendVersion); // This will send `version: 2`

plant.use(sendVersion); // This will send `version: undefined`
```

Also plant is using express-like response methods: text, html, json, send:

```javascript
plant.use(async function({req, res}) {
    res.send(req.stream);
});
```

### Difference from Express

Well middlewares are calling handlers (because it shorter). Plant is an object
(not a function). Plant could not listening connection itself and has no
`listen` method for that. Request and Response objects are not ancestors of
native Node.js's `http.IncomingMessage` and `http.ServerResponse`.

Request object has `domains` property instead of `subdomains` and has *all*
parts of host from tld zone:

```javascript
req.domains; // -> ['com', 'github', 'api'] for api.github.com
```

### Other custom behavior

Request method property value is lowercased:

```javascript
req.method; // -> 'get'
```

## License

MIT.

## Copyright

&copy; Rumkin, 2017-2018.
