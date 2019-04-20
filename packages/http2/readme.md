# Node HTTP2 for Plant

Plant adapter for node.js http2 module. It creates server listener from plant
instance and `http2.createServer()` options.

## Install

```bash
npm i @plant/http2
```

## Usage

```javascript
const Plant = require('@plant/plant');
const createServer = require('@plant/http2');

const plant = new Plant();

plant.use(({res}) => {
    res.body = 'Ok';
});

createServer(plant, {
    // get SSL key and cert somehow
    key,
    cert,
    allowHTTP1: true, // Enable HTTP/1 support manually
})
.listen(8080);
```

## Copyright

MIT &copy; [Rumkin](https://rumk.in)
