const Plant = require('@plant/plant')
const {Router} = Plant

// Greeting manager
class GreetManager {
  constructor(user) {
    this.user = user
  }

  greet() {
    return `Hello, ${this.user}`
  }
}

// Greeting manager router
function greetingRouter(manager) {
  const router = new Router()

  router.get('/', ({res}) => {
    res.body = manager.greet()
  })

  return router
}

const plant = new Plant()

plant.use('/guest', greetingRouter(new GreetManager('guest')))
plant.use('/admin', greetingRouter(new GreetManager('Admin')))
plant.use('/world', greetingRouter(new GreetManager('World')))
