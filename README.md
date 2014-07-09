Jsonp client
=========

Simple jsonp client


Installation
--------------
This library has been declined in a bower component so in order to use it just add it to your project's bower.json dependencies :

```json
"dependencies": {
    ...
    "jsonpClient": "git@gitlab.ftven.net:player/jsonpclient.git"
    ...
}
```

How to use it
--------------

This library implements [UMD](http://bob.yexley.net/umd-javascript-that-runs-anywhere/), so you can import it with AMD or browser globals

```javascript
require(['bower_components/jsonpClient/index', ...], function (jsonpClient, ...) {
    ...
});
```

or

```html
<script type="text/javascript" src="./bower_components/jsonpClient/index.js" />
```

