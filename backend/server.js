require('dotenv').config();
const { createApp } = require('./app');

const PORT = process.env.PORT || 5001;
const app = createApp();

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
