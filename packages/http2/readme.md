# Node HTTP2 for Plant

Plant adapter for node.js http2 module. It creates server listener from plant
instance and `http2.createServer()` options.

## Install

```bash
npm i @plant/http2
```

## Usage

### Hello World Example

```javascript
// Build request handler
const Plant = require('@plant/plant');
const {createServer} = require('@plant/http2');

const plant = new Plant();
plant.use(({res, socket}) => {
  res.body = 'Hello, World!'
})

createServer(plant)
.listen(80)
```

### Enable HTTP1

HTTP package doesn't support HTTP1 support by default and you should enable it manually:

```javascript
createServer(plant, {
  allowHTTP1: true,
})
```

### HTTP2 Push Example

```javascript
plant.use(({res, socket}) => {
  // Send HTTP2 push
  if (socket.canPush) {
    res.push(new Response({
      url: new URL('/style.css', res.url),
      headers: {
        'content-type': 'text/css',
      },
      body: 'html {color: green}',
    }))
  }

  res.body = '<html><head><link href="/style.css" ...'
})
```

## Copyright

MIT &copy; [Rumkin](https://rumk.in)
