import Plant from '@plant/plant'
import {createServer} from '@plant/http2'
import {serveDir} from '@plant/fs'

const plant = new Plant()

plant.use('/assets/*', serveDir('./public'))

plant.use(({res}) => {
  res.push('/assets/index.js')
  res.push('/assets/style.css')

  res.html('<!DOCTYPE html><html><head>...')
})

createServer(plant)
.listen(8080)
