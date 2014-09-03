;(function(global) {
    function factory(jsonpClient, chai, sinon) {
        'use strict';

        describe('jsonpClient', function() {
            beforeEach(function() {
            });

            afterEach(function() {
                delete window._jsonp_loader_callback_request_0;
                jsonpClient._requestsCount = 0;
            });

            it ('should load jsonp content', function(done) {
                jsonpClient.get('fixtures/jsonp-sample.js', function(error, result) {
                    chai.expect(error).to.be.null;
                    chai.expect(result).to.eql({expected:'content'});
                    chai.expect(window._jsonp_loader_callback_request_0).to.be.undefined;
                    done();
                });
            });

            it ('should report error on 404', function(done) {
                jsonpClient.get('fixtures/jsonp-sample-not-found.js', function(error, result) {
                    chai.expect(error).to.eql({message:"script load error"});
                    chai.expect(result).to.be.undefined;
                    chai.expect(window._jsonp_loader_callback_request_0).to.be.undefined;
                    done();
                });
            });

            it ('should report error on malformed response', function(done) {
                var errorHandlerOrg = window.onerror;
                window.onerror = function() {};

                jsonpClient.get('fixtures/jsonp-sample-malformed.js', function(error, result) {
                    window.onerror = errorHandlerOrg;

                    chai.expect(error).to.eql({message:"jsonp request aborted"});
                    chai.expect(result).to.be.undefined;
                    chai.expect(typeof window._jsonp_loader_callback_request_0).to.equal('function');

                    done();
                });
            });

            it('should be possible to cascade jsonpClient calls', function(done) {
                jsonpClient.get('fixtures/jsonp-sample.js', function(error, result) {
                    if (error) {
                        return done(error);
                    }

                    jsonpClient.loadScript('fixtures/simple-js-file.js', function() {
                        done();
                    });
                });
            });
        });
    }

    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jsonpClient', 'chai', 'sinon', 'mocha'], factory);
    } else {
        // Browser globals
        factory(global.jsonpClient, global.chai, global.sinon, global.mocha);
    }
}(this));