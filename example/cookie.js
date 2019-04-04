const http = require('http')
const Server = require('../')

const app = new Server()

app.use(async function({req, res}){
  res.setCookie('one', 1)
  res.setCookie('two', 2)

  res.json(req.cookies)
})

http.createServer(app.handler())
.listen(process.env.PORT || 8080)
