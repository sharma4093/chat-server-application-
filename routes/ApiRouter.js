import express from 'express';
import authController from '../controllers/authController.js';
import Message from '../models/Message_model.js';
import mongoose from 'mongoose';

const apiRouter = express.Router();

// Auth routes
apiRouter.post('/signup', authController.register);
apiRouter.post('/login', authController.login);
apiRouter.get('/all-users',authController.getAllUsers)

// Get chat history between two users
apiRouter.get('/messages/:userId1/:userId2', async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;
    
    const messages = await Message.find({
      $or: [
        { sender: userId1, receiver: userId2 },
        { sender: userId2, receiver: userId1 }
      ]
    }).sort('createdAt');
    
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching messages' });
  }
});

// Get unread message count for a user
apiRouter.get('/unread-count/:userId', async (req, res) => {
  try {
    const unreadCounts = await Message.aggregate([
      {
        $match: {
          receiver: new mongoose.Types.ObjectId(req.params.userId),
          isRead: false
        }
      },
      {
        $group: {
          _id: '$sender',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json(unreadCounts);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching unread counts' });
  }
});


// Get all users
apiRouter.get('/users', async (req, res) => {
  try {
    const users = await user_model.find({}, { password: 0 }); // Exclude password field
    
    if (!users || users.length === 0) {
      return res.status(404).json({ message: "No users found" });
    }

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching users' });
  }
});


export default apiRouter;