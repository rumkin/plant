# Plant Test HTTP Suite

This is a very simple test servers made for Plant development.

## Install

```bash
npm i @plant/test-http
```

## Usage

```javascript
const {createHttp} = require('@plant/test-http')
// or
const createHttp = require('@plant/test-http/http')

const server = createHttp((req, res) => {
  res.end('Hello')
})

server.listen(0)

server.fetch('/index.html')
.then(({status, headers, body, text}) => {
  body.toString('utf8') === text; // true
})
```

## API

* `createHttp()` – create HTTP test server
* `createHttp2()` – create HTTP2 test server
* `createHttps()` – create HTTPS test server
* `createHttps2()` – create HTTPS2 test server (the same as http2, but with HTTP2 test options)
* `fetchHttp()` – fetch HTTP resource using promisified API.
* `fetchHttp2()` – fetch HTTP2 resource using promisified API.
* `fetchHttps()` – fetch HTTPS resource using promisified API.

## Copyright

MIT &copy; [Rumkin](https://rumk.in)
