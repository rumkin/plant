const http = require('http');
const Server = require('../');
const {Router} = Server;

const app = new Server();

app.use(async function({req, res}, next){
  await next({req, res, logger: console, user: true});
});

app.use(async function({req, res, logger, user}, next) {
  const session = {};
  await next({req, res, session, logger, user});
});

const router = new Router();

router.get('/users/:id', async function({req, res}) {
  res.text(`User id: ${req.params.id}`);
});

router.get('/rooms/:id', async function({req, res}) {
  res.text(`Room id: ${req.params.id}`);
});

router.route('/places', async function({req, res, v}) {
  res.text(`Places(v${v}): ${req.url}`);
});

const ctxExtend = function (...args) {
  return async function(ctx, next) {
    await next(Object.assign({}, ctx, ...args));
  };
};

app.use('/api/v1/', ctxExtend({v: 1}), router.handler());
app.use('/api/v2/', ctxExtend({v: 2}), router.handler());

http.createServer(app.handler())
.listen(process.env.PORT || 8080);
