# iron-beam
[![travis build](https://travis-ci.org/ferrous-frameworks/iron-beam.svg?branch=master)](https://travis-ci.org/ferrous-frameworks/iron-beam)

iron-beam is a interchangeable replacement for `events.EventEmitter` with wildcards, annotations and interception.

[Documentation](http://) *(coming soon)*

## Installation

`npm install iron-beam`

## Usage

all the methods available from node.js `events.EventEmitter` are documented [here](https://nodejs.org/dist/latest-v4.x/docs/api/events.html#events_class_eventemitter).

#### wildcard listeners
```js
var ib = new IronBeam.EventEmitter();

ib.on('a.*', () => {
    // some work
});

ib.emit('a.b');
```

#### annotations
```js
var ib = new IronBeam.EventEmitter();

ib.annotate({
    some: "data"
}).on('annotated-event', (req, anno) => {
    // req.some === "data"
    // anno.some === "annotation"
    // annotations are also passed to interceptors
});

ib.emit('annotated-event', {
    some: "annotation"
});

// you can also get listeners by annotation
var ib = new IronBeam.EventEmitter();

ib.annotate({
    data: 0
}).once('get-annotated', () => {});

ib.annotate({
    data: 1
}).once('get-annotated', () => {});

ib.annotatedListeners('get-annotated'); // returns any annotated listener so both listeners will be returned

// or an annotation can be used to query the listeners

ib.annotatedListeners('get-annotated', {
    data: 0
}); // returns any annotated listener who's annotation matches the passed object so only the first listener will be returned

// you can do the same without the event name

ib.allAnnotatedListeners(); // returns both listeners

// or

ib.allAnnotatedListeners({
    data: 0
}); // returns only the first

// listeners can be removed the same way
ib.removeAnnotatedListeners('get-annotated'); // both listeners will be removed

// or 

ib.removeAllAnnotatedListeners({
    data: 0
}); // the first listener will be removed
```

#### interception
```js
var ib = new IronBeam.EventEmitter();

ib.on('intercept-me', (arg) => {
    // some work
});

ib.intercept('intercept-me', {

    // interceptors will be called even if there are no listeners for an event
    // one or more of these functions can be sent to one intercept call
    
    preEmit: (stop, next, anno, req) => {
        // preEmit is called before any listener
        // call stop() to end the event chain
        // call next(...args) to continue the event chain - pass an option an args parameter to modify the emitter's parameters
        // anno is a merge of the emitter's and every listener's annotations
    },
    
    preListener: (stop, next, anno, req) => {
        // preListener is called before each listener
        // call stop() to end the event chain
        // call next(...args) to continue the event chain - pass an option an args parameter to modify the emitter's parameters
        // anno is a merge of the emitter's and the current listener's annotations
    },
    
    postListener: (stop, next, anno, req) => {
        // postListener is called after each listener
        // call stop() to end the event chain
        // call next() to continue the event chain
        // anno is a merge of the emitter's and the current listener's annotations
    },
    
    postEmit: (stop, next, anno, req) => {
        // postEmit is called after all listeners
        // call stop() to end the event chain
        // call next() to continue the event chain
        // anno is a merge of the emitter's and the every listener's annotations
    }
});
ib.emit('intercept-me', 123);
```
