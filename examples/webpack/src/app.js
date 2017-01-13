
import { EventEmitter } from 'iron-beam';

const ib = new EventEmitter();

/**
 * Most generic interceptors should go first. Currently order does matter
 * So this illustrates a logging interceptor with a wildcard
 * We use a *.* to wildcard everything at the second section
 */
ib.intercept('*.*', {
    // we are hooking into the event lifecycle 'preEmit' which is called before any listener
    preEmit: (stop, next, anno, ...args) => {
        // We can use the annotations to build our desired logic
        if (anno.eventMeta.sections[1] == 'log') {
            console.log({
                eventName: anno.eventMeta.name,
                data: args
            });
        }
        // Call next() to continue the event chain to the next interceptor/listener
        next();
    }
});


/**
 * Example of an annotated listener
 * The emiiter and listener annotations are merged as well as an eventMeta annotation added by the system
 * These annotations can be used by interceptors and/or the listeners
 */
ib.annotate({
    roleMods: {
        admin: 'ADMIN: ',
        viewer: 'VIEWER: '
    }
}).on('a.*', (msg) => {
    updateDoc(msg);
});

ib.intercept('a.*', {
    preEmit: (stop, next, anno, msg) => {
        if (anno.roleMods) {
            if (anno.roleMods[anno.role]) {
                // Call next() to continue the event chain with modified arguments (passed as an array)
                next([
                    `${anno.roleMods[anno.role]}${msg}`
                ]);
            }
            else {
                // Call stop() to end the event chain. This will NOT call the next interceptor/listener!
                stop();
            }
        }
        else {
            next();
        }
    }
});


ib.on('b.*', (cb) => {
    cb('a message');
});

ib.intercept('b.*', {
    preEmit: (stop, next, anno, cb) => {
        // An example of modifing a callback. You receive the call from the listener and can modify the logic and callback to the emitter
        next([
            (msg) => {
                cb(`I intercepted and changed your message :) -- ${msg}`);
            }
        ]);
    }
});


/**
 * Example of an annotated emiiter
 */
ib.annotate({
    role: 'admin'
}).emit('a.dont-log','Hello World!');

ib.emit('a.log','Hello Again!');

ib.emit('b.log', (msg) => {
    updateDoc(msg)
});

function updateDoc(msg) {
    let h = document.createElement("h1");
    let t = document.createTextNode(msg);
    h.appendChild(t);
    document.body.appendChild(h);
}
