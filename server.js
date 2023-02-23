// 引入必要的模块
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
var cors = require('cors')
// 创建一个 Express 应用程序
const app = express();

app.use(cors())

// 创建一个 HTTP 服务器，并将 Express 应用程序绑定到它上面
const server = http.createServer(app);

// 创建一个 Socket.IO 服务器，并将 HTTP 服务器绑定到它上面
const io = socketio(server ,{cors: {origin: "*"}});

// 用于存储所有房间的信息
const rooms = {};

// 当有客户端连接时
io.on('connection', (socket) => {
  console.log('connection');
  // 当客户端发送登录事件时
  socket.on('login', (data) => {
    // 将客户端加入房间
    socket.join(data.room);

    // 如果房间不存在，则创建一个新的房间
    if (!rooms[data.room]) {
      rooms[data.room] = {
        users: {},
        messages: [],
      };
    }

    // 将用户信息存储到房间中
    rooms[data.room].users[socket.id] = {
      username: data.username,
      color: data.color,
    };

    // 发送欢迎消息给客户端
    socket.emit('message', {
      user: 'system',
      text: `Welcome to the ${data.room} room, ${data.username}!`,
    });

    // 将用户加入房间的消息广播给所有客户端
    socket.to(data.room).emit('message', {
      user: 'system',
      text: `${data.username} has joined the room.`,
    });

    // 将房间信息发送给客户端
    socket.emit('roomData', {
      room: data.room,
      users: rooms[data.room].users,
      messages: rooms[data.room].messages,
    });
  });

  // 当客户端发送消息时
  socket.on('message', (data) => {
    // 将消息存储到房间中
    rooms[data.room].messages.push({
      user: rooms[data.room].users[socket.id].username,
      text: data.text,
      color: rooms[data.room].users[socket.id].color,
    });

    // 将消息广播给所有客户端
    io.to(data.room).emit('message', {
      user: rooms[data.room].users[socket.id].username,
      text: data.text,
      color: rooms[data.room].users[socket.id].color,
    });
  });

  // 当客户端断开连接时
  socket.on('disconnect', () => {
    // 获取客户端所在的房间
    const room = Object.keys(socket.rooms).filter(
      (item) => item != socket.id
    )[0];

    // 如果房间存在，则将用户从房间中删除
    if (rooms[room]) {
      delete rooms[room].users[socket.id];

      // 将用户离开房间的消息广播给所有客户端
      io.to(room).emit('message', {
        user: 'system',
        text: `${socket.id} has left the room.`,
      });

      // 如果房间中没有用户了，则删除该房间
      if (Object.keys(rooms[room].users).length === 0) {
        delete rooms[room];
      } else {
        // 否则，将房间信息发送给客户端
        io.to(room).emit('roomData', {
          room: room,
          users: rooms[room].users,
          messages: rooms[room].messages,
        });
      }
    }
  });
});

// 启动服务器，监听 3000 端口
server.listen(3000, () => {
  console.log('Server started on port 3000');
});
