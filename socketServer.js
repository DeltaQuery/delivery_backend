const { Server } = require("socket.io")

let io

function socketServer(server) {
  io = new Server(server, {
    cors: {
      origin: "*",
    }
  })

  io.on('connection', (socket) => {

    socket.on('login', (userId) => {
      //socketToUserId.set(socket.id, userId)
      console.log(`User ${userId} logged in with socket id ${socket.id}`)
      socket.join(userId)
      //console.log(socket.request._query.userId)
    })

    socket.on('logout', (userId) => {
      //socketToUserId.set(socket.id, userId)
      console.log(`User ${userId} logged out with socket id ${socket.id}`)
      socket.leave(userId)
      //console.log(socket.request._query.userId)
    })

    socket.on('authentication', (userId) => {
      // Create a room with the userId as the room name
      socket.join(userId)

      //socketToUserId.set(socket.id, userId)
      console.log(`User ${userId} with socket id ${socket.id} requested an action`)
      const room = io.sockets.adapter.rooms.get(userId)
      const numSockets = room ? room.size : 0
      console.log(`There are ${numSockets} sockets in ${userId} room.`)
    })

    socket.on("home", (message) => {
      console.log(message)
    })

    socket.on("hello", (message) => {
      console.log(message)
    })
  })
}

function notifyChangeToRoom(userId, rideId = "undefined") {
  io.to(userId).emit('changeNotification', rideId)
}

module.exports = {
  socketServer,
  notifyChangeToRoom
}
