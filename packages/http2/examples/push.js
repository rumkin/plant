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
plant.use(async ({req, res, socket, fetch}) => {
  let {pathname} = req.url
  if (pathname === '/index.html') {
    if (socket.canPush) {
      await fetch({
        url: new URL('/style.css', req.url),
      })
      .then(subRes => socket.push(subRes))
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

createServer(plant)
.listen(8080, () => console.log('Listening'))
