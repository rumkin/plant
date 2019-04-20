const fs = require('fs')
const path = require('path')

const Plant = require('@plant/plant')
const createServer = require('..')

const plant = new Plant()

// Logging
plant.use(({req}, next) => {
  console.log(req.url + '', 'isPushed:', req.parent !== null)
  return next()
})

// Server logic
plant.use(async ({req, res, socket, subRequest}) => {
  let {pathname} = req.url
  if (pathname === '/index.html') {
    if (socket.canPush) {
      await subRequest({
        url: new URL('/style.css', req.url),
      }).push()
    }
  }

  let localPath = path.join(__dirname, 'assets', path.resolve('/', pathname))

  if (! fs.existsSync(localPath)) {
    return
  }

  if (fs.statSync(localPath).isDirectory()) {
    localPath = path.join(localPath, 'index.html')
  }

  if (! fs.existsSync(localPath)) {
    return
  }

  res.headers.set('content-type', path.basename(pathname) === '.css' ? 'text/css' : 'text/html')
  res.body = fs.readFileSync(localPath, 'utf8')
})

createServer(plant, {
  key: fs.readFileSync('var/ssl/key.pem'),
  cert: fs.readFileSync('var/ssl/cert.pem'),
})
.listen(8080, () => console.log('Listening'))
