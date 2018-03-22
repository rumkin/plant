const http = require('http');
const Server = require('../');
const {Router} = Server;

const app = new Server();

// Add logger to context
app.use(async function(context, next){
  await next({...context, logger: console, user: true});
});

// Add time tracking handler
app.use(async function({logger}, next) {
  const start = Date.now();
  await next();
  logger.info('Logger executed in %s ms', Date.now() - start);
});

const router = new Router();

router.get('/users/:id', async function({req, res}) {
  res.text(`User id: ${req.params.id}`);
});

router.get('/rooms/:id', async function({req, res}) {
  res.text(`Room id: ${req.params.id}`);
});

router.route('/places', async function({req, res, version}) {
  res.text(`Places(v${version}): ${req.url.pathname}`);
});

function contextVersion(version) {
  return async function(ctx, next) {
    await next({...ctx, version});
  };
};

app.use('/api/user/', contextVersion(1), router.handler());
app.use('/api/admin/', contextVersion(2), router.handler());

http.createServer(app.handler())
.listen(process.env.PORT || 8080);
