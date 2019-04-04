const http = require('http')
const crypto = require('crypto')
const Server = require('../')

const app = new Server()

app.use(sessionStoreHandler(new Map(), {
  lifetime: 1000,
}))

app.use(async function({req, res, session}){
  const i = req.session.i || 0;

  res.text(String(i))

  session.i = i + 1;
})

http.createServer(app.handler())
.listen(process.env.PORT || 8080)

// Helper functions...

function sessionStoreHandler(store, params) {
  const params_ = Object.assign({
    key: 'sessionId',
    lifetime: Infinity,
  }, params)

  const {key, lifetime} = params_;

  return async function({req, res, ...ctx}, next) {
    let session
    let sessionId
    if (req.cookies.hasOwnProperty(key)) {
      sessionId = req.cookies[key];
      session = await store.get(sessionId) || {}

      if (lifetime < Infinity) {
        res.setCookie(key, sessionId, {
          expires: new Date(Date.now() + lifetime),
          maxAge: lifetime/1000,
        })
      }
    }
    else {
      sessionId = crypto.randomBytes(64).toString()
      res.setCookie(key, sessionId, {
        path: '/',
        expires: lifetime === Infinity
          ? null
          : new Date(Date.now() + lifetime),
        maxAge: lifetime / 1000,
      })
      session = {}
    }

    await next({
      ...ctx,
      req,
      res,
      session,
    })
    await store.set(sessionId, session)
  }
}
