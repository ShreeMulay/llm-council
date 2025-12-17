# Python Conventions

## Project Setup

### Use pyproject.toml

```toml
[project]
name = "my-project"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.104.0",
    "pydantic>=2.0.0",
    "httpx>=0.25.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0.0",
    "ruff>=0.1.0",
    "mypy>=1.0.0",
]

[tool.ruff]
line-length = 100
target-version = "py311"

[tool.mypy]
strict = true
```

### Package Management

```bash
# Prefer uv for speed
uv pip install -e ".[dev]"
uv pip sync requirements.txt

# Or standard pip
pip install -e ".[dev]"
```

---

## Type Hints

### Always Use Type Hints

```python
from typing import Optional, List, Dict, Any, TypeVar, Generic
from collections.abc import Callable, Sequence, Mapping

# Basic types
def greet(name: str) -> str:
    return f"Hello, {name}"

# Optional values
def find_user(user_id: str) -> Optional[User]:
    return db.users.get(user_id)

# Collections
def process_items(items: list[str]) -> dict[str, int]:
    return {item: len(item) for item in items}

# Callable types
Handler = Callable[[Request], Response]

# Generic types
T = TypeVar('T')

def first(items: Sequence[T]) -> Optional[T]:
    return items[0] if items else None
```

### Pydantic v2 Models

```python
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"
    GUEST = "guest"

class UserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., pattern=r'^[\w\.-]+@[\w\.-]+\.\w+$')
    role: UserRole = UserRole.USER
    
    @field_validator('name')
    @classmethod
    def name_must_not_be_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('Name cannot be empty')
        return v.strip()

class User(UserCreate):
    id: str
    created_at: datetime
    updated_at: datetime
    
    model_config = {
        'from_attributes': True  # Enable ORM mode
    }
```

---

## Async Patterns

### FastAPI with Async

```python
from fastapi import FastAPI, HTTPException, Depends
from contextlib import asynccontextmanager
import httpx

# Lifespan for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    app.state.http_client = httpx.AsyncClient()
    yield
    # Shutdown
    await app.state.http_client.aclose()

app = FastAPI(lifespan=lifespan)

# Async endpoint
@app.get("/users/{user_id}")
async def get_user(user_id: str) -> User:
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User.model_validate(user)

# Dependency injection
async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    user = await verify_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user

@app.get("/me")
async def get_me(user: User = Depends(get_current_user)) -> User:
    return user
```

### Async Context Managers

```python
from contextlib import asynccontextmanager
from typing import AsyncGenerator

@asynccontextmanager
async def get_db_session() -> AsyncGenerator[Session, None]:
    session = Session()
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()

# Usage
async def create_user(data: UserCreate) -> User:
    async with get_db_session() as session:
        user = User(**data.model_dump())
        session.add(user)
        return user
```

---

## Error Handling

### Custom Exceptions

```python
class AppError(Exception):
    """Base application error."""
    def __init__(self, message: str, code: str = "UNKNOWN_ERROR"):
        self.message = message
        self.code = code
        super().__init__(message)

class NotFoundError(AppError):
    def __init__(self, resource: str, id: str):
        super().__init__(
            message=f"{resource} with id '{id}' not found",
            code="NOT_FOUND"
        )

class ValidationError(AppError):
    def __init__(self, field: str, message: str):
        super().__init__(
            message=f"Validation error on '{field}': {message}",
            code="VALIDATION_ERROR"
        )
```

### Result Pattern

```python
from dataclasses import dataclass
from typing import Generic, TypeVar, Union

T = TypeVar('T')
E = TypeVar('E', bound=Exception)

@dataclass
class Ok(Generic[T]):
    value: T
    
    def is_ok(self) -> bool:
        return True
    
    def is_err(self) -> bool:
        return False

@dataclass
class Err(Generic[E]):
    error: E
    
    def is_ok(self) -> bool:
        return False
    
    def is_err(self) -> bool:
        return True

Result = Union[Ok[T], Err[E]]

# Usage
async def get_user(user_id: str) -> Result[User, NotFoundError]:
    user = await db.users.find_one({"id": user_id})
    if not user:
        return Err(NotFoundError("User", user_id))
    return Ok(User.model_validate(user))

# Handling
result = await get_user("123")
if result.is_err():
    print(f"Error: {result.error.message}")
else:
    print(f"User: {result.value.name}")
```

---

## File Structure

```
src/
├── api/
│   ├── __init__.py
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── users.py
│   │   └── auth.py
│   └── dependencies.py
├── models/
│   ├── __init__.py
│   ├── user.py
│   └── base.py
├── services/
│   ├── __init__.py
│   ├── user_service.py
│   └── auth_service.py
├── repositories/
│   ├── __init__.py
│   └── user_repository.py
├── utils/
│   ├── __init__.py
│   └── helpers.py
├── config.py
└── main.py
```

---

## Testing with pytest

```python
import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch

# Fixtures
@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest.fixture
def mock_user():
    return User(
        id="test-123",
        name="Test User",
        email="test@example.com",
        role=UserRole.USER,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )

# Async tests
@pytest.mark.asyncio
async def test_get_user(client: AsyncClient, mock_user: User):
    with patch("services.user_service.get_user", new_callable=AsyncMock) as mock:
        mock.return_value = mock_user
        response = await client.get("/users/test-123")
        assert response.status_code == 200
        assert response.json()["name"] == "Test User"

@pytest.mark.asyncio
async def test_get_user_not_found(client: AsyncClient):
    with patch("services.user_service.get_user", new_callable=AsyncMock) as mock:
        mock.return_value = None
        response = await client.get("/users/nonexistent")
        assert response.status_code == 404
```

---

## Code Style

### Naming Conventions

```python
# Variables and functions: snake_case
user_name = "John"
def get_user_by_id(user_id: str) -> User: ...

# Classes: PascalCase
class UserService: ...

# Constants: SCREAMING_SNAKE_CASE
MAX_RETRY_COUNT = 3
DEFAULT_TIMEOUT = 30

# Private: leading underscore
def _internal_helper(): ...
class _InternalClass: ...
```

### Docstrings

```python
def calculate_billing(
    user_id: str,
    period_start: datetime,
    period_end: datetime,
    include_tax: bool = True,
) -> BillingResult:
    """
    Calculate billing amount for a user within a given period.
    
    Args:
        user_id: The unique identifier of the user.
        period_start: Start of the billing period.
        period_end: End of the billing period.
        include_tax: Whether to include tax in the calculation.
    
    Returns:
        BillingResult containing the total amount and line items.
    
    Raises:
        NotFoundError: If the user doesn't exist.
        ValidationError: If the period is invalid.
    
    Example:
        >>> result = await calculate_billing(
        ...     user_id="123",
        ...     period_start=datetime(2024, 1, 1),
        ...     period_end=datetime(2024, 1, 31),
        ... )
        >>> print(result.total_amount)
        150.00
    """
```

---

## Recommended Libraries

| Purpose | Library | Notes |
|---------|---------|-------|
| Web Framework | FastAPI | Async, automatic OpenAPI |
| Validation | Pydantic v2 | Data validation and settings |
| HTTP Client | httpx | Async HTTP requests |
| Database ORM | SQLAlchemy 2.0 | Async support |
| Testing | pytest + pytest-asyncio | Async test support |
| Linting | Ruff | Fast, replaces flake8/isort/black |
| Type Checking | mypy | Static type analysis |
| Environment | python-dotenv | .env file loading |
| Logging | structlog | Structured logging |
