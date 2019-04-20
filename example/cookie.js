const createServer = require('@plant/http')
const Plant = require('@plant/plant')

const app = new Server()

app.use(async function({req, res}){
  res.setCookie('one', 1)
  res.setCookie('two', 2)

  res.json(req.cookies)
})

createServer(app)
.listen(process.env.PORT || 8080)
