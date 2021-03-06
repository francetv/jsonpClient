const scriptloader = require('scriptloader');

var jsonpClient = {
    // Set for legacy... should be deprecated ?
    loadScript: scriptloader,

    get: function get(request, callback) {
        // handle function polymorphism with two possible signatures :
        // - request object containing any of : url*, callbackName, queryStringKey, timeout, callback
        // - request url
        if (typeof request === 'string') {
            request = {
                url: request
            };
        }

        request.callback = callback || request.callback;

        if (!('timeout' in request)) {
            request.timeout = jsonpClient._defaultTimeout;
        }

        request.callbackName = request.callbackName || jsonpClient._callbackNamePrefix + jsonpClient._requestsCount++;

        if (request.timeout) {
            request.timeoutHandler = setTimeout(jsonpClient._abortRequest.bind(jsonpClient, request), request.timeout);
        }

        global[request.callbackName] = jsonpClient._receiveData.bind(jsonpClient, request);

        var url = request.url;
        if (/\{\{CALLBACK_NAME\}\}/.test(request.url)) {
            url = url.replace('{{CALLBACK_NAME}}', request.callbackName);
        } else {
            url += ~url.indexOf('?') ? '&' : '?';
            url += (request.queryStringKey || jsonpClient._defaultQueryStringKey) + '=' + request.callbackName;
        }

        scriptloader(url, jsonpClient._scriptLoadCallback.bind(jsonpClient, request));
    },

    _callbackNamePrefix: '_jsonp_loader_callback_request_',
    _defaultQueryStringKey: 'callback',
    _msgNoData: 'no data received',
    _msgAbort: 'jsonp request aborted',

    _defaultTimeout: 500,

    _requestsCount: 0,

    _receiveData: function _receiveData(request, data) {
        jsonpClient._cleanup(request);

        if (request.aborted) {
            return;
        }

        if (!data) {
            return request.callback(new Error(jsonpClient._msgNoData));
        }

        request.callback(null, data);
    },

    _abortRequest: function _abortRequest(request) {
        request.aborted = true;
        global[request.callbackName] = function abortedJsonpReceiver() {};

        request.callback(new Error(jsonpClient._msgAbort));
    },

    _scriptLoadCallback: function _scriptLoadCallback(request, error) {
        if (error) {
            jsonpClient._cleanup(request);
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

module.exports = jsonpClient;