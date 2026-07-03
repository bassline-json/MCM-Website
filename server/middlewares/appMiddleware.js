export const appMiddleware = (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const start = Date.now();

    

    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - IP: ${ip} - Status: ${res.statusCode} - ${duration}ms`);
    });

    next();
};
