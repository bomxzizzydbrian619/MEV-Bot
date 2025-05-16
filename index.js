const express = require('express');
const MEVBot = require('./bot.js'); // Assuming MEVBot is exported from bot.js

const app = express();
const port = process.env.PORT || 3000;

// Initialize the bot
const bot = new MEVBot();
bot.run();
// Route to get the current state of the bot
app.get('/', (req, res) => {
  res.json({ status: 'OK'});
});
// Route to get the current state of the bot
app.get('/bot/state', (req, res) => {
  const state = bot.stateManager.getState();
  res.json({...state, totalProfit: state.totalProfit.toLocaleString()});
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});