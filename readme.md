<p align="center">
  <img alt="Plant logo" src="packages/plant/assets/cover.png" width="300"/>
</p>

# Plant

[![npm](https://img.shields.io/npm/v/@plant/plant.svg?style=flat-square)](https://npmjs.com/package/@plant/plant)
[![npm](https://img.shields.io/npm/dw/@plant/plant.svg?style=flat-square)](https://npmjs.com/package/@plant/plant)
![](https://img.shields.io/badge/size-8KiB-blue.svg?style=flat-square)

[NPM](https://npmjs.com/package/@plant/plant) ·
[Source](packages/plant) · [Readme](packages/plant/readme.md)

Plant is WebAPI standards based HTTP2 web server, created with
modular architecture and functional design in mind. Also it's pure and less coupled.

Plant supports HTTP 1 and HTTP 2 protocols. But it's transport agnostic and can work right
in the browser over WebSockets, WebRTC, or PostMessage.

## Features

- ☁️ Lightweight: only **8** KiB minified and gzipped.
- ✨ Serverless ready: works even in browser.
- 🛡 Security oriented: uses the most strict [Content Securiy Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) (CSP) by default.
- 📐 Standards based: uses WebAPI interfaces.
- 🛳 Transport agnostic: no HTTP or platform coupling, ship requests via __everything__.

---

## Table of Contents

* [Install](#install)
* [Examples](#exmaples)
* [Packages](#packages)
* [Internal packages](#internal-packages)

## Install

```bash
# Install plant web server
npm i @plant/plant
# Install node HTTP2 transport
npm i @plant/http2
```

## Examples

### Hello World

Hello world with HTTP2 as transport.

> ⚠️ Note that default CSP header value is `default-src localhost; form-action localhost`.
> This will prevent  web page from loading any external resource at all.
> Set minimal required CSP on your own. Read about [CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) on Mozilla Developer Network


```javascript
// Build request handler
const createServer = require('@plant/http2');
const Plant = require('@plant/plant');

const plant = new Plant();
plant.use(({res}) => {
  res.body = 'Hello, World!'
})

createServer(plant)
.listen(8080)
```

### Router

Plant's builtin router is extremely simple and works only with
exact strings. But there is more powerful router package which brings named params and regular expressions into routing.

```javascript
const Plant = require('@plant/plant');
const Router = require('@plant/router');

const plant = new Plant()
const router = new Router()

router.get('/user/:name', async function({res, route}) {
  res.body = `Hello, ${route.params.name}!`
})

plant.use('/api/v1/*', router)
```

### HTTP2 pushes

Hello world with HTTP2 as transport.

```javascript
// Build request handler
const createServer = require('@plant/http2');
const Plant = require('@plant/plant');

const plant = new Plant();

plant.use('/script.js', ({res}) => {
  res.headers.set('content-type', 'application/javascript')
  res.body = 'console.log("Hello")'
})

plant.use('/index.html', ({res, fetch}) => {
  // Push '/script.js' URL to pushed resources.
  // It will be requested before sending main response.
  res.push(new URL('/script.js', res.url))
  // ... or ...
  // Push complete response from subrequest
  res.push(
    await fetch('/script.js')
  )

  res.body = '<html><script src="/script.js"></script></html>'
})

createServer(plant)
.listen(8080)
```


## Packages

### [Router](packages/router) `@plant/router`

[NPM](https://npmjs.com/package/@plant/router) ·
[Source](packages/router) · [Readme](packages/router/readme.md)

Plant standalone router.


### [HTTP2](packages/http2) `@plant/http2`

[NPM](https://npmjs.com/package/@plant/http2) ·
[Source](packages/http2) · [Readme](packages/http2/readme.md)

Plant adapter for native node.js http2 module server. It creates server
listener from Plant instance and `http2.createServer()` [options](https://nodejs.org/dist/latest-v11.x/docs/api/http2.html#http2_http2_createserver_options_onrequesthandler). It's
usage is the same as https module.

### [HTTPS2](packages/https2) `@plant/https2`

[NPM](https://npmjs.com/package/@plant/https2) ·
[Source](packages/https2) · [Readme](packages/https2/readme.md)

Plant adapter for native node.js http2 module SSL server. It creates server
listener from Plant instance and `http2.createSecureServer()` [options](https://nodejs.org/dist/latest-v11.x/docs/api/http2.html#http2_http2_createsecureserver_options_onrequesthandler). It's
usage is the same as https module.

### [HTTP](packages/http) `@plant/http`

[NPM](https://npmjs.com/package/@plant/http) ·
[Source](packages/http) · [Readme](packages/http/readme.md)

Plant adapter for native node.js http module. It creates server listener from plant instance.

### [HTTPS](packages/https) `@plant/https`

[NPM](https://npmjs.com/package/@plant/https) ·
[Source](packages/https) · [Readme](packages/https/readme.md)

Plant adapter for native node.js https module. It creates server listener from plant instance and https options.

## Internal packages

### [flow](packages/flow) `@plant/flow`

[NPM](https://npmjs.com/package/@plant/flow) ·
[Source](packages/flow) · [Readme](packages/flow/readme.md)

This is library for cascades. This is where contexts manage take place and requests pass from one handler to another.

### [HTTP Adapter](packages/http-adapter) `@plant/http-adapter`

[NPM](https://npmjs.com/package/@plant/http-adapter) ·
[Source](packages/http-adapter) · [Readme](packages/http-adapter/readme.md)

This package is using to connect Plant and native Node's HTTP server. Modules http, https, http2, and https2 use it under the hood.

### [Test HTTP Suite](packages/test-http) `@plant/test-http`

[NPM](https://npmjs.com/package/@plant/test-http) ·
[Source](packages/test-http) · [Readme](packages/test-http/readme.md)

Tiny package with tools for HTTP testing. It simplify server creation and request sending and receiving.

## License

MIT &copy; [Rumkin](https://rumk.in)
