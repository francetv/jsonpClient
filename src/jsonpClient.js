(function(global, document, setTimeout, clearTimeout) {
    "use strict";

    function factory() {
        return {
            loadScript: function loadScript(url, callback) {
                var script = document.createElement('script');
                var done = false;

                function finish(error) {
                    if (done) {
                        return;
                    }
                    done = true;

                    script.parentNode.removeChild(script);

                    callback(error);
                }

                function abort() {
                    finish(new Error('script load error'));
                }

                if (script.addEventListener) {
                    script.addEventListener('load', finish.bind(null, null), true);
                    script.addEventListener('error', abort, true);
                } else {
                    script.onload = script.onreadystatechange = function() {
                        if (!this.readyState || this.readyState === 'loaded' || this.readyState === 'complete') {
                            finish();
                        }
                    };
                    script.onerror = abort;
                }

                script.async = true;
                script.src = url;

                if (!this._firstScript) {
                    this._firstScript = document.getElementsByTagName('script')[0];
                }

                this._firstScript.parentNode.insertBefore(script, this._firstScript);
            },

            get: function get(request, callback) {
                // handle function polymorphism with two possible signatures :
                // - request object containing any of : url*, callbackName, queryStringKey
                // - request url
                if (typeof request === 'string') {
                    request = {
                        url: request
                    };
                }

                request.callback = callback;

                if (!('timeout' in request)) {
                    request.timeout = this._defaultTimeout;
                }

                request.callbackName = request.callbackName || '_jsonp_loader_callback_request_' + this._requestsCount++;

                if (request.timeout) {
                    request.timeoutHandler = setTimeout(this._abortRequest.bind(this, request), request.timeout);
                }

                global[request.callbackName] = this._receiveData.bind(this, request);

                var url = request.url;
                if (/\{\{CALLBACK_NAME\}\}/.test(request.url)) {
                    url = url.replace('{{CALLBACK_NAME}}', request.callbackName);
                } else {
                    url += ~url.indexOf('?') ? '&' : '?';
                    url += (request.queryStringKey || 'callback') + '=' + request.callbackName;
                }

                this.loadScript(url, this._scriptLoadCallback.bind(this, request));
            },

            _defaultTimeout: 500,

            _requestsCount: 0,

            _receiveData: function _receiveData(request, data) {
                this._cleanup(request);

                if (request.aborted) {
                    return;
                }

                if (!data) {
                    return request.callback(new Error('no data received'));
                }

                request.callback(null, data);
            },

            _abortRequest: function _abortRequest(request) {
                request.aborted = true;
                global[request.callbackName] = function abortedJsonpReceiver() {};

                request.callback(new Error('jsonp request aborted'));
            },

            _scriptLoadCallback: function _scriptLoadCallback(request, error) {
                if (error) {
                    this._cleanup(request);
                    if (!request.aborted) {
                        request.callback(error);
                    }
                }
            },

            _cleanup: function _cleanup(request) {
                if (request.timeoutHandler) {
                    clearTimeout(request.timeoutHandler);
                    delete request.timeoutHandler;
                }

                try {
                    delete global[request.callbackName];
                } catch (e) {
                    global[request.callbackName] = undefined;
                }
            }
        };
    }

    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else {
        // Browser globals
        global.jsonpClient = factory();
    }
}(this, this.document, this.setTimeout, this.clearTimeout));