const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const AI_CORE_URL = process.env.AI_CORE_URL || 'http://127.0.0.1:8000';

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        const response = await axios.get(`${AI_CORE_URL}/`);
        return res.json({
            status: 'online',
            web_backend: 'healthy',
            ai_core_service: response.data
        });
    } catch (error) {
        return res.status(503).json({
            status: 'degraded',
            web_backend: 'healthy',
            ai_core_service: 'unreachable',
            error: error.message
        });
    }
});

// Primary Endpoint: Get AI Trading Signal & Portfolio Allocation
app.get('/api/trading-signals', async (req, res) => {
    try {
        const capital = req.query.capital || 100000000;
        console.log(`[Node.js Backend] Requesting AI allocation for capital: ${Number(capital).toLocaleString()} VND`);

        // Forward request to Python AI Microservice
        const aiResponse = await axios.get(`${AI_CORE_URL}/api/recommendation`, {
            params: { capital: capital }
        });

        return res.json({
            success: true,
            provider: 'AI QUANTUM Engine',
            data: aiResponse.data.data
        });
    } catch (error) {
        console.error('[Node.js Backend] Error calling AI Core:', error.message);
        if (error.response) {
            return res.status(error.response.status).json({
                success: false,
                error: error.response.data
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Failed to connect to AI Core Microservice'
        });
    }
});

app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`🚀 Node.js Web Backend is running on port ${PORT}`);
    console.log(`🔗 AI Core Endpoint configured: ${AI_CORE_URL}`);
    console.log(`=================================================`);
});
