const bcrypt = require('bcryptjs');
const { getPool, sql } = require('./src/config/db');

async function updatePasswords() {
    try {
        const pool = await getPool();
        const hash = await bcrypt.hash('Admin@123456', 10);
        console.log('Generated bcrypt hash:', hash);

        await pool.request()
            .input('hash', sql.NVarChar, hash)
            .query('UPDATE Users SET password_hash = @hash');

        console.log('✓ Successfully updated password_hash for all users to Admin@123456!');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

updatePasswords();
