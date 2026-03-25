const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function init() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`);
    await connection.changeUser({ database: process.env.DB_NAME });

    console.log('Database created/selected.');

    await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            roles VARCHAR(255) NOT NULL
        )
    `);

    await connection.query(`
        CREATE TABLE IF NOT EXISTS tracks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            artist VARCHAR(255) NOT NULL,
            file_path VARCHAR(255) NOT NULL,
            uploaded_by INT,
            FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
        )
    `);

    await connection.query(`
        CREATE TABLE IF NOT EXISTS requests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            dj_id INT NOT NULL,
            track_id INT,
            custom_track_name VARCHAR(255),
            status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (dj_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE SET NULL
        )
    `);

    console.log('Tables created.');

    const [rows] = await connection.query('SELECT * FROM users WHERE username = ?', ['admin']);
    if (rows.length === 0) {
        const hashedPassword = await bcrypt.hash('mpipwmkbe3521!', 10);
        await connection.query('INSERT INTO users (username, password, roles) VALUES (?, ?, ?)', ['admin', hashedPassword, 'DJ,Admin']);
        console.log('Admin user created.');
    } else {
        console.log('Admin user already exists.');
    }

    await connection.end();
}

init().catch(err => {
    console.error('Error initializing database:', err);
    process.exit(1);
});
