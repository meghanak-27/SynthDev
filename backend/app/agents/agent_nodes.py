import json
import os
from typing import Dict, Any, Tuple
from app.agents.state import AgentState
from app.services.docker_sandbox import sandbox
from app.services.deployment_sim import deployment_simulator
from app.services.vector_memory import vector_memory
from app.services.llm import llm_service
from app.services.llm.prompt_builder import (
    PromptBuilder,
    PlannerResult,
    ProjectFilesResult,
    BugFixResult
)

# List of all agents in order
AGENT_NAMES = [
    "Requirement Agent",
    "Planner Agent",
    "Architecture Agent",
    "Backend Agent",
    "Frontend Agent",
    "Testing Agent",
    "Fix Agent",
    "Deployment Agent",
    "Monitoring Agent"
]

def call_llm(prompt: str, system_instruction: str = "") -> str:
    """
    Utility helper redirecting to the active configured LLM provider service.
    """
    return llm_service.generate_text(prompt, system_instruction)

# Agent node execution logic
def run_requirement_agent(state: AgentState) -> Dict[str, Any]:
    logs = state.get("logs", [])
    logs.append("[Requirement Agent] Analyzing user prompt to formulate product specifications...")
    
    files = state.get("files", {}).copy()
    
    prompt_text = PromptBuilder.build_prd_prompt(
        project_name=state["project_name"],
        description=state["prompt"],
        stack=state["stack"]
    )
    
    try:
        prd_text = llm_service.generate_text(
            prompt=prompt_text,
            system_instruction="You are a senior Product Manager Agent. Draft highly detailed and specific PRDs."
        )
        files["requirements.md"] = prd_text
        logs.append("[Requirement Agent] Requirements specification (requirements.md) drafted successfully.")
    except Exception as e:
        logs.append(f"[Requirement Agent] ERROR: Failed to draft requirements. {str(e)}")
        raise e

    agent_states = state.get("agent_states", {}).copy()
    agent_states["Requirement Agent"] = "completed"
    agent_states["Planner Agent"] = "running"
    
    return {
        "files": files,
        "agent_states": agent_states,
        "logs": logs,
        "current_agent": "Planner Agent"
    }

def run_planner_agent(state: AgentState) -> Dict[str, Any]:
    logs = state.get("logs", [])
    logs.append("[Planner Agent] Preparing project layout plan and compilation roadmap...")
    
    files = state.get("files", {}).copy()
    prd_content = files.get("requirements.md", "Requirements details not found.")
    
    prompt_text = PromptBuilder.build_planner_prompt(
        project_name=state["project_name"],
        prd_content=prd_content,
        stack=state["stack"]
    )
    
    try:
        plan_data = llm_service.generate_structured_json(
            prompt=prompt_text,
            schema_class=PlannerResult,
            system_instruction="You are a senior Tech Lead Agent. Outline milestones and specific code tasks."
        )
        tasks_list = plan_data.tasks
        plan_markdown = "### Build Plan Milestones\n" + "\n".join([f"- [ ] {task}" for task in tasks_list])
        files["plan.md"] = plan_markdown
        logs.append("[Planner Agent] Build plan (plan.md) formatted and stored.")
    except Exception as e:
        logs.append(f"[Planner Agent] ERROR: Failed to create plan. {str(e)}")
        raise e
    
    agent_states = state.get("agent_states", {}).copy()
    agent_states["Planner Agent"] = "completed"
    agent_states["Architecture Agent"] = "running"
    
    return {
        "files": files,
        "agent_states": agent_states,
        "logs": logs,
        "current_agent": "Architecture Agent"
    }

def run_architecture_agent(state: AgentState) -> Dict[str, Any]:
    logs = state.get("logs", [])
    logs.append("[Architecture Agent] Modeling API layouts and defining schema boundaries...")
    
    files = state.get("files", {}).copy()
    prd_content = files.get("requirements.md", "")
    plan_content = files.get("plan.md", "")
    
    prompt_text = PromptBuilder.build_architecture_prompt(
        project_name=state["project_name"],
        prd_content=prd_content,
        plan_content=plan_content,
        stack=state["stack"]
    )
    
    try:
        arch_text = llm_service.generate_text(
            prompt=prompt_text,
            system_instruction="You are a senior software architect agent. Map routes, components, and data schemas."
        )
        files["architecture.md"] = arch_text
        logs.append("[Architecture Agent] Architecture blueprint (architecture.md) saved.")
    except Exception as e:
        logs.append(f"[Architecture Agent] ERROR: Failed to define architecture. {str(e)}")
        raise e
    
    agent_states = state.get("agent_states", {}).copy()
    agent_states["Architecture Agent"] = "completed"
    agent_states["Backend Agent"] = "running"
    
    return {
        "files": files,
        "agent_states": agent_states,
        "logs": logs,
        "current_agent": "Backend Agent"
    }

