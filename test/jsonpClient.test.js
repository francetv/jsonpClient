;(function(global, document) {
    function factory(jsonpClient, chai, sinon) {
        'use strict';

        function stubLoadScript(options) {
            // options:
            //     withEventListener: true/false
            //     yieldsSuccess: true/false
            //     scriptAction: function

            options.withEventListener = options.withEventListener !== false;
            options.yieldsSuccess = options.yieldsSuccess !== false;

            if (options.scriptAction && typeof options.scriptAction !== 'function') {
                throw new TypeError('Option scriptAction should be a function');
            }

            var scriptNode = {
                parentNode: {
                    removeChild: sinon.stub()
                }
            };

            var stubObject = {
                options: options,
                scriptNode: scriptNode,
                stubs: {
                    scriptSearch: sinon.stub(),
                    scriptCreate: sinon.stub(),
                    scriptInsert: sinon.stub(),
                    scriptRemove: scriptNode.parentNode.removeChild
                },
                backups: {
                    documentGetElementsByTagName: document.getElementsByTagName,
                    documentCreateElement: document.createElement
                },
                restore: function restore() {
                    document.createElement = stubObject.backups.documentCreateElement;
                    document.getElementsByTagName = stubObject.backups.documentGetElementsByTagName;
                    clearTimeout(stubObject.createTimeout);
                    clearTimeout(stubObject.yieldTimeout);
                },
                setLoaded: function setLoaded(success) {
                    clearTimeout(stubObject.yieldTimeout);
                    var callback = success ? stubObject.successCallback : stubObject.errorCallback;

                    if (!callback) {
                        throw new Error('not currently loading script');
                    }

                    delete stubObject.successCallback;
                    delete stubObject.errorCallback;

                    if (success && options.scriptAction) {
                        options.scriptAction();
                    }

                    callback.call(scriptNode);
                }
            };

            stubObject.stubs.scriptCreate.returns(scriptNode);
            stubObject.stubs.scriptSearch.returns([{
                parentNode: {
                    insertBefore: stubObject.stubs.scriptInsert
                }
            }]);

            document.getElementsByTagName = function(name) {
                if (name === 'script') {
                    return stubObject.stubs.scriptSearch.apply(this, arguments);
                }
                return stubObject.backups.documentGetElementsByTagName.apply(this, arguments);
            };

            document.createElement = function(name) {
                if (name === 'script') {
                    if (options.withEventListener) {
                        scriptNode.addEventListener = function addEventListener(event, callback) {
                            if (event === 'load') {
                                stubObject.successCallback = callback;
                            }
                            else if (event === 'error') {
                                stubObject.errorCallback = callback;
                            }
                        };
                    }

                    stubObject.createTimeout = setTimeout(function() {
                        if (!options.withEventListener) {
                            stubObject.successCallback = scriptNode.onload;
                            stubObject.errorCallback = scriptNode.onerror;
                        }

                        if (options.yieldsSuccess !== undefined) {
                            stubObject.yieldTimeout = setTimeout(function() {
                                stubObject.setLoaded(!!options.yieldsSuccess);
                            }, 0);
                        }
                    }, 0);

                    var scriptMock = stubObject.stubs.scriptCreate.apply(this, arguments);

                    // document.createElement = stubObject.backups.documentCreateElement;

                    return scriptMock;
                }
                return stubObject.backups.documentCreateElement.apply(this, arguments);
            };

            return stubObject;
        }


        describe('jsonpClient', function() {
            var loadScriptStub;
            var expectedResult;

            beforeEach(function() {
                expectedResult = {};
                loadScriptStub = stubLoadScript({
                    scriptAction: function() {
                        global._jsonp_loader_callback_request_0(expectedResult);
                    }
                });
            });

            afterEach(function() {
                loadScriptStub.restore();
                delete global._jsonp_loader_callback_request_0;
                jsonpClient._requestsCount = 0;
            });

            it ('should load jsonp content', function(done) {
                jsonpClient.get('fixtures/jsonp-sample.js', function(error, result) {
                    chai.assert.equal(error, null, 'Should not get an error');
                    chai.assert.strictEqual(result, expectedResult, 'Should get expected result');
                    chai.assert.strictEqual(global._jsonp_loader_callback_request_0, undefined, 'Callback function should be cleaned up');
                    chai.assert.equal(loadScriptStub.scriptNode.src, 'fixtures/jsonp-sample.js?callback=_jsonp_loader_callback_request_0', 'Should call correct URL');
                    done();
                });
            });

            it ('should load jsonp content without script addEventListener', function(done) {
                loadScriptStub.options.withEventListener = false;

                jsonpClient.get('fixtures/jsonp-sample.js', function(error, result) {
                    chai.assert.equal(error, null, 'Should not get an error');
                    chai.assert.strictEqual(result, expectedResult, 'Should get expected result');
                    chai.assert.strictEqual(global._jsonp_loader_callback_request_0, undefined, 'Callback function should be cleaned up');
                    chai.assert.equal(loadScriptStub.scriptNode.src, 'fixtures/jsonp-sample.js?callback=_jsonp_loader_callback_request_0', 'Should call correct URL');
                    done();
                });
            });

            it ('should load jsonp content with callback tag in URL', function(done) {
                jsonpClient.get('fixtures/jsonp-sample.js?toto={{CALLBACK_NAME}}&truc=toto', function(error, result) {
                    chai.assert.equal(error, null, 'Should not get an error');
                    chai.assert.strictEqual(result, expectedResult, 'Should get expected result');
                    chai.assert.strictEqual(global._jsonp_loader_callback_request_0, undefined, 'Callback function should be cleaned up');
                    chai.assert.equal(loadScriptStub.scriptNode.src, 'fixtures/jsonp-sample.js?toto=_jsonp_loader_callback_request_0&truc=toto', 'Should call correct URL');
                    done();
                });
            });

            it ('should report error on 404', function(done) {
                loadScriptStub.options.yieldsSuccess = false;

                jsonpClient.get('fixtures/jsonp-sample-not-found.js', function(error, result) {
                    chai.assert.deepEqual(error, {message:"script load error"}, 'Should get the expected error');
                    chai.assert.strictEqual(result, undefined, 'Should not get any result');
                    chai.assert.strictEqual(global._jsonp_loader_callback_request_0, undefined, 'Callback function should be cleaned up');
                    done();
                });
            });

            it ('should report error on malformed response', function(done) {
                loadScriptStub.options.scriptAction = function() {
                    throw new Error('fails');
                };

                var errorHandlerOrg = global.onerror;
                global.onerror = function() {};

                jsonpClient.get(
                    {
                        url: 'fixtures/jsonp-sample-malformed.js',
                        timeout: 100
                    },
                    function(error, result) {
                        global.onerror = errorHandlerOrg;

                        chai.expect(error).to.eql({message:"jsonp request aborted"});
                        chai.expect(result).to.be.undefined;
                        chai.expect(typeof global._jsonp_loader_callback_request_0).to.equal('function');

                        done();
                    }
                );
            });

            it('should be possible to cascade jsonpClient calls', function(done) {
                jsonpClient.get('fixtures/jsonp-sample.js', function(error, result) {
                    chai.assert.equal(error, null);

                    delete loadScriptStub.options.scriptAction;

                    jsonpClient.loadScript('fixtures/simple-js-file.js', function() {
                        done();
                    });
                });
            });

            it('should handle correctly URLs with query-string parameters', function(done) {
                jsonpClient.get('fixtures/jsonp-sample.js?param1=a', function(error, result) {
                    chai.assert.equal(error, null);
                    chai.assert.strictEqual(result, expectedResult);

                    chai.assert.equal(
                        loadScriptStub.scriptNode.src,
                        'fixtures/jsonp-sample.js?param1=a&callback=_jsonp_loader_callback_request_0'
                    );

                    done();
                });
            });

            it('should handle correctly jsonp responses without data', function(done) {
                expectedResult = undefined;
                jsonpClient.get('fixtures/jsonp-sample.js', function(error, result) {
                    chai.assert.equal(error && error.message, 'no data received');
                    chai.assert.strictEqual(result, undefined);

                    done();
                });
            });

            it('should handle correctly timedout requests', function(done) {
                delete loadScriptStub.options.yieldsSuccess;

                var count = 0;
                var error;
                var result;

                function callback(err, res) {
                    error = err;
                    result = res;
                    count++;
                }

                jsonpClient.get({
                    url: 'fixtures/jsonp-sample.js',
                    timeout: 1
                }, callback);

                var dataCatcher = global._jsonp_loader_callback_request_0;

                setTimeout(function() {
                    loadScriptStub.setLoaded(true);
                    dataCatcher();
                    setTimeout(function() {
                        chai.assert.strictEqual(count, 1);
                        chai.assert.equal(error && error.message, 'jsonp request aborted');
                        chai.assert.strictEqual(result, undefined);

                        done();
                    }, 10);
                }, 10);
            });
        });
    }

    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jsonpClient', 'chai', 'sinon', 'mocha'], factory);
    } else {
        // Browser globals
        factory(global.jsonpClient, global.chai, global.sinon);
    }
}(this, this.document));