from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_redoc_html, get_swagger_ui_html

from app.database import Base, engine
import app.models  # noqa: ensure all models are loaded before create_all

from app.routers import auth, products, vendors, customers, sales, purchase, manufacturing, audit, dashboard

# Create tables (dev convenience — use Alembic for production migrations)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Mini ERP – Shiv Furniture Works",
    version="1.0.0",
    description="End-to-end ERP: Products, Sales, Purchase, Manufacturing, Procurement",
    docs_url=None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(vendors.router)
app.include_router(customers.router)
app.include_router(sales.router)
app.include_router(purchase.router)
app.include_router(manufacturing.router)
app.include_router(audit.router)
app.include_router(dashboard.router)


@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=app.title + " - Swagger UI",
        swagger_js_url="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.js",
        swagger_css_url="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.css",
    )


@app.get("/redoc", include_in_schema=False)
async def custom_redoc_html():
    return get_redoc_html(
        openapi_url=app.openapi_url,
        title=app.title + " - ReDoc",
        redoc_js_url="https://cdnjs.cloudflare.com/ajax/libs/redoc/2.1.3/redoc.standalone.min.js",
    )


@app.get("/")
def root():
    return {"message": "Mini ERP API is running", "docs": "/docs"}