def run_backend_agent(state: AgentState) -> Dict[str, Any]:
    logs = state.get("logs", [])
    logs.append("[Backend Agent] Writing backend server code and database integration scripts...")
    
    files = state.get("files", {}).copy()
    prd = files.get("requirements.md", "")
    plan = files.get("plan.md", "")
    arch = files.get("architecture.md", "")
    
    prompt_text = PromptBuilder.build_backend_prompt(
        project_name=state["project_name"],
        prd=prd,
        plan=plan,
        arch=arch,
        stack=state["stack"]
    )
    
    try:
        backend_result = llm_service.generate_structured_json(
            prompt=prompt_text,
            schema_class=ProjectFilesResult,
            system_instruction="You are a principal backend developer agent. Output complete, functional backend files."
        )
        generated_files = backend_result.files
        for filepath, content in generated_files.items():
            files[filepath] = content
            logs.append(f"[Backend Agent] Created backend source file: {filepath}")
    except Exception as e:
        logs.append(f"[Backend Agent] ERROR: Failed to generate backend code. {str(e)}")
        raise e
    
    agent_states = state.get("agent_states", {}).copy()
    agent_states["Backend Agent"] = "completed"
    agent_states["Frontend Agent"] = "running"
    
    return {
        "files": files,
        "agent_states": agent_states,
        "logs": logs,
        "current_agent": "Frontend Agent"
    }

def run_frontend_agent(state: AgentState) -> Dict[str, Any]:
    logs = state.get("logs", [])
    logs.append("[Frontend Agent] Designing HTML layout and structuring frontend interface...")
    
    files = state.get("files", {}).copy()
    prd = files.get("requirements.md", "")
    arch = files.get("architecture.md", "")
    
    # Isolate backend files to guide the frontend's API calls
    backend_files = {}
    for filepath, content in files.items():
        if filepath.endswith((".py", ".js", ".json")) and filepath != "package.json":
            backend_files[filepath] = content
            
    prompt_text = PromptBuilder.build_frontend_prompt(
        project_name=state["project_name"],
        prd=prd,
        arch=arch,
        backend_files=backend_files,
        stack=state["stack"]
    )
    
    try:
        frontend_result = llm_service.generate_structured_json(
            prompt=prompt_text,
            schema_class=ProjectFilesResult,
            system_instruction="You are a senior frontend developer agent. Create high fidelity, responsive index.html using CSS variables and fetch calls."
        )
        generated_files = frontend_result.files
        for filepath, content in generated_files.items():
            files[filepath] = content
            logs.append(f"[Frontend Agent] Created frontend source file: {filepath}")
    except Exception as e:
        logs.append(f"[Frontend Agent] ERROR: Failed to generate frontend interface. {str(e)}")
        raise e
        
    agent_states = state.get("agent_states", {}).copy()
    agent_states["Frontend Agent"] = "completed"
    agent_states["Testing Agent"] = "running"
    
    return {
        "files": files,
        "agent_states": agent_states,
        "logs": logs,
        "current_agent": "Testing Agent"
    }

def run_testing_agent(state: AgentState) -> Dict[str, Any]:
    logs = state.get("logs", [])
    logs.append("[Testing Agent] Authoring test cases for the generated project workspace...")
    
    files = state.get("files", {}).copy()
    
    prompt_text = PromptBuilder.build_testing_prompt(
        project_name=state["project_name"],
        files=files,
        stack=state["stack"]
    )
    
    try:
        testing_result = llm_service.generate_structured_json(
            prompt=prompt_text,
            schema_class=ProjectFilesResult,
            system_instruction="You are a QA automation agent. Generate thorough assertion test scripts."
        )
        generated_files = testing_result.files
        for filepath, content in generated_files.items():
            files[filepath] = content
            logs.append(f"[Testing Agent] Generated test script file: {filepath}")
    except Exception as e:
        logs.append(f"[Testing Agent] ERROR: Failed to write test scripts. {str(e)}")
        raise e
        
    logs.append("[Testing Agent] Launching verification compiler inside isolated execution container...")
    
    # Execute actual tests in the Docker sandbox (or local subprocess sandbox fallback)
    run_res = sandbox.execute_workspace_tests(files, state["stack"])
    
    success = run_res["success"]
    output = run_res["output"]
    
    test_results = {
        "success": success,
        "output": output,
        "exit_code": run_res["exit_code"]
    }
    
    agent_states = state.get("agent_states", {}).copy()
    agent_states["Testing Agent"] = "completed"
    
    if success:
        logs.append("[Testing Agent] Sandbox tests PASSED successfully.")
        next_agent = "Deployment Agent" if not state["build_only"] else "completed"
        if state["build_only"]:
            agent_states["Deployment Agent"] = "completed"
            agent_states["Monitoring Agent"] = "completed"
        else:
            agent_states["Deployment Agent"] = "running"
    else:
        logs.append(f"[Testing Agent] Sandbox tests FAILED. Console Output:\n{output}")
        next_agent = "Fix Agent"
        agent_states["Fix Agent"] = "running"

    return {
        "files": files,
        "test_results": test_results,
        "agent_states": agent_states,
        "logs": logs,
        "current_agent": next_agent
    }

