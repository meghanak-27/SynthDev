import uuid
import datetime
import requests as req_lib
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, Response
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app import models, schemas
from app.database import engine, get_db
from app.config import settings
from app.auth.routes import router as auth_router
from app.auth.jwt import get_current_user
from app.services.docker_sandbox import sandbox
from app.services.deployment_sim import deployment_simulator
from app.services.vector_memory import vector_memory
from app.agents.graph import agent_graph
from app.agents.agent_nodes import call_llm, AGENT_NAMES
from app.services.llm import llm_service
from app.services.llm.prompt_builder import ProgramGenerationResult, BugFixResult, PromptBuilder

# Initialize tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.PROJECT_NAME, version="1.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://synthdev-fe.onrender.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router, prefix="/api")

# In-memory session tracking for active project building states
active_builds: Dict[str, Dict[str, Any]] = {}

# --- PROGRAMS ENDPOINTS ---

@app.post("/api/programs", response_model=schemas.ProgramOut)
def create_program(req: schemas.ProgramCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # 1. AI Generation using LLM Service
    prompt_text = PromptBuilder.build_program_gen_prompt(req.language, req.prompt)
    try:
        gen_result = llm_service.generate_structured_json(
            prompt=prompt_text,
            schema_class=ProgramGenerationResult,
            system_instruction="You are a brilliant software engineering bot. Generate robust, compilation-ready code."
        )
        code = gen_result.code
        explanation = gen_result.explanation
        complexity = gen_result.complexity
        test_cases = gen_result.test_cases
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI program generation failed: {str(e)}"
        )

    # Execute code in sandbox
    run_result = sandbox.execute_code(req.language, code)
    console_output = run_result["output"]

    # Save to Database
    db_program = models.Program(
        user_id=current_user.id,
        prompt=req.prompt,
        language=req.language,
        code=code,
        explanation=explanation,
        complexity=complexity,
        test_cases=test_cases,
        console_output=console_output
    )
    db.add(db_program)
    db.commit()
    db.refresh(db_program)
    return db_program

@app.get("/api/programs", response_model=List[schemas.ProgramOut])
def get_programs(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Program).filter(models.Program.user_id == current_user.id).order_by(models.Program.created_at.desc()).all()

# --- BUG FIX ENDPOINTS ---

