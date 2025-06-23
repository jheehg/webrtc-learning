const socket = io.connect('http://localhost:4000');

const username = document.getElementById('username');
const message = document.getElementById('message');
const output = document.getElementById('output');
const submit = document.getElementById('send');

submit.addEventListener('click', () => {
  const usernameValue = username.value;
  const messageValue = message.value;

  if (usernameValue) {
    // socket.emit('join', { username: usernameValue });
    socket.emit('chat', { username: usernameValue, message: messageValue });
  }

  message.value = '';
  username.value = '';
});

// socket.on('join', (data) => {
//   console.log(data);
// });

socket.on('sendMessage', (data) => {
  console.log(data);
  output.innerHTML += '<p><strong>' + data.username + ':</strong> ' + data.message + '</p>';
});

socket.on('connect', () => {
  console.log('connected to server');
});

socket.on('disconnect', () => {
  console.log('disconnected from server');
});
