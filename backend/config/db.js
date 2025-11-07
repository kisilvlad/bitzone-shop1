// backend/config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`✅ MongoDB підключено: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ Помилка підключення до MongoDB: ${error.message}`);
        process.exit(1); // Exit process with failure
    }
};

module.exports = connectDB; // <-- THE FIX IS HERE