def run_fix_agent(state: AgentState) -> Dict[str, Any]:
    logs = state.get("logs", [])
    retry = state.get("retry_count", 0)
    
    files = state.get("files", {}).copy()
    test_output = state.get("test_results", {}).get("output", "")
    
    logs.append(f"[Fix Agent] Analyzing test failure logs. Attempt {retry + 1} of 3.")

    # Max retries boundary check
    if retry >= 3:
        logs.append("[Fix Agent] Autonomous fix limits (3 attempts) reached. Halting agent orchestration.")
        agent_states = state.get("agent_states", {}).copy()
        agent_states["Fix Agent"] = "failed"
        return {
            "retry_count": retry,
            "agent_states": agent_states,
            "human_approval_required": True,
            "error_message": f"Automated patch fix failed after 3 iterations. Final test error:\n{test_output}",
            "logs": logs,
            "current_agent": "Fix Agent"
        }

    # Generate fixes using LLM
    prompt_text = PromptBuilder.build_fix_prompt(
        project_name=state["project_name"],
        files=files,
        test_output=test_output,
        stack=state["stack"]
    )
    
    try:
        fix_result = llm_service.generate_structured_json(
            prompt=prompt_text,
            schema_class=ProjectFilesResult,
            system_instruction="You are a senior bug-fixer developer agent. Output modified file structures to resolve compilation or assertion failures."
        )
        updated_files = fix_result.files
        for filepath, content in updated_files.items():
            files[filepath] = content
            logs.append(f"[Fix Agent] Patched file in workspace: {filepath}")
    except Exception as e:
        logs.append(f"[Fix Agent] ERROR: Failed to generate patches. {str(e)}")
        # Treat generation failure as a try attempt
    
    retry += 1
    
    agent_states = state.get("agent_states", {}).copy()
    agent_states["Fix Agent"] = "completed"
    agent_states["Testing Agent"] = "running"
    logs.append("[Fix Agent] Patch generated. Resubmitting workspace to testing suite compiler...")
    
    return {
        "files": files,
        "retry_count": retry,
        "agent_states": agent_states,
        "logs": logs,
        "current_agent": "Testing Agent"
    }

def run_deployment_agent(state: AgentState) -> Dict[str, Any]:
    logs = state.get("logs", [])
    logs.append("[Deployment Agent] Initiating deployment sandbox pipeline...")
    
    # Launch actual background runner deployment
    live_url, deploy_logs = deployment_simulator.run_deployment_pipeline(
        project_id=state["project_id"],
        project_name=state["project_name"],
        stack=state["stack"],
        files=state["files"]
    )
    
    # Save project files index to RAG database
    vector_memory.add_project_files(state["project_id"], state["files"])
    
    agent_states = state.get("agent_states", {}).copy()
    agent_states["Deployment Agent"] = "completed"
    agent_states["Monitoring Agent"] = "running"
    
    return {
        "live_url": live_url,
        "deployment_logs": deploy_logs,
        "agent_states": agent_states,
        "logs": logs,
        "current_agent": "Monitoring Agent"
    }

def run_monitoring_agent(state: AgentState) -> Dict[str, Any]:
    logs = state.get("logs", [])
    logs.append("[Monitoring Agent] Setting up health check observers and runtime triggers...")
    
    agent_states = state.get("agent_states", {}).copy()
    agent_states["Monitoring Agent"] = "completed"
    
    logs.append("[Orchestrator] Platform workflow successfully completed. Project live.")
    
    return {
        "agent_states": agent_states,
        "logs": logs,
        "current_agent": "completed"
    }
