# Electron

Adapter to make Plant work in Electron, using Electrons streaming API.

## Install

```
npm i @plant/electron-adapter
```

## Usage

```js
const {protocol, session} = require('electron')
const Plant = require('@plant/plant')
const {createRequestHandler} = require('@plant/electron-adapter')

const plant = new Plant()

plant.use(({res}) => {
  res.json({ok: true})
})

// Serve standard protocol
protocol.interceptStreamProtocol('https', createRequestHandler(plant, session))
// Serve custom protocol
protocol.registerStreamProtocol('plant', createRequestHandler(plant, session))
```

## License

MIT © [Rumkin](https://rumk.in)
