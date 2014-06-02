/**!
 * jQuery Ajax Queue Manager
 * Built upon Alexander Farkas' jQuery Ajax Manager
 */

$.ajaxQueueManager = (function ($) {

    var managed = {};

    /**
     * Create or get an AjaxManager instance
     * @param {string} name
     * @param {object} opts
     * @param {string|boolean} opts.queue: false, true, 'clear'
     * @returns {AjaxManager}
     */
    var ajaxQueueManager = function (name, opts) {
        if (!managed[name]) {
            managed[name] = new AjaxManager(name, opts);
        }
        return managed[name];
    };

    ajaxQueueManager.defaults = {
        abort: $.noop,
        maxRequests: 1,
        async: true,
        abortOld: false,
        preventDoubleRequests: true,
        queue: false
    };

    ajaxQueueManager.setDefaults = function (defaults) {
        $.extend(ajaxQueueManager.defaults, defaults);
    };

    var _onAjaxSuccess = function (context, origFn, data, textStatus, xhr, o) {
        var managerInstance = this;
        if (_isAbort.call(managerInstance, xhr, textStatus, o)) {
            return;
        }
        if (o.abortOld) {
            $.each(this.requests, function (name) {
                if (name === o.xhrID) {
                    return false;
                }
                managerInstance.abort(name);
            });
        }
        origFn.call(context, data, textStatus, xhr);
    };

    var _onAjaxComplete = function (context, origFn, xhr, textStatus, xhrID, o) {
        var managerInstance = this;
        if (_isAbort.call(managerInstance, xhr, textStatus, o)) {
            textStatus = 'abort';
            o.abort.call(context, xhr, textStatus, o);
        }
        origFn.call(context, xhr, textStatus);

        _removeXHR.call(managerInstance, xhrID);
    };

    var _onAjaxError = function (context, origFn, xhr, textStatus, errorThrown, o) {
        if ($.isFunction(origFn)) {
            origFn.call(context, xhr, textStatus, errorThrown);
        } else {
            //always add some error callback
            if (textStatus != 'abort') {
                throw textStatus + ' ( url: ' + o.url + ', error thrown: ' + errorThrown + ')';
            }
        }
    };

    var _removeXHR = function (xhrID) {
        var managerInstance = this;
        if (managerInstance.opts.queue) {
            $.dequeue(document, managerInstance.queueName);
        }
        managerInstance.inProgress--;
        managerInstance.requests[xhrID] = null;
        delete managerInstance.requests[xhrID];
    };

    var _isAbort = function (xhr, status, o) {
        var managerInstance = this;
        if (!xhr && !status) {
            return false;
        }
        var ret = !!((!xhr || xhr.readyState === 0 || managerInstance.lastAbort === o.xhrID));
        return ret;
    };

    var _returnAjaxFn = function (o, deferred) {
        var managerInstance = this;
        var id = o.xhrID;

        var ajaxFn = function () {
            var jqXHR = $.ajax(o);
            managerInstance.inProgress++;

            if (o.async) {
                managerInstance.requests[id] = jqXHR;
                if (deferred != null) {
                    jqXHR
                        .done(deferred.resolve)
                        .fail(deferred.reject);
                }
            }

            return jqXHR;
        };
        // tag the function so it can be find back when aborting
        ajaxFn.xhrID = o.xhrID;
        return ajaxFn;
    };

    /**
     * Create an AjaxManager instance
     * @param name
     * @param opts
     * @returns {AjaxManager}
     * @constructor
     */
    var AjaxManager = function (name, opts) {
        this.requests = {};
        this.inProgress = 0;
        this.queueName = name;

        this.opts = $.extend({}, ajaxQueueManager.defaults, opts);

        return this;
    };


    AjaxManager.prototype = {
        destroy: function () {
            // clear and abort
            this.clear(true);
            managed[this.queueName] = null;
        },
        add: function (ajaxOptions) {
            ajaxOptions = $.extend({}, this.opts, ajaxOptions);

            var managerInstance = this;
            var strData = (typeof ajaxOptions.data == 'string') ? ajaxOptions.data : $.param(ajaxOptions.data || {});
            var xhrID = ajaxOptions.xhrID = ajaxOptions.type + ajaxOptions.url + strData;
            var ajaxFn, deferred, jqXHR;

            var oBeforeSend = ajaxOptions.beforeSend || $.noop;
            ajaxOptions.beforeSend = function (xhr, settings) {
                var ret = oBeforeSend.call(this, xhr, settings);
                if (ret === false) {
                    _removeXHR.call(managerInstance, xhrID);
                }
                return ret;
            };


            if (this.requests[xhrID] && ajaxOptions.preventDoubleRequests) {
                //@todo should rather return a fake deferred because this deferred should never resolve?
                return $.Deferred;
            }

            var completeFn = ajaxOptions.complete || $.noop;
            delete ajaxOptions.complete;
            var successFn = ajaxOptions.success || $.noop;
            delete ajaxOptions.success;
            var errorFn = ajaxOptions.error;
            delete ajaxOptions.error;


            if (ajaxOptions.queue === 'clear') {
                $(document).clearQueue(this.queueName);
            }

            if (ajaxOptions.queue) {
                deferred = $.Deferred();
                ajaxFn = _returnAjaxFn.call(this, ajaxOptions, deferred);

                $.queue(document, this.queueName, ajaxFn);
                if (this.inProgress < ajaxOptions.maxRequests) {
                    $.dequeue(document, this.queueName);
                }

                jqXHR = deferred.promise();
                // add an abort method
                jqXHR.abort = function () {
                    managerInstance.abort(xhrID);
                };
            } else {
                ajaxFn = _returnAjaxFn.call(this, ajaxOptions);
                jqXHR = ajaxFn();
            }

            jqXHR
                .done(function (data, textStatus, xhr) {
                    _onAjaxSuccess.call(managerInstance, this, successFn, data, textStatus, xhr, ajaxOptions);
                })
                .fail(function (xhr, textStatus, errorThrown) {
                    _onAjaxError.call(managerInstance, this, errorFn, xhr, textStatus, errorThrown, ajaxOptions);
                })
                .always(function (xhr, textStatus) {
                    _onAjaxComplete.call(managerInstance, this, completeFn, xhr, textStatus, xhrID, ajaxOptions);
                });

            return jqXHR;

        },
        getData: function () {
            return {
                requests: this.requests,
                queue: (this.opts.queue) ? $(document).queue(this.queueName) : [],
                inProgress: this.inProgress
            };
        },
        getXHRFor: function (xhrID) {
            if (!xhrID) {
                return;
            }
            var ret = this.requests[xhrID];
            if (!ret && this.opts.queue) {
                ret = $.grep($(document).queue(this.queueName), function (fn) {
                    return (fn.xhrID === xhrID);
                })[0];
            }
            return ret;
        },
        /**
         * Abort either a specific request using its id, or the entire queue
         * @param {string} [id] - XHR identifier. If not precised, abort
         */
        abort: function (id) {
            var xhr;
            var ajaxManager = this;
            if (id) {
                xhr = this.getXHRFor(id);

                if (xhr && xhr.abort) {
                    this.lastAbort = id;
                    xhr.abort();
                    this.lastAbort = false;
                } else {
                    $(document).queue(
                        this.queueName, $.grep($(document).queue(this.queueName), function (fn) {
                            return (fn !== xhr);
                        })
                    );
                }
            } else {
                $.each(this.requests, function (xhrID) {
                    ajaxManager.abort(xhrID);
                });
            }

        },
        clear: function (shouldAbort) {
            $(document).clearQueue(this.queueName);
            if (shouldAbort) {
                this.abort();
            }
        }
    };

    return ajaxQueueManager;


})(jQuery);