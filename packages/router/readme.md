# Plant/Router

Router for Plant server.

## Table of Contents

* [Install](#install).
* [Usage](#usage).
* [API](#api).
    * [Router](#router-type).
    * [RouteState](#routestate-type).

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

### Router.all()

```text
(url:String, ...handlers:Handle) -> Router
```

Method to add handler for any HTTP method.

### Router.get(), .post(), .put(), .patch(), .delete(), .head(), .options()

```text
(url:String, ...handlers:Handle) -> Router
```

Methods to add handler for exact HTTP method.

##### Example

```javascript
router.get('/users/:id', () => {});
router.post('/users/', () => {});
router.put('/users/:id', () => {});
router.delete('/users/:id', () => {});
// ...
```

### Router.route()

```text
(route:String, ...handlers:Router) -> Router
```

Add `handlers` into routes queue as new router. Subrouter will add matched
url to `basePath` and reduce `path`. This is important for nested routers to
receive url without prefix.

##### Example
```javascript
router.route('/user', ({req}) => {
    req.path; // -> '/'
    req.basePath; // -> '/user'
});
router.get('/user', ({req}) => {
    req.path; // -> '/user'
    req.basePath; // -> '/'
});
```

### RouteState Type

```text
{
    path: string
    basePath: string,
    params: {[key: string]: string}
}
```

Route holds router state. It has two properties `path` and `basePath`
which are parsed and unparsed parts of the request url pathname respectively.
Values extracted from parsed path places into `params`.

|Property|Description|
|:-------|:----------|
|path| Current unprocessed pathname part |
|basePath| Pathname part processed by overlaying handler |
|params   |Params extracted from path   |

## License

MIT &copy; [Rumkin](https://rumk.in)
