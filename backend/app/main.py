from fastapi import FastAPI, WebSocket, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, get_db
from app.routers import auth, profile, feed, swipe, matches, messages, moderation
from app.websocket import websocket_endpoint

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="TeamUp API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(feed.router)
app.include_router(swipe.router)
app.include_router(matches.router)
app.include_router(messages.router)
app.include_router(moderation.router)


@app.websocket("/ws")
async def websocket_route(websocket: WebSocket, token: str = Query(...)):
    db = next(get_db())
    try:
        await websocket_endpoint(websocket, token, db)
    finally:
        db.close()


@app.get("/")
def root():
    return {"message": "TeamUp API", "version": "1.0.0"}


@app.get("/health")
def health():
    return {"status": "ok"}

