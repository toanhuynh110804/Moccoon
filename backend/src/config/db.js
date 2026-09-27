const sql = require('mssql');
require('dotenv').config();

function parseServer(serverStr) {
    let serverHost = serverStr;
    let instanceName = undefined;
    if (serverStr.includes('\\')) {
        const parts = serverStr.split('\\');
        serverHost = parts[0];
        instanceName = parts[1];
    }
    return { serverHost, instanceName };
}

function createConfig(serverStr) {
    const { serverHost, instanceName } = parseServer(serverStr);
    return {
        user: process.env.DB_USER || 'moccoon_app',
        password: process.env.DB_PASSWORD || 'Moccoon2026@Pass',
        server: serverHost,
        database: process.env.DB_DATABASE || 'MoccoonDB',
        connectionTimeout: 5000,
        requestTimeout: 15000,
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
}

let poolPromise = null;

async function connectCandidate(candidate) {
    const cfg = createConfig(candidate);
    const pool = new sql.ConnectionPool(cfg);
    await pool.connect();
    return pool;
}

async function getPool() {
    if (poolPromise) return poolPromise;

    const primaryServer = process.env.DB_SERVER || 'localhost\\SQLEXPRESS';
    const candidates = [
        primaryServer,
        'localhost\\SQLEXPRESS',
        '127.0.0.1\\SQLEXPRESS',
        '.\\SQLEXPRESS',
        'localhost',
        '127.0.0.1'
    ];
    // Remove duplicates while preserving order
    const uniqueCandidates = [...new Set(candidates)];

    poolPromise = (async () => {
        let lastError = null;
        for (const candidate of uniqueCandidates) {
            try {
                const pool = await connectCandidate(candidate);
                console.log(`[SQL Server] ✓ Kết nối thành công tới ${candidate}/${process.env.DB_DATABASE || 'MoccoonDB'}`);
                return pool;
            } catch (err) {
                lastError = err;
            }
        }
        console.error('❌ [SQL Server] Không thể kết nối tới cơ sở dữ liệu trên các máy chủ khả dụng:');
        console.error(`   Đã thử: ${uniqueCandidates.join(', ')}`);
        console.error(`   Lỗi chi tiết: ${lastError ? lastError.message : 'Unknown'}`);
        console.error('   👉 Gợi ý: Hãy đảm bảo dịch vụ SQL Server (SQLEXPRESS) đang chạy, hoặc kiểm tra cấu hình trong file .env');
        poolPromise = null;
        throw lastError;
    })();

    return poolPromise;
}

module.exports = {
    sql,
    getPool
};
