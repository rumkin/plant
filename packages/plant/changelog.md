# CHANGELOG

### v2.0

- `Request.body` is a Web API ReadableStream.
- `Request.sender` renamed to `Request.peer`.
- `Response.stream()` accepts ReadableStream only.

### v1.0.0

- Updated:
    - `Response.headers` and `Request.headers` now are WhatWG Headers objects.
    - Request body param renamed and separated by destination:
        - `body` - Buffer or null,
        - `data` - Object of values from `Request.body`,
        - `stream` - Readable stream.
    - Request's `ip` property renamed to peer. Now it's a URI which identify request sender.
    - Request's `url` property now is an object returned by `url.parse()`.
- Removed:
    - `Request.query` property. Use `Request.url.query` instead.
- Added:
    - `Response.redirect()` method.
    - `Request.pathname` property. It specifies current processing url (without `.baseUrl`).
    - `Request.baseUrl` property. It specifies already processed url (without `.pathname`). It's using for nested handlers resolution.
- Documentation:
    - Rewrite readme.
    - Add JSDoc comments to ~90% of code.
- Utils:
    - Remove redundant .dockerignore and .npmrc.
