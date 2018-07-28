# Node HTTPS for Plant

Plant adapter for node.js https module. It creates server listener from plant instance and https options.

## Install

```bash
npm i @plant/https
```

## Usage

```javascript
const Plant = require('@plant/plant');
const createServer = require('@plant/https');

const plant = new Plant();

plant.use(({res}) => {
    res.body = 'Ok';
});

createServer(plant, {
    // get SSL key and cert somehow
    key,
    cert,
})
.listen(8080);
```

## License

MIT.

## Copyright

&copy; Rumkin, 2018.
