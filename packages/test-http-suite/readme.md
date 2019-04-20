# Plant Test HTTP Suite

This is a very simple test servers made for Plant development.

## Install

```bash
npm i @plant/test-server-suite
```

## Usage

```javascript
const createHttp = require('@plant/test-server-suite/http')

const server = createHttp((req, res) => {
    res.end('Hello')
})

server.listen(0)

server.fetch('/index.html')
.then(({status, headers, body, text}) => {
    body.toString('utf8') === text; // true
})
```

## Copyright

MIT &copy; [Rumkin](https://rumk.in)
