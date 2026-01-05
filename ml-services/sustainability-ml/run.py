"""Application entry point"""

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8003,  # Using port 8003 (8001 and 8002 likely used by other services)
        reload=True,
        log_level="info"
    )
