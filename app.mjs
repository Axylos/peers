import express from 'express';
import logger from 'morgan';
import sio from 'socket.io';
import path from 'path';

const app = express();
app.use(logger('dev'));

app.use(express.static(path.join(path.dirname(''), 'client')));
app.get('/web', (req, res) => res.sendFile('./client/index.html', {root: path.dirname('')}));
app.get('/', (req, res) => res.send('hi'));

const server = app.listen(8000);
const io = sio(server);

let owner;
let caller;

let id = 0;
io.on('connection', (sock) => {
  console.log('hi');
  sock.on('init', (data) => {
    console.log('inited');
    if (id === 0) {
      owner = sock.id;
    } else {
      caller = sock.id;
    }
    console.log(id);
    io.emit('pong', id++);
    if (id > 1) {
      console.log('send pong');
      io.to(owner).emit('makeOffer', true);
    }
  });

  sock.on('sendCandidate', candidate => {
    io.to(caller).emit('addCandidate', candidate);
  });

  sock.on('sendPeerDescription', description => {
    io.to(owner).emit('getPeerDescription', description);
  });

  sock.on('sendDescription', description => {
    io.to(caller).emit('getDescription', description);
  });
});

