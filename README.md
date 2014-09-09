Jsonp client
=========

Simple jsonp client


Installation
--------------
This library has been declined in a bower component so in order to use it just add it to your project's bower.json dependencies :

```json
"dependencies": {
    ...
    "jsonpClient": "https://github.com/francetv/jsonpClient.git"
    ...
}
```

How to use it
--------------

This library implements [UMD](http://bob.yexley.net/umd-javascript-that-runs-anywhere/), so you can import it with AMD or browser globals

```javascript
require.config({
    paths: {
        ...
        jsonpClient: './bower_components/jsonpClient/jsonpClient.min.js'
    }
})
require(['jsonpClient', ...], function (jsonpClient, ...) {
    ...
});
```

or

```html
<script type="text/javascript" src="./bower_components/jsonpClient/jsonpClient.min.js" />
```

