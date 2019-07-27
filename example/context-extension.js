const Plant = require('@plant/plant')

const SESSION = Symbol('session')

// Write session somehow
async function writeSession() {}
// Read session somehow
async function readSession() {}
// Load user somehow
async function loadUser() {}
// Define session web handler
async function sessionHandler(ctx, next) {
  const {res} = ctx
  // Get session somehow
  const session = await readSession(res.cookies.sessionId)
  await next({
    ...ctx,
    [SESSION]: session,
  })

  await writeSession(session)
}

// Create server instance
const app = new Plant()

// Add session to context
app.use(sessionHandler)

// Use session
app.use(async function(ctx, next) {
  const {[SESSION]:session} = ctx

  if (session.userId) {
    await next({
      ...ctx,
      user: await loadUser(session.userId),
    })
  }
  else {
    await next()
  }
})
