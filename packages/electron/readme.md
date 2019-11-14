# Electron

Helpers to make plant work in Electron, using Electrons streaming API.

## Install

```
npm i @plant/electron
```

## Usage

```js
const Plant = require('@plant/plant')
const {createServer} = require('@plant/electron')

const plant = new Plant()

plant.use(({res}) => {
  res.json({ok: true})
})

createServer(plant)
// Serve requests via https:// protocol
.interceptProtocol('https')
// Serve requests via my:// protocol (made up).
.registerProtocol('my')
```

## License

MIT © [Rumkin](https://rumk.in)
