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
const httpHandler = require('@plant/http-adapter');
const Plant = require('@plant/plant');

const plant = new Plant();

// Send text response
plant.use('/greet', async function({res}) {
    res.body = 'Hello World';
});

// Build request handler
http.createServer(httpHandler(plant))
.listen(8080);
```

## Examples

* [Hello World](https://github.com/rumkin/plant/tree/master/example/hello-world.js).

## API

### createRequestHandler()
```text
(plant:Plant) -> (req:http.Request, res: http.Response) -> void
```

Return native HTTP server request handler.

## License

MIT.

## Copyright

&copy; Rumkin 2017-2018
