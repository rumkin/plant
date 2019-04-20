const Plant = require('@plant/plant')
const Router = require('@plant/router')

// Greeting manager is our business logic. It knows nothing about transport
// in our case HTTP. It just do particluar job.
class GreetManager {
  constructor(user) {
    this.user = user
  }

  greet() {
    return `Hello, ${this.user}`
  }
}

// Greeting manager router knows how to connect HTTP with businnes logic which
// is a GreetingManager
function greetingRouter(manager) {
  const router = new Router()

  router.get('/', ({res}) => {
    res.body = manager.greet()
  })

  return router
}

const plant = new Plant()

// Now we can add any count of our business logic instances to public HTTP
// interface.
plant.use('/guest', greetingRouter(new GreetManager('guest')))
plant.use('/admin', greetingRouter(new GreetManager('Admin')))
plant.use('/world', greetingRouter(new GreetManager('World')))
