from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.models import router as models_router
from app.api.execute import router as execute_router

app = FastAPI(
    title="LangGraph Forge API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(models_router)
app.include_router(execute_router)


@app.get("/api/health")
async def health():
    return {"status": "healthy"}
