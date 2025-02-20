import express from 'express';
import cors from 'cors';
import "dotenv/config";
import apiRouter from './routes/ApiRouter.js';
import { Server } from 'socket.io';
import http from 'http';
import mongoose from 'mongoose';
import user_model from './models/user_model.js';
import connectDB from './database/db_connection.js';
import Message_model from './models/Message_model.js';
import morgan from 'morgan';

const PORT = process.env.PORT;
const IS_LIVE = process.env.IS_LIVE;

const app = express();

app.use(morgan("dev"))


const allowed = ["https://chat-app-net.vercel.app","*"]
const server = http.createServer(app);
const io  = new Server(server,
//                        {
//   cors: {
//     origin: allowed,
//     methods: ["GET", "POST"],
//     credentials: true
//   },
//   pingTimeout: 60000,
//   pingInterval: 25000
// }
                      );


// Store online users with their names
const onlineUsers = new Map();

io.on('connection', (socket) => {
  // Handle user connection
  socket.on('user_connected', async ({ userId, userName }) => {
    if (!userId || !userName) {
      console.log('Invalid user data received:', { userId, userName });
      return;
    }

    // Store both ID and name
    onlineUsers.set(userId, {
      socketId: socket.id,
      userName: userName
    });
    
    // Store user info in socket for disconnect handling
    socket.userId = userId;
    socket.userName = userName;
    
    console.log(`User connected: ${userName} (${userId})`);
    console.log('Current online users:', onlineUsers.size);
    
    // Broadcast online users list with names
    const onlineUsersList = Array.from(onlineUsers.entries()).map(([userId, data]) => ({
      userId: userId,
      userName: data.userName
    }));
    
    io.emit('users_online', onlineUsersList);
  });

  // Handle private message
  socket.on('private_message', async (data) => {
    try {
      const { senderId, receiverId, content } = data;
      
      if (!senderId || !receiverId || !content) {
        console.log('Invalid message data:', data);
        return;
      }

      

      const message = new Message_model({
        sender: senderId,
        receiver: receiverId,
        content: content,
        isRead: false
      });
      await message.save();
      console.log("message",message)

      // If receiver is online, send them the message
      const receiverData = onlineUsers.get(receiverId);
      if (receiverData) {
        io.to(receiverData.socketId).emit('new_message', {
          message: message,
          sender: senderId
        });
      }
    } catch (error) {
      console.error('Message sending failed:', error);
    }
  });

  // Handle message read status
  socket.on('mark_as_read', async (messageId) => {
    try {
      const message = await Message_model.findByIdAndUpdate(
        messageId,
        { 
          isRead: true,
          readAt: new Date()
        },
        { new: true }
      );
      
      // Notify sender that message was read
      const senderData = onlineUsers.get(message.sender.toString());
      if (senderData) {
        io.to(senderData.socketId).emit('message_read', messageId);
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (socket.userId) {
      console.log(`User disconnected: ${socket.userName} (${socket.userId})`);
      onlineUsers.delete(socket.userId);
      
      // Broadcast updated online users list
      const onlineUsersList = Array.from(onlineUsers.entries()).map(([userId, data]) => ({
        userId: userId,
        userName: data.userName
      }));
      
      io.emit('users_online', onlineUsersList);
    }
  });
});


app.use(cors({
  origin: allowed,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true
}));

connectDB();
app.use(express.json());

app.get('/', (req, res) => {res.json({message: ' Server is running'})});

app.use('/api' , apiRouter)

server.listen(PORT, () => {console.log(`Server is running on http://localhost:${PORT}`);});
