const Plant = require('@plant/plant')

const LOGGER = Symbol('logger')

function addLogger(logger) {
  return function(ctx, next) {
    return next({
      ...ctx,
      [LOGGER]: logger,
    })
  }
}

function getLogger(ctx) {
  return ctx[LOGGER]
}

// Create server instance
const app = new Plant()

// Add logger to context
app.use(addLogger(console))

// Use logger
app.use(async function({res, ...ctx}, next) {
  const logger = getLogger(ctx)

  await next()

  logger.log('%s - %s | %s',  res.method, res.status, res.url)
})
