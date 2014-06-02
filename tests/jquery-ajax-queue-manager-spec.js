describe('ajaxQueueManager', function () {

    beforeEach(function() {
        jasmine.Ajax.install();
    });

    afterEach(function() {
        jasmine.Ajax.uninstall();
    });

    describe('Setting global defaults for ajaxQueueManager', function () {
        it('$.ajaxQueueManager.setDefaults should add new options and not delete previous ones', function () {
            $.ajaxQueueManager.setDefaults({ dummyProperty00: 'json'});
            expect($.ajaxQueueManager.defaults.dummyProperty00).toBe('json');
            expect($.ajaxQueueManager.defaults.queue).toBe(false);
        });

        it('$.ajaxQueueManager.setDefaults should override pre-exisiting options', function () {
            var maxRequestsOriginal = $.ajaxQueueManager.defaults.maxRequests;
            $.ajaxQueueManager.setDefaults({ maxRequests: 4 });
            expect($.ajaxQueueManager.defaults.queue).toBe(false);
            expect($.ajaxQueueManager.defaults.maxRequests).toBe(4);
            $.ajaxQueueManager.setDefaults({ maxRequests: maxRequestsOriginal });
            expect($.ajaxQueueManager.defaults.maxRequests).toBe(maxRequestsOriginal);
        });
    });

    describe('Queues Creation', function () {
        it('$.ajaxQueueManager(queueName) should create an ajax manager instance', function () {
            var instance = $.ajaxQueueManager('AsyncNoQueue');
            expect(instance.queueName).toBe('AsyncNoQueue');
            expect(instance.requests).toEqual({});
            expect(instance.opts.async).toBe(true);
            expect(instance.opts.queue).toBe(false);
        });

        it('$.ajaxQueueManager(queueName, { queue: true}) should create an ajax manager instance', function () {
            var instance = $.ajaxQueueManager('AsyncQueue', { queue: true, maxRequests: 2 });
            expect(instance.queueName).toBe('AsyncQueue');
            expect(instance.requests).toEqual({});
            expect(instance.opts.async).toBe(true);
            expect(instance.opts.queue).toBe(true);
            expect(instance.opts.maxRequests).toBe(2);
        });

    });
    describe('Non queued asynchronous calls', function () {

        var doneFn, errorFn, completeFn, dfdDoneFn, dfdErrorFn, dfdCompleteFn;

        beforeEach(function() {
            $.ajaxQueueManager('AsyncNoQueue');
            doneFn = jasmine.createSpy("done");
            errorFn = jasmine.createSpy("error");
            completeFn = jasmine.createSpy("complete");
            dfdDoneFn = jasmine.createSpy("dfdDone");
            dfdErrorFn = jasmine.createSpy("dfdError");
            dfdCompleteFn = jasmine.createSpy("dfdComplete");

            this.jqxhr = $.ajaxQueueManager('AsyncNoQueue').add({
                url: '/async/noqueue/url',
                type: 'GET',
                success: doneFn,
                error: errorFn,
                complete: completeFn
            });

            this.jqxhr
                .done(dfdDoneFn)
                .fail(dfdErrorFn)
                .complete(dfdCompleteFn);

            var instance = $.ajaxQueueManager('AsyncNoQueue');
            expect(instance.inProgress).toBe(1);
            expect(jasmine.Ajax.requests.mostRecent().url).toBe('/async/noqueue/url');
            expect(Object.keys(instance.requests)).toEqual(['GET/async/noqueue/url']);

            expect(doneFn).not.toHaveBeenCalled();
            expect(errorFn).not.toHaveBeenCalled();
            expect(completeFn).not.toHaveBeenCalled();
            expect(dfdDoneFn).not.toHaveBeenCalled();
            expect(dfdErrorFn).not.toHaveBeenCalled();
            expect(dfdCompleteFn).not.toHaveBeenCalled();
        });

        afterEach(function(){
            $.ajaxQueueManager('AsyncNoQueue').destroy(true);
        });


        it('Should trigger success, complete, jqxhr.done and jqxhr.always on success', function () {
            jasmine.Ajax.requests.mostRecent().response({
                "status": 200,
                "contentType": 'application/json',
                "responseText": '{"output":"hello","success":1}'
            });

            expect(doneFn).toHaveBeenCalled();
            var args = doneFn.calls.mostRecent().args;
            // args 0 is data
            expect(args[0].output).toBe("hello");
            expect(args[0].success).toBe(1);
            // args 1 is textStatus
            expect(args[1]).toBe('success');

            expect(errorFn).not.toHaveBeenCalled();
            expect(completeFn).toHaveBeenCalled();

            expect(dfdDoneFn).toHaveBeenCalled();
            expect(dfdErrorFn).not.toHaveBeenCalled();
            expect(dfdCompleteFn).toHaveBeenCalled();
        });


        it('Should trigger error, complete, jqxhr.fail and jqxhr.always on error', function () {
            jasmine.Ajax.requests.mostRecent().response({
                "status": 404,
                "contentType": 'application/json',
                "responseText": '{}'
            });

            expect(doneFn).not.toHaveBeenCalled();
            expect(errorFn).toHaveBeenCalled();
            expect(completeFn).toHaveBeenCalled();

            expect(dfdDoneFn).not.toHaveBeenCalled();
            expect(dfdErrorFn).toHaveBeenCalled();
            expect(dfdCompleteFn).toHaveBeenCalled();
        });

        it('Should trigger error, complete, jqxhr.fail and jqxhr.always on parse error', function () {
            jasmine.Ajax.requests.mostRecent().response({
                "status": 200,
                "contentType": 'application/json',
                "responseText": '{dadsldkla}'
            });

            expect(doneFn).not.toHaveBeenCalled();
            expect(errorFn).toHaveBeenCalled();
            // check textStatus
            var errorFnArgs = errorFn.calls.mostRecent().args;
            expect(errorFnArgs[1]).toBe('parsererror');
            expect(completeFn).toHaveBeenCalled();

            expect(dfdDoneFn).not.toHaveBeenCalled();
            expect(dfdErrorFn).toHaveBeenCalled();
            expect(dfdCompleteFn).toHaveBeenCalled();
        });

    });

    describe('Queued asynchronous call', function () {

        var doneFn, errorFn, completeFn, dfdDoneFn, dfdErrorFn, dfdCompleteFn;

        beforeEach(function() {
            var instance = $.ajaxQueueManager('AsyncQueue', { queue: true, maxRequests: 2 });
            doneFn = jasmine.createSpy("done");
            errorFn = jasmine.createSpy("error");
            completeFn = jasmine.createSpy("complete");
            dfdDoneFn = jasmine.createSpy("dfdDone");
            dfdErrorFn = jasmine.createSpy("dfdError");
            dfdCompleteFn = jasmine.createSpy("dfdComplete");

            this.jqxhr = $.ajaxQueueManager('AsyncQueue').add({
                url: '/async/queue/url',
                type: 'GET',
                success: doneFn,
                error: errorFn,
                complete: completeFn
            });

            this.jqxhr
                .done(dfdDoneFn)
                .fail(dfdErrorFn)
                .always(dfdCompleteFn);

            expect(instance.inProgress).toBe(1);
            expect(jasmine.Ajax.requests.mostRecent().url).toBe('/async/queue/url');
            expect(Object.keys(instance.requests)).toEqual(['GET/async/queue/url']);

            expect(doneFn).not.toHaveBeenCalled();
            expect(errorFn).not.toHaveBeenCalled();
            expect(completeFn).not.toHaveBeenCalled();
            expect(dfdDoneFn).not.toHaveBeenCalled();
            expect(dfdErrorFn).not.toHaveBeenCalled();
            expect(dfdCompleteFn).not.toHaveBeenCalled();
        });

        afterEach(function(){
            $.ajaxQueueManager('AsyncQueue').destroy(true);
        });

        it('Should trigger success, complete, jqxhr.done and jqxhr.always on success', function () {

            jasmine.Ajax.requests.mostRecent().response({
                "status": 200,
                "contentType": 'application/json',
                "responseText": '{"output":"hello","success":1}'
            });

            expect(doneFn).toHaveBeenCalled();
            var args = doneFn.calls.mostRecent().args;
            // done (data, textStatus, jqxhr)
            expect(args[0].output).toBe("hello");
            expect(args[0].success).toBe(1);
            expect(args[1]).toBe('success');

            expect(errorFn).not.toHaveBeenCalled();
            expect(completeFn).toHaveBeenCalled();
            expect(dfdDoneFn).toHaveBeenCalled();
            var argsDfdDone = dfdDoneFn.calls.mostRecent().args;
            expect(argsDfdDone[0].output).toBe("hello");
            expect(argsDfdDone[1]).toBe('success');

            expect(dfdErrorFn).not.toHaveBeenCalled();
            expect(dfdCompleteFn).toHaveBeenCalled();

        });

    });

    describe('Multiple Queued asynchronous calls', function () {

        it('', function () {
            var instance = $.ajaxQueueManager('AsyncQueue', { queue: true, maxRequests: 2 });

            var doneFn = jasmine.createSpy('done');

            $.ajaxQueueManager('AsyncQueue').add({
                url: '/async/queue/url/1',
                type: 'GET'
            }).done(doneFn);

            $.ajaxQueueManager('AsyncQueue').add({
                url: '/async/queue/url/2',
                type: 'GET'
            }).done(doneFn);

            $.ajaxQueueManager('AsyncQueue').add({
                url: '/async/queue/url/3',
                type: 'GET'
            }).done(doneFn);


            // maxRequests: 2
            expect(instance.inProgress).toBe(2);
            expect(jasmine.Ajax.requests.mostRecent().url).toBe('/async/queue/url/2');
            expect(jasmine.Ajax.requests.count()).toBe(2);
            expect(Object.keys(instance.requests)).toEqual(['GET/async/queue/url/1','GET/async/queue/url/2']);
            expect(doneFn).not.toHaveBeenCalled();

            jasmine.Ajax.requests.first().response({
                "status": 200,
                "contentType": 'application/json',
                "responseText": '{"output":"output1","success":1}'
            });

            expect(instance.inProgress).toBe(2);
            expect(jasmine.Ajax.requests.mostRecent().url).toBe('/async/queue/url/3');
            expect(jasmine.Ajax.requests.count()).toBe(3);
            expect(Object.keys(instance.requests)).toEqual(['GET/async/queue/url/2','GET/async/queue/url/3']);

            expect(doneFn).toHaveBeenCalled();

            jasmine.Ajax.requests.at(1).response({
                "status": 200,
                "contentType": 'application/json',
                "responseText": '{"output":"output2","success":1}'
            });

            expect(doneFn.calls.count()).toBe(2);
            expect(instance.inProgress).toBe(1);
            expect(jasmine.Ajax.requests.mostRecent().url).toBe('/async/queue/url/3');
            expect(Object.keys(instance.requests)).toEqual(['GET/async/queue/url/3']);

            jasmine.Ajax.requests.at(2).response({
                "status": 200,
                "contentType": 'application/json',
                "responseText": '{"output":"output3","success":1}'
            });

            expect(doneFn.calls.count()).toBe(3);
            expect(instance.inProgress).toBe(0);
            expect(Object.keys(instance.requests)).toEqual([]);

        });

    });

});