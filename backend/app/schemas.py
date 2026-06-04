import datetime
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any

# Token
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# User
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    email: EmailStr
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# Program
class ProgramCreate(BaseModel):
    prompt: str
    language: str

class ProgramOut(BaseModel):
    id: int
    user_id: int
    prompt: str
    language: str
    code: str
    explanation: Optional[str] = None
    complexity: Optional[str] = None
    test_cases: Optional[List[Dict[str, Any]]] = None
    console_output: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# BugFix
class BugFixCreate(BaseModel):
    language: str
    buggy_code: str
    error_logs: Optional[str] = None

class BugFixOut(BaseModel):
    id: int
    user_id: int
    language: str
    buggy_code: str
    fixed_code: Optional[str] = None
    error_logs: Optional[str] = None
    explanation: Optional[str] = None
    what_was_wrong: Optional[str] = None
    how_fixed: Optional[str] = None
    retry_count: int
    human_intervention_required: bool
    status: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class BugFixUpdate(BaseModel):
    fixed_code: Optional[str] = None
    status: Optional[str] = None  # e.g., success, aborted
    human_intervention_required: Optional[bool] = None

# Project
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    stack: str  # MERN, Python
    build_only: bool

class ProjectOut(BaseModel):
    id: str
    user_id: int
    name: str
    description: Optional[str] = None
    stack: str
    build_only: bool
    status: str
    live_url: Optional[str] = None
    deployment_logs: Optional[str] = None
    uptime: str
    last_modified: datetime.datetime
    files: Optional[Dict[str, str]] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class ProjectUpdate(BaseModel):
    status: Optional[str] = None
    live_url: Optional[str] = None
    deployment_logs: Optional[str] = None
    files: Optional[Dict[str, str]] = None
    uptime: Optional[str] = None
