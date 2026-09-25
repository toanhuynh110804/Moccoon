const { getPool } = require('../src/config/db');

async function fix() {
    try {
        const pool = await getPool();
        const res = await pool.request().query(`
            SELECT tc.CONSTRAINT_NAME, ccu.COLUMN_NAME
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
            JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu ON tc.CONSTRAINT_NAME = ccu.CONSTRAINT_NAME
            WHERE tc.TABLE_NAME = 'Users' AND tc.CONSTRAINT_TYPE = 'UNIQUE'
        `);
        console.log('Unique constraints:', res.recordset);

        for (const row of res.recordset) {
            console.log('Dropping constraint:', row.CONSTRAINT_NAME);
            await pool.request().query(`ALTER TABLE Users DROP CONSTRAINT [${row.CONSTRAINT_NAME}]`);
        }

        console.log('Creating filtered unique indexes...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UX_Users_Email_NotNull' AND object_id = OBJECT_ID('Users'))
            CREATE UNIQUE NONCLUSTERED INDEX UX_Users_Email_NotNull ON Users(email) WHERE email IS NOT NULL;

            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UX_Users_Phone_NotNull' AND object_id = OBJECT_ID('Users'))
            CREATE UNIQUE NONCLUSTERED INDEX UX_Users_Phone_NotNull ON Users(phone) WHERE phone IS NOT NULL;
        `);
        console.log('✓ Filtered unique indexes created successfully!');
        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
}

fix();
