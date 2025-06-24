const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const PORT = 4000;
const remote_limit = 3;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.use(express.json());
app.use(express.static(__dirname + '/public'));

io.on('connection', (socket) => {
  console.log('Connected', socket.id);

  socket.on('joinRoom', (room) => {
    const rooms = io.sockets.adapter.rooms;
    const currentRoom = rooms.get(room);

    if (!currentRoom) {
      socket.join(room);
      socket.emit('roomCreated', { room });
    } else {
      if (currentRoom.size < remote_limit + 1) {
        socket.join(room);
        socket.emit('roomJoined', { room, userId: socket.id });
        console.log(`User ${socket.id} joined room ${room}`);
      } else {
        socket.emit('roomIsFull', { room });
      }
    }
  });

  socket.on('leaveRoom', (room) => {
    socket.leave(room);
    socket.to(room).emit('userLeaved', { userId: socket.id });
  });

  socket.on('ready', (room) => {
    console.log('ready', socket.id, room);
    socket.broadcast.to(room).emit('someOneReady', { room, userId: socket.id });
  });

  socket.on('candidate', (room, candidate) => {
    console.log('candidate', room, candidate);
    socket.broadcast.to(room).emit('candidate', candidate);
  });

  socket.on('offer', (room, offer) => {
    console.log('offer', room, offer);
    socket.broadcast.to(room).emit('offer', offer);
  });

  socket.on('answer', (room, answer) => {
    console.log('answer', room, answer);
    socket.broadcast.to(room).emit('answer', answer);
  });
});

io.on('disconnection', (socket) => {
  console.log('Disconnected', socket.id);
});
