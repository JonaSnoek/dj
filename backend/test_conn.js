const mysql = require('mysql2/promise');

async function testHost(host) {
    try {
        console.log(`Testing connection to ${host}:3306 as root...`);
        const connection = await mysql.createConnection({
            host: host,
            user: 'root',
            password: '',
            connectTimeout: 2000
        });
        console.log(`Connection to ${host} SUCCESSFUL!`);
        await connection.end();
        return true;
    } catch (err) {
        console.error(`Connection to ${host} FAILED:`, err.message);
        return false;
    }
}

async function runTests() {
    await testHost('127.0.0.1');
    await testHost('localhost');
    await testHost('::1');
}

runTests();
