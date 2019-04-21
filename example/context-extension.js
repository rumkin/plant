const Plant = require('@plant/plant')

const SESSION = Symbol('session')

async function addSession(ctx, next) {
  // Get session somehow
  const session = await getSession()
  await next({
    ...ctx,
    [SESSION]: session,
  })
  // Write session somehow
  await writeSession(session)
}

function getSession(ctx) {
  return ctx[SESSION]
}

// Create server instance
const app = new Plant()

// Add session to context
app.use(addSession)

// Use session
app.use(async function({res, ...ctx}, next) {
  const session = getSession(ctx)

  await next()
})
