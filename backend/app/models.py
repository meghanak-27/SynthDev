import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    programs = relationship("Program", back_populates="owner")
    bug_fixes = relationship("BugFix", back_populates="owner")
    projects = relationship("Project", back_populates="owner")

class Program(Base):
    __tablename__ = "programs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    prompt = Column(Text, nullable=False)
    language = Column(String(50), nullable=False)
    code = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)
    complexity = Column(String(100), nullable=True)
    test_cases = Column(JSON, nullable=True)  # List of test dicts
    console_output = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="programs")

class BugFix(Base):
    __tablename__ = "bug_fixes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    language = Column(String(50), nullable=False)
    buggy_code = Column(Text, nullable=False)
    fixed_code = Column(Text, nullable=True)
    error_logs = Column(Text, nullable=True)
    explanation = Column(Text, nullable=True)
    what_was_wrong = Column(Text, nullable=True)
    how_fixed = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    human_intervention_required = Column(Boolean, default=False)
    status = Column(String(50), default="pending")  # success, failed, waiting_intervention, aborted
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="bug_fixes")

class Project(Base):
    __tablename__ = "projects"

    id = Column(String(100), primary_key=True, index=True)  # UUID or clean slug
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    stack = Column(String(50), nullable=False)  # MERN, Python
    build_only = Column(Boolean, default=True)
    status = Column(String(50), default="idle")  # idle, running, completed, failed, waiting_intervention, aborted
    live_url = Column(String(255), nullable=True)
    deployment_logs = Column(Text, nullable=True)
    uptime = Column(String(50), default="0%")
    last_modified = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    files = Column(JSON, nullable=True)  # Dict mapping relative path -> file contents
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="projects")
