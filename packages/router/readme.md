# Plant/Router

Router for Plant server.

## Table of Contents

* [Install](#install).
* [Usage](#usage).
* [API](#api).
    * [Router](#router-type).

## Install

```shell
npm i @plant/router
```

## Usage

Example of parameter handling for url `/users/1`:

```javascript
const Router = require('@plant/router');

const router = new Router()

router.get('/users/:id', ({res, route}) => {
    // Get params
    route.params.id // -> {id: "1"}
    // Get current path segment
    route.path // '/users/1'
    // Path before router
    route.basePath // '/'
})

// Factory method as argument to Router.create()
router.use('/posts/*', Router.create((router) => {
  router.get('/:id', async () => {
    // ...
  })

  router.post('/', async () => {
    // ...
  })
}))
```

## API

### Router Type

Router allow to group url-dependent functions and extract params from URL.

##### Example

```javascript
const plant = new Plant();
const router = new Plant.Router;

router.get('/', () => { /* get resource */ });
router.post('/', () => { /* post resource */ });
router.delete('/', () => { /* delete resource */ });

plant.use(router);
```

### `Router.Router()`
```
() -> Router
```

Router constructor has no arguments.

### `Router.create()`
```
(create: (router: Router) -> void) -> Router
```

Factory method. Accepts `create` method as argument which is a function
with router configuration logic. Example:

```js
Router.create((router) => {
  router.get('/greet', ({res}) => res.text('Hello World'))
})
```

### `Router#use()`

```text
(route:String, ...handlers:Handle) -> Router
```

Method to add handler for any HTTP method.

### `Router#before()`

```text
(...handlers:Handle) -> Router
```

Add handlers which will be fired before each handler defined by `.use`, `.get`,
and other route handlers when route params are match route params
(route and method).

It can be helpful when you need to prepend each route with expensive
computations which should be done only if request matches defined options. It
could be user loading or disk reading.

### `Router#get()`

```text
(route:String, ...handlers:Handle) -> Router
```

Specify `route` `handlers` for `GET` HTTP method.

##### Example

```javascript
router.get('/users/:id', () => {})
// ...
```

### `Router#post()`

Same as [Router#get()](#routerget) but for `POST` HTTP method.

### `Router#put()`

Same as [Router#get()](#routerget) but for `PUT` HTTP method.

### `Router#patch()`

Same as [Router#get()](#routerget) but for `PATCH` HTTP method.

### `Router#delete()`

Same as [Router#get()](#routerget) but for `DELETE` HTTP method.

### `Router#head()`

Same as [Router#get()](#routerget) but for `HEAD` HTTP method.

### `Router#options()`

Same as [Router#get()](#routerget) but for `OPTIONS` HTTP method.

### `Router#addRoute()`
```
(method:string|string[], route:string, ...handler:Handle) -> Router
```

Add route handler and return router instance. Use `method` to specify HTTP
method or methods supported by the `route` `handler`.

## License

MIT &copy; [Rumkin](https://rumk.in)
