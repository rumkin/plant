# Node HTTP for Plant

Plant adapter for native node.js http module. It creates server listener from plant instance.

## Install

```bash
npm i @plant/http
```

## Usage

```javascript
const Plant = require('@plant/plant');
const createServer = require('@plant/http');

const plant = new Plant();

plant.use(({res}) => {
    res.body = 'Ok';
});

createServer(plant).listen(8080);
```

## License

MIT &copy; [Rumkin](https://rumk.in)
