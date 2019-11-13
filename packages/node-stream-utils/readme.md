# Node Stream Utils

Utils for wrapping Node.js' stream into WebStream API and back.

## Install

```
npm i @plant/node-stream-util
```

## Usage

Make WebAPI Stream from Node.js':

```js
const fs = require('fs')
const {NodeToWebStream} = require('@plant/node-stream-utils')

const webStream = new NodeToWebStream(
  fs.createReadStream(__filename)
)
```

Wrap WebAPI stream into Node.js':
```js
const fs = require('fs')
const {WebToNodeStream} = require('@plant/node-stream-utils')

async function plantHandler({req}) {
  new WebToNodeStream(req.body)
  .pipe(fs.createWriteStream('index.html'))
}
```

## License

MIT © [Rumkin](https://rumk.in)
