from typing import Dict, List, Any, TypedDict

class AgentState(TypedDict):
    project_id: str
    project_name: str
    stack: str
    build_only: bool
    prompt: str
    current_agent: str
    agent_states: Dict[str, str]  # node_name -> "idle" | "running" | "completed" | "failed" | "retrying"
    files: Dict[str, str]          # path -> contents
    test_results: Dict[str, Any]   # success: bool, output: str, exit_code: int
    retry_count: int
    deployment_logs: str
    live_url: str
    human_approval_required: bool
    error_message: str
    logs: List[str]
