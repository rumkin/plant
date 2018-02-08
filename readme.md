# Plant

Plant is an express/connect and koa like web server created with modular architecture in mind
and functional design patterns on practice. It uses isolated customizable contexts to be modular.

```javascript
const Plant = require('@plant/plant');
const http = require('http');
const fs = require('fs');

const PORT = process.env.PORT || 8080;

const plant = new Plant();

// Log request execution time
plant.use(async function({res, req}, next) {
    const start = Date.now();
    await next();
    const time = Date.now() - start;

    console.log('%s %s %s sec', res.statusCode, req.url, time / 1000);
});

// Send text response
plant.use('/api/v1/hello', async function({res}, next) {
    res.text('Hello World');
});

// Send stream response
plant.use('/server.js', async function({res}, next) {
    // Send current file source
    res.send(fs.createReadStream(__filename));
});

// Build request handler
http.createServer(plant.handler())
.listen(PORT);
```

## Router

To make applications modular it is possible to create routers factory:

```javascript
const Plant = require('@plant/plant');
const {Router} = Plant;

const plant = new Plant();

const alice = {name: 'Alice'};
const bob = {name: 'Bob'};

plant.use('/alice', userRouter(alice));
plant.use('/bob', userRouter(bob));

function userRouter(user) {
    const router = new Router();

    router.get('/name', ({res}) => {
        res.json(user.name);
    });

    return router;
}
```

Routers are stackable too so it's possible to create complex routers.

## API

### Headers interface

In node.js request and response headers has different interfaces. Plant unifies them:

```javascript
// Request headers
plant.use(async function({req}, next) {
    if (req.headers.has('authorization')) {
        const auth = req.headers.get('authorization');
        // Process authorization header...
    }

    await next();
});

// Response headers
plant.use(async function({req, res}, next) {
    res.headers.set('content-type', 'image/png');
    res.send(fs.createReadStream('logo.png'));
});
```

Request and Response has common methods: `get`, `names`, `entries`. Response headers also has `set` and `remove` methods.

### Error capturing

With cascade async model errors could be captured with try/catch:

```javascript
plant.use(async function({req, res}, next) {
    try {
        await next();
    } catch (error) {
        res.status(500);

        if (req.is('json')) {
            res.json({
                error: error.message,
            });
        } else {
            res.text(error.message);
        }
    }
});
```

### Difference from Koa

Plant tries to be more lightweight like connect and has simple interface like express. It uses async cascades like in Koa, but plant's context has other nature. Plant's context is customizable but isolated. It passed with `next` call:

```javascript
async function sendVersion({res, v}) {
    res.text(`version: ${v}`);
}

plant.use('/api/v1', async function(ctx, next) {
    ctx.v = 1;
    // Update ctx
    await next(ctx);
}, sendVersion); // This will send 1

plant.use('/api/v2', async function(ctx, next) {
    ctx.v = 2;
    // Update ctx
    await next(ctx);
}, sendVersion); // This will send 2
```

Also plant is using express-like response methods: text, html, json, send:

```javascript
plant.use(async function({req, res}) {
    // Echo body
    res.json(req.body);
});
```

### Difference from Express

The first is middlewares are called handlers. Plant has no `listen` method at all. Request object has `domains` property instead of `subdomains` and has *all* parts of host from tld zone. Plant doesn't resolve proxy headers and should to use special handler.

### Other custom behavior

Method name has lower case.

## License

MIT.
