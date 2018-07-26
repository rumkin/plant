# TODOLIST

### v1.0

- [ ] Functional Router methods:
    ```javascript
    server.use(Router.get('/user/:id'), ({req, res}) => {
        req.params.id;
    });
    ```
- [ ] Multiple transport support.
- [ ] Interactive mode: return function which can read from request and
      write to response simultaneously.
- [x] Add more examples.
- [x] Enhance documentation.
- [ ] Create website.
- [ ] More tests.

### Future

- [ ] Output objects for files and custom responses:
    ```javascript
    res.body = new FileOutput(req.path);
    // Such output produce headers data (size and mime type).
    ```
