
import { EventEmitter } from 'iron-beam';

const ib = new EventEmitter();

ib.on('a.*', (msg, anno) => {
    
    console.log('msg', msg);
    console.log('anno', anno);
    
    let h = document.createElement("h1");
    let t = document.createTextNode(msg);
    h.appendChild(t);
    document.body.appendChild(h);
});

ib.emit('a.b','Hello, Wordfgdfgd!');

