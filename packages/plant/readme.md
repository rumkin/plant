<p align="center">
    <img alt="Plant logo" src="assets/cover.png" width="300"/>
</p>

[![npm](https://img.shields.io/npm/v/@plant/plant.svg?style=flat-square)](https://npmjs.com/package/@plant/plant)
[![npm](https://img.shields.io/npm/dw/@plant/plant.svg?style=flat-square)](https://npmjs.com/package/@plant/plant)
![](https://img.shields.io/badge/size-8KiB-blue.svg?style=flat-square)

---

Plant is WebAPI standards based HTTP2 web server, created with
modular architecture and functional design in mind. It's modular, pure and less coupled.

Plant supports HTTP 1 and HTTP 2 protocols. But it's transport agnostic and can work right
in the browser over WebSockets, WebRTC, or PostMessage.

## Features

- ☁️ Lightweight: only 8 KiB minified and gzipped.
- ✨ Serverless ready: works even in browser.
- 🛡 Security oriented: uses the most strict [Content Securiy Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) (CSP) by default.
- 📐 Standards based: uses WebAPI interfaces.
- 🛳 Transport agnostic: no HTTP or platform coupling, ship requests via everything.

---

## Table of Contents

* [Install](#install).
* [Usage](#usage).
* [Examples](#examples).
* [API](#api).
    * [Plant](#plant-type).
    * [Handler](#handler-type).
    * [Peer](#peer-type).
    * [Request](#request-type).
    * [Response](#response-type).
    * [Route](#route-type).
    * [Headers](#headers-type).
    * [Socket](#socket-type).
    * [URI](#uri-type).
    * [fetch](#fetch).
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

Plant is designed to platform independent thus it has no builtin transport. It
requires modules for http, https, WebSocket or anything else to provide
transport layer. In this example http is used and `@plant/http2` should be
installed (`npm i @plant/http`).

> ⚠️ Note that default CSP header value is `default-src: 'self'; child-src: 'none'`.
> This will prevent web page from loading any external resource at all.
> Set minimal required CSP on your own. Read about [CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) on Mozilla Developer Network

```javascript
const createServer = require('@plant/http')
const Plant = require('@plant/plant')

const plant = new Plant()

// Send text response
plant.use(async function({res}) {
    res.body = 'Hello World'
})

// Build request handler
createServer(plant)
.listen(8080)
```

### Important notices

* Plant doesn't work with native node streams. It understands only WebAPI
  streams. Use [web-stream-polyfills](https://npmjs.com/package/web-stream-polyfills)
  package to wrap node.js stream. It's made for decreasing Node.js coupling.
* Plant avoid extensions of Request and Response instances like Express do. It's
  using modifiable context for that. You should avoid extension. To prevent
  collisions it's recommended to use symbol as context entry name. Watch
  [context extension example](https://github.com/rumkin/plant/tree/master/example/context-extension.js).

## Examples

* [Hello World](https://github.com/rumkin/plant/tree/master/example/hello-world.js).
* [Echo](https://github.com/rumkin/plant/tree/master/example/echo.js).
* [Router](https://github.com/rumkin/plant/tree/master/example/router.js).
* [Cookie handling](https://github.com/rumkin/plant/tree/master/example/cookie.js).
* [File streaming](https://github.com/rumkin/plant/tree/master/example/file-stream.js).
* [Context separations](https://github.com/rumkin/plant/tree/master/example/context.js).
* [Context extension](https://github.com/rumkin/plant/tree/master/example/context-extension.js).

## Context

By default context has this properties:

* `req` – [Request](#request-type) instance. Request from client.
* `res` – [Response](#response-type) instance. Response to client.
* `route` – [Route](#route-type) instance. Current processed path.
* `peer` – [Peer](#peer-type) instance. Other side of connection.
* `socket` – [Socket](#socket-type) instance. Connection socket.
* `fetch`– [fetch()](#fetch) function. Method to send request to itself.

## Cascades explanation

Cascades are nested functions which passes context object to the deepest function.
The flow and depth could be modified using `or` and `and` modifiers. Each level
of cascade could modify context on it's own without touching overlaying
or adjacent contexts.

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

It allows to create predictable behavior and avoid unexpected side effects.
Plant itself overwrites default node.js HTTP Request and Response objects
with Plant.Request and Plant.Response.

## API

### Plant Type

Plant is the main configuration instrument. It's using to specify execution order,
define routes and set uncaught error handler.

### Plant.constuctor()
```text
([options:PlantOptions]) -> Plant
```

#### PlantOptions Type
```text
{
    handlers: Handlers[] = [],
    context: Object = {},
}
```

Plant server configuration options.

|Property|Description|
|:-------|:----------|
|handlers| Array of request handlers added to cascade|
|context| Default context values. Empty object by default|

### Plant.use()
```text
([route:String], ...handlers:Handler) -> Plant
```

This method do several things:
1. If route specified, adds route matcher. Route like `/blog/post` will match
   `/blog/post` and `/blog/post` but not `/blog/post-true` or `/blog/post/1`.
   Wildcard domains requires asterisk at the end of route. So only route `/blog/post/*`
   will match `/blog/post/` and `/blog/post/1`.
2. If handler count greater than one it creates turn for request which allows
to change Request execution direction.

##### Example

```javascript
function conditionHandler({req}, next) {
    if (req.url.searchParams.has('page')) {
        return next();
    }
}

plant.use('/posts', conditionHandler, ({res}) => res.text('page param passed'));
plant.use('/posts', ({res}) => res.text('page param not passed'));
plant.use('/posts/*', ({res}) => res.text('internal page requested'))
```

### Plant.or()
```text
(...handlers: Handler) -> Plant
```

Add handlers in parallel. Plant will iterate over handler until response body is
set or any handler exists.

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

### Plant.getHandler()

```text
() -> (context: InitialContext) -> Promise<InitialContext, Error>
```

This method returns request handler for http adapter:

#### InitialContext Type
```
{
    req: Request,
    res: Response,
    peer: Peer,
    socket?: Socket,
    route?: Route,
    [key:string]?: *,
}
```

Initial context is minimal context which could be used by Plant handler to
generate response. Entries like `socket` and `route` will be generated
automatically inside of handler if they are not presented. Entry `fetch` is
generating by default and will be overwritten.

##### Example

```javascript
const http = require('http')
const createRequestListener = require('@plant/http-adapter')
const Plant = require('@Plant/plant')

http.createServer(
    createRequestListener(plant.getHandler())
)
.listen(8080);
```

### Handler Type

This type specify cascadable function or object which has method to create such function.

```javascript
const Router = require('@plant/router');

const router = new Router();
router.get('/', ({res}) => {
    res.body = 'Hello';
});

server.use(router.handler());
```

### Peer Type
```text
{
    uri: URI
}
```

This type represents other side of request connection. It could be user or
proxy-server. This instance could be non unique for each request if the peer has
sent several requests using the same connection.

For local TCP connections it could look like this:

```javascript
new Peer({
    uri: new URI({
        protocol: 'tcp:',
        hostname: '127.0.0.1',
        port: 12345,
    })
})
```

### Request Type

```text
{
    url: URL,
    method: String,
    headers: Headers,
    domains: String[],
    body: ReadableStream|null,
    buffer: ArrayBuffer|null,
}
```

|Property|Description|
|:-------|:----------|
|url| Url is a WebAPI [URL](https://nodejs.org/dist/latest-v9.x/docs/api/url.html#url_class_url) |
|method| HTTP method |
|headers| WebAPI Headers object |
|domains| Domains name separated by '.' in reverse order |
|body| Request body readable stream. It is `null` by default if body not exists (GET, HEAD, OPTIONS request).|
|buffer| If body has been read already this property will contain a buffer |
|parent   |**non-standard** Request that caused current request to be called. For example for http2 push |

### Request.Request()
```text
(options:RequestOptions) -> Request
```

Creates and configure Request instance. Headers passed to request object should
be in immutable mode.

#### RequestOptions
```text
{
    method: String='GET',
    url: URL,
    headers: Object|Headers={},
    body: ReadableStream|Null=null,
    parent: Request|Null = null,
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
matching value otherwise returns `null`.

##### Example
```javascript
switch(req.accept(['json', 'text'])) {
    case 'json':
        res.json({result: 3.14159});
        break;
    case 'text':
        res.text('3.14159');
        break;
    default:
        res.html('<html><body>3.14159</body></html>');
}
```

### `Request.arrayBuffer()`
```
() -> Promise<Uint8Array,Error>
```

Read request body and returns it as an Uint8Array.

### `Request.blob()`
```
() -> Promise<Blob,Error>
```
> ⚠️ Not implemented yet

Read request body and returns it as a [Blob](https://developer.mozilla.org/en-US/docs/Web/API/Body/blob).

### `Request.formData()`
```
() -> Promise<FormData,Error>
```
> ⚠️ Not implemented yet

Read request body and returns it as a [FormData](https://developer.mozilla.org/en-US/docs/Web/API/FormData).

### `Request.json()`
```
() -> Promise<*,Error>
```

Read request body and parse it as JSON.

### `Request.text()`
```
() -> Promise<string,Error>
```

Read request body and returns it as a string.

### Response Type
```text
{
    url: URL,
    ok: Boolean,
    hasBody: Boolean,
    status: Number,
    headers: Headers,
    body: TypedArray|ReadableStream|String|Null,
}
```

|Property|Description|
|:-------|:----------|
|url| Request url|
|ok| True if status is in range of 200 and 299|
|hasBody| True if body is not null. Specify is response should be sent|
|status| Status code. `200` By default|
|headers| Response headers as WebAPI Headers object|
|body| Response body. Default is `null`|

### Response.Response()
```text
(options:ResponseOptions) -> Request
```

Creates and configure response options. Headers passed as WebAPI instance should
have mode 'none'.

#### ResponseOptions
```text
{
    url: URL,
    status: Number=200,
    headers: Headers|Object={},
    body: TypedArray|ReadableStream|String|Null=null,
}
```

### Response.setStatus()
```text
(status:number) -> Response
```

Set response `status` property.

##### Example

```javascript
res.setStatus(200)
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
// You should implement webApiStream yourself it's not a standard method.
// You can use web-streams-polyfill for it.
res.stream(webApiStream(fs.createReadStream(req.path)));
```

### Response.send()

```text
(content:String|Buffer|Stream) -> Response
```

Set any string-like value as response.

### Response.empty()

```text
() -> Response
```

Set empty body.

### Route Type
```
{
    path: string,
    basePath: string,
    params: Object,
    captured: [{path: string, params: Object}],
}
```

Route type represents which part of path is handling now. It's using by nested
routers. It stores parsed path in `basePath` and unparsed part in `path`
properties. All extracted values are stored in `params`. Properties `params` and
`captured` are frozen with `Object.freeze`.

|Property|Description|
|:-------|:----------|
|path| Unparsed part of requested URL|
|basePath| Parsed part of requested URL|
|params| Params extracted from the `basePath` |
|captured| Captured components of route |

### Route.capture()
```
(path: string, [params: object]) -> Route
```

Cut `path` from route `Route#path` and append it to `Route#basePath`. Extend
`Route#params` with values from `params`. Push path-params pair to `Route#captured` array.

### Route.clone()
```
() -> Route
```

Clone route object

### Route.extend()
```
(props: {
    path?: string
    basePath?: string,
    params?: object,
    captured?: [Capture],
}) -> Route
```

Override current values with the new `props`.
```

### Headers Type

```text
{
    mode: String=Headers.MODE_NONE
}
```

|Property|Description|
|:-------|:----------|
|mode|Headers mutability mode|

Plant is using [WebAPI Headers](https://developer.mozilla.org/en-US/docs/Web/API/Headers) for Request and Response.

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
    res.send(webApiStream(fs.createReadStream('logo.png')));
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
    canPush: Boolean = false,
}
```

Socket wraps connection and allow disconnect from other side when needed. To
stop request call `socket.end()`. This will prevent response from be sent and
close connection. All overlay cascades will be executed, but response will not
be sent.

### Socket.Socket()

```text
(options:{
    onEnd?:() -> void,
    onPush?(response: Response) -> Promise<void, Error>,
}) -> Socket
```

Constructor has `onEnd` option which is a function called when
connection ended and `onPush` option which is push handler, if it is specified
then `Socket#canPush` will be set to `true`.

### Socket.canPush
```Text
Boolean
```

Determine wether socket allows to push responses.

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

### Socket.destroy()
```text
() -> void
```

⚠️ It should not be called in handlers. This method is for low level request
handlers only.

Destroy connection and remove events listeners.

### Socket.push()
```
(response: Response) -> Promise<void,Error>
```

Push response to the client. If it's supported.


## URI Type

URI is an object that represents URI in plant. While URL requires protocols
to be registered by IANA, WebAPI URL wouldn't parse strings with custom scheme like
`tcp://127.0.0.1:12345/` (`127.0.0.1:12345` became a part of pathname).
Thus we use URI, which doesn't mean to be an URL, but presents network
identifier correct. Plant doesn't provide parser and URI should be generated
manually.

This is how Plant represents TCP address of the HTTP peer:

```javascript
new URI({
    protocol: 'tcp:',
    hostname: 'localhost',
    port: '12345',
    pathname: '/',
})
```

This implementation will be enhanced with parser in one of the next versions.

### fetch()
```
(request:Request|String|URL|requestOptions, context:Object) -> Promise<Response>
```

Send request to the server.

```js
plant.use(async ({res, socket, fetch}) => {
    if (socket.canPush) {
        await fetch('/style.css')
        .then((styleRes) => socket.push(styleRes))
    }

    res.body = '<html>...'
})
```

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

### Domains instead of subdomains

Request object has `domains` property instead of `subdomains` and has *all*
parts of host from tld zone:

```javascript
req.domains; // -> ['com', 'github', 'api'] for api.github.com
```

### No extension

Plant doesn't extends Request or Response object with new methods. It's using
context which be modified and extended with new behavior.

## License

MIT &copy; [Rumkin](https://rumk.in)
