# Plant HTTP Adapter

---

This handler connect Plant and native Node's HTTP server.

## Install

Production version from NPM registry:

```bash
npm i @plant/http
```

Adapter has Plant as peer dependency so you need to install it too:

```bash
npm i @plant/plant
```


## Usage

```javascript
const http = require('http');
const Plant = require('@plant/plant');
const {createRequestHandler} = require('@plant/http-adapter');

const plant = new Plant();

// Send text response
plant.use('/greet', async function({res}) {
    res.body = 'Hello World';
});

// Build request handler
http.createServer(createRequestHandler(plant))
.listen(80);
```

## Examples

* [Hello World](https://github.com/rumkin/plant/tree/master/example/hello-world.js).

## API

### `createRequestHandler()`
```text
(plant:Plant, intermediate: Handler) -> HttpRequestListener
```

Return native HTTP server request handler, which pass request through
`intermediate` handlers and then pass to the `plant`. Intermediate handlers
have access to both HTTP (`httpReq`, `httpRes`) and Plant (`req`, `res`)
requests and responses.

### `HttpRequestListener()`
```text
(req: http.Request, res: http.Response) -> void
```

This is standard request listener from Node.js HTTP built-in module.


## License

MIT &copy; [Rumkin](https://rumk.in)
