const sql = require('mssql');
require('dotenv').config();

const serverString = process.env.DB_SERVER || 'LAPTOP-E45SU45T\\SQLEXPRESS';
let serverHost = serverString;
let instanceName = undefined;

if (serverString.includes('\\')) {
    const parts = serverString.split('\\');
    serverHost = parts[0];
    instanceName = parts[1];
}

const dbConfig = {
    user: process.env.DB_USER || 'moccoon_app',
    password: process.env.DB_PASSWORD || 'Moccoon2026@Pass',
    server: serverHost,
    database: process.env.DB_DATABASE || 'MoccoonDB',
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERT !== 'false',
        enableArithAbort: true,
        ...(instanceName ? { instanceName } : {})
    },
    pool: {
        max: 20,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

let poolPromise = null;

async function getPool() {
    if (!poolPromise) {
        poolPromise = new sql.ConnectionPool(dbConfig)
            .connect()
            .then(pool => {
                console.log(`[SQL Server] Connected successfully to ${serverString}/${dbConfig.database}`);
                return pool;
            })
            .catch(err => {
                console.error('[SQL Server] Connection error:', err.message);
                poolPromise = null;
                throw err;
            });
    }
    return poolPromise;
}

module.exports = {
    sql,
    getPool
};
