from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from models import init_db
from routers import audio, stages, speaking, vocabulary

# Khởi tạo FastAPI app
app = FastAPI(
    title="English Learning API",
    description="API cho website học tiếng Anh giao tiếp",
    version="1.0.0"
)

# CORS - cho phép frontend kết nối
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Trong production nên giới hạn
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files (audio, recordings)
os.makedirs("static/audio", exist_ok=True)
os.makedirs("static/recordings", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Đăng ký routers
app.include_router(audio.router)
app.include_router(stages.router)
app.include_router(speaking.router)
app.include_router(vocabulary.router)

# Serve frontend build (for production on Render)
FRONTEND_BUILD = os.path.join(os.path.dirname(__file__), "frontend_dist")
if os.path.exists(FRONTEND_BUILD):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_BUILD, "assets")), name="frontend_assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """Serve React app for all non-API routes"""
        file_path = os.path.join(FRONTEND_BUILD, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_BUILD, "index.html"))


@app.on_event("startup")
def startup_event():
    """Khởi tạo database khi app start"""
    init_db()
    print("✅ Database initialized")


@app.get("/health")
def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
