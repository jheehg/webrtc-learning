const express = require('express');
const app = express();
const socket = require('socket.io');
const PORT = 4000;

app.use(express.static(__dirname + '/public'));

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const io = socket(server);

io.on('connection', (socket) => {
  console.log('a user connected', socket.id);

  // socket.on('join', (data) => {
  //   console.log(data);
  //   socket.join(data.username);
  // });

  socket.on('chat', (data) => {
    console.log(data);
    socket.emit('sendMessage', data);
  });
});