@app.post("/api/bugs", response_model=schemas.BugFixOut)
def fix_bug(req: schemas.BugFixCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Run test compilation inside sandbox first to gather initial logs if empty
    test_run = sandbox.execute_code(req.language, req.buggy_code)
    error_logs = req.error_logs or test_run["output"]

    buggy_code = req.buggy_code
    fixed_code = buggy_code
    explanation = ""
    what_was_wrong = ""
    how_fixed = ""
    retry_count = 0
    status_str = "failed"
    success = False

    # Retry up to 3 times
    for i in range(1, 4):
        retry_count = i
        prompt = PromptBuilder.build_bug_fix_prompt(req.language, buggy_code, error_logs)
        try:
            fix_result = llm_service.generate_structured_json(
                prompt=prompt,
                schema_class=BugFixResult,
                system_instruction="You are a senior bug-fixer developer agent. Provide the corrected complete code."
            )
            fixed_code = fix_result.fixed_code
            explanation = fix_result.explanation
            what_was_wrong = fix_result.what_was_wrong
            how_fixed = fix_result.how_fixed
            
            # Execute fixed code in sandbox to verify
            run_res = sandbox.execute_code(req.language, fixed_code)
            if run_res["success"]:
                status_str = "success"
                success = True
                break
            else:
                # Failed again, update error logs for next try
                error_logs = run_res["output"]
                buggy_code = fixed_code
        except Exception as e:
            error_logs = f"LLM fixing exception: {str(e)}"
            # Continue loop

    if not success:
        status_str = "waiting_intervention"
        fixed_code = buggy_code # return last attempted fix code

    db_bug = models.BugFix(
        user_id=current_user.id,
        language=req.language,
        buggy_code=req.buggy_code,
        fixed_code=fixed_code if status_str == "success" else None,
        error_logs=error_logs,
        explanation=explanation if status_str == "success" else None,
        what_was_wrong=what_was_wrong if status_str == "success" else None,
        how_fixed=how_fixed if status_str == "success" else None,
        retry_count=retry_count,
        human_intervention_required=(status_str == "waiting_intervention"),
        status=status_str
    )
    db.add(db_bug)
    db.commit()
    db.refresh(db_bug)
    return db_bug

@app.put("/api/bugs/{bug_id}/intervention", response_model=schemas.BugFixOut)
def bug_intervention(bug_id: int, update: schemas.BugFixUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_bug = db.query(models.BugFix).filter(models.BugFix.id == bug_id, models.BugFix.user_id == current_user.id).first()
    if not db_bug:
        raise HTTPException(status_code=404, detail="Bug fix entry not found")
        
    if update.fixed_code:
        db_bug.fixed_code = update.fixed_code
        db_bug.status = "success"
        db_bug.human_intervention_required = False
        db_bug.what_was_wrong = "Syntax corrected via manual developer intervention."
        db_bug.how_fixed = "Code refactored manually in workspace IDE."
        db_bug.explanation = "Successfully compiled and deployed custom user patch."
    elif update.status:
        db_bug.status = update.status
        db_bug.human_intervention_required = False
        
    db.commit()
    db.refresh(db_bug)
    return db_bug

@app.get("/api/bugs", response_model=List[schemas.BugFixOut])
def get_bugs(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.BugFix).filter(models.BugFix.user_id == current_user.id).order_by(models.BugFix.created_at.desc()).all()

# --- PROJECTS ENDPOINTS ---

@app.post("/api/projects", response_model=schemas.ProjectOut)
def create_project(req: schemas.ProjectCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    stack = req.stack.upper()
    if stack not in ["MERN", "PYTHON"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported stack. Only MERN or Python stacks are supported."
        )

    project_id = str(uuid.uuid4())[:8]
    
    # Initialize DB state
    db_project = models.Project(
        id=project_id,
        user_id=current_user.id,
        name=req.name,
        description=req.description,
        stack=req.stack,
        build_only=req.build_only,
        status="running",
        files={},
        live_url=None,
        deployment_logs=""
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)

    # Initialize LangGraph AgentState
    initial_state = {
        "project_id": project_id,
        "project_name": req.name,
        "stack": req.stack,
        "build_only": req.build_only,
        "prompt": req.description or req.name,
        "current_agent": "Requirement Agent",
        "agent_states": {name: "idle" for name in AGENT_NAMES},
        "files": {},
        "test_results": {"success": True, "output": ""},
        "retry_count": 0,
        "deployment_logs": "",
        "live_url": "",
        "human_approval_required": False,
        "error_message": "",
        "logs": []
    }
    
    # Set entry point state
    initial_state["agent_states"]["Requirement Agent"] = "running"
    
    # Run the compiled LangGraph workflow sync
    result_state = agent_graph.invoke(initial_state)

    # Save outputs to DB
    db_project.files = result_state["files"]
    db_project.deployment_logs = result_state["deployment_logs"]
    db_project.live_url = result_state["live_url"]
    
    if result_state["human_approval_required"]:
        db_project.status = "waiting_intervention"
    else:
        db_project.status = "completed"
        db_project.uptime = "100%"
        
    db.commit()
    db.refresh(db_project)
    
    # Save active state to memory for polling graph animations
    active_builds[project_id] = result_state
    
    return db_project

@app.get("/api/projects", response_model=List[schemas.ProjectOut])
def get_projects(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Project).filter(models.Project.user_id == current_user.id).order_by(models.Project.last_modified.desc()).all()

@app.get("/api/projects/{project_id}", response_model=schemas.ProjectOut)
def get_project(project_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    proj = db.query(models.Project).filter(models.Project.id == project_id, models.Project.user_id == current_user.id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return proj

@app.get("/api/projects/{project_id}/graph")
def get_project_workflow_graph(project_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Returns the active agent states for animated workflows
    proj = db.query(models.Project).filter(models.Project.id == project_id, models.Project.user_id == current_user.id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    if project_id in active_builds:
        return {
            "current_agent": active_builds[project_id]["current_agent"],
            "agent_states": active_builds[project_id]["agent_states"],
            "error_message": active_builds[project_id]["error_message"],
            "human_approval_required": active_builds[project_id]["human_approval_required"]
        }
    
    # Completed state preset
    all_completed = {name: "completed" for name in AGENT_NAMES}
    if proj.build_only:
        all_completed["Deployment Agent"] = "idle"
        all_completed["Monitoring Agent"] = "idle"
        
    return {
        "current_agent": "completed" if proj.status == "completed" else proj.status,
        "agent_states": all_completed if proj.status == "completed" else {name: "failed" if proj.status == "failed" else "idle" for name in AGENT_NAMES},
        "error_message": "",
        "human_approval_required": proj.status == "waiting_intervention"
    }

@app.post("/api/projects/{project_id}/intervention", response_model=schemas.ProjectOut)
def project_intervention(project_id: str, action: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    proj = db.query(models.Project).filter(models.Project.id == project_id, models.Project.user_id == current_user.id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    if action == "retry":
        if project_id in active_builds:
            state = active_builds[project_id]
            state["retry_count"] = 0
            state["human_approval_required"] = False
            state["agent_states"]["Fix Agent"] = "completed"
            state["agent_states"]["Testing Agent"] = "running"
            state["current_agent"] = "Testing Agent"
            
            result_state = agent_graph.invoke(state)
            
            proj.files = result_state["files"]
            proj.deployment_logs = result_state["deployment_logs"]
            proj.live_url = result_state["live_url"]
            proj.status = "waiting_intervention" if result_state["human_approval_required"] else "completed"
            db.commit()
            active_builds[project_id] = result_state
            
    elif action == "override":
        proj.status = "completed"
        proj.uptime = "100%"
        if not proj.build_only:
            live_url, deploy_logs = deployment_simulator.run_deployment_pipeline(
                project_id=proj.id,
                project_name=proj.name,
                stack=proj.stack,
                files=proj.files
            )
            proj.live_url = live_url
            proj.deployment_logs = deploy_logs
            # Add files index to Chroma vector memory
            vector_memory.add_project_files(proj.id, proj.files or {})
        db.commit()
        if project_id in active_builds:
            del active_builds[project_id]
            
    else: # abort
        proj.status = "aborted"
        db.commit()
        deployment_simulator.terminate_deployment(project_id)
        if project_id in active_builds:
            del active_builds[project_id]

    return proj

@app.post("/api/projects/{project_id}/query")
def query_project_rag(project_id: str, req: Dict[str, str], db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    proj = db.query(models.Project).filter(models.Project.id == project_id, models.Project.user_id == current_user.id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
        
    query = req.get("query", "")
    if not query:
        raise HTTPException(status_code=400, detail="Query text required")
        
    results = vector_memory.query_project(project_id, query)
    
    context = "\n\n".join([f"--- File: {r['file_path']} ---\n{r['text']}" for r in results])
    prompt = f"Answer the developer question: '{query}' based on the project code files provided below:\n\n{context}"
    
    answer = call_llm(
        prompt=prompt,
        system_instruction="You are a DevOps RAG Copilot. Explain the code structure and logic clearly based on files context."
    )
    
    return {
        "query": query,
        "answer": answer,
        "context_files": [r["file_path"] for r in results]
    }

@app.post("/api/projects/{project_id}/redeploy", response_model=schemas.ProjectOut)
def redeploy_project(project_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    proj = db.query(models.Project).filter(models.Project.id == project_id, models.Project.user_id == current_user.id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
        
    proj.status = "deploying"
    db.commit()
    
    live_url, deploy_logs = deployment_simulator.run_deployment_pipeline(
        project_id=proj.id,
        project_name=proj.name,
        stack=proj.stack,
        files=proj.files or {}
    )
    
    proj.live_url = live_url
    proj.deployment_logs = deploy_logs
    proj.status = "completed"
    proj.uptime = "100%"
    db.commit()
    
    return proj

@app.get("/api/projects/{project_id}/monitoring")
def get_project_monitoring(project_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    proj = db.query(models.Project).filter(models.Project.id == project_id, models.Project.user_id == current_user.id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
        
    metrics = deployment_simulator.generate_monitoring_metrics(project_id)
    logs = deployment_simulator.get_deployment_logs(project_id).split("\n")[-30:]
    if not logs or logs == [""]:
        logs = ["[System] Observer online. Waiting for active hosted traffic..."]

    error_summary = "Service running smoothly."
    # If the process crashed/stopped, summarize errors
    if project_id in deployment_simulator.active_deployments:
        proc = deployment_simulator.active_deployments[project_id]["proc"]
        if proc.poll() is not None:
            log_content = deployment_simulator.get_deployment_logs(project_id)
            prompt = f"Summarize these logs and explain why the hosted server crashed:\n\n{log_content}"
            try:
                error_summary = call_llm(
                    prompt=prompt,
                    system_instruction="You are a DevOps troubleshooting agent. Summarize the crash concisely."
                )
            except Exception as e:
                error_summary = f"Hosted process offline. Code check failed: {str(e)}"
    
    return {
        "status": proj.status,
        "live_url": proj.live_url,
        "metrics": metrics["metrics"],
        "logs": logs,
        "error_summary": error_summary
    }

# --- DEPLOYMENT PREVIEW RENDER & REVERSE PROXY ROUTER ---

@app.get("/api/deployments/{project_id}", response_class=HTMLResponse)
def get_deployed_app_preview(project_id: str, db: Session = Depends(get_db)):
    proj = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not proj:
        return "<h3>Error: Deployment not found</h3>"
        
    files = proj.files or {}
    html_content = files.get("index.html", "<h3>HTML content not generated for this deployment.</h3>")
    
    # Inject monkey-patch fetch router to direct client AJAX/REST requests into FastAPI proxy route
    inject_script = f"""
    <script>
    (function() {{
        const originalFetch = window.fetch;
        const prefix = "/api/deployments/{project_id}/api";
        window.fetch = function(input, init) {{
            if (typeof input === 'string') {{
                if (input.startsWith('/api/')) {{
                    input = prefix + input.substring(4);
                }} else if (input.startsWith('http://localhost:5000/api/')) {{
                    input = prefix + input.substring(25);
                }} else if (input.startsWith('http://localhost:8000/api/')) {{
                    input = prefix + input.substring(25);
                }} else if (!input.startsWith('http') && !input.startsWith('/')) {{
                    input = prefix + '/' + input;
                }}
            }}
            return originalFetch(input, init);
        }};
    }})();
    </script>
    """
    
    if "<head>" in html_content:
        html_content = html_content.replace("<head>", f"<head>{inject_script}", 1)
    elif "<html>" in html_content:
        html_content = html_content.replace("<html>", f"<html>{inject_script}", 1)
    else:
        html_content = inject_script + html_content

    return html_content

@app.api_route("/api/deployments/{project_id}/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_deployed_app(project_id: str, path: str, req: Request, db: Session = Depends(get_db)):
    """
    Routes AJAX requests from served frontend preview to the background hosted server subprocess.
    """
    if project_id not in deployment_simulator.active_deployments:
        # Deploy on demand if project exists in database
        proj = db.query(models.Project).filter(models.Project.id == project_id).first()
        if not proj or not proj.files:
            raise HTTPException(status_code=404, detail="Active deployment server not found")
        
        live_url, deploy_logs = deployment_simulator.run_deployment_pipeline(
            project_id=proj.id,
            project_name=proj.name,
            stack=proj.stack,
            files=proj.files
        )
        if not live_url:
            raise HTTPException(status_code=500, detail="Failed to launch hosted process server.")

    deployment = deployment_simulator.active_deployments[project_id]
    port = deployment["port"]
    
    # Adapt paths based on MERN vs Python stack
    if "mern" in deployment["stack"].lower() or "node" in deployment["stack"].lower():
        url = f"http://127.0.0.1:{port}/api/{path}"
    else:
        url = f"http://127.0.0.1:{port}/{path}"

    method = req.method
    headers = {k: v for k, v in req.headers.items() if k.lower() not in ["host", "content-length"]}
    params = dict(req.query_params)
    body = await req.body()

    try:
        response = req_lib.request(
            method=method,
            url=url,
            headers=headers,
            params=params,
            data=body,
            timeout=10
        )
        
        resp_headers = {k: v for k, v in response.headers.items() if k.lower() not in ["transfer-encoding", "content-encoding", "content-length"]}
        return Response(
            content=response.content,
            status_code=response.status_code,
            headers=resp_headers
        )
    except Exception as e:
        raise HTTPException(status_code=520, detail=f"Proxy error connecting to sandboxed process server: {str(e)}")

# --- MAIN APP LIFECYCLE ---

@app.on_event("shutdown")
def shutdown_event():
    # Gracefully terminate all active background hosting subprocesses on app reload/exit
    project_ids = list(deployment_simulator.active_deployments.keys())
    for pid in project_ids:
        try:
            deployment_simulator.terminate_deployment(pid)
        except Exception:
            pass

@app.get("/")
def home():
    return {"status": "running", "service": "Autonomous DevOps Backend Service"}
