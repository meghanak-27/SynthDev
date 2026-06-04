import uuid
from typing import Dict, Any
from app.agents.state import AgentState
from app.agents.agent_nodes import (
    run_requirement_agent,
    run_planner_agent,
    run_architecture_agent,
    run_backend_agent,
    run_frontend_agent,
    run_testing_agent,
    run_fix_agent,
    run_deployment_agent,
    run_monitoring_agent
)

# Custom LangGraph State Graph Emulator for local runtime stability
class SimulatedStateGraph:
    def __init__(self):
        self.nodes = {}
        self.edges = {}
        self.entry_point = None

    def add_node(self, name: str, action_fn):
        self.nodes[name] = action_fn

    def add_edge(self, start: str, end: str):
        self.edges[start] = end

    def set_entry_point(self, name: str):
        self.entry_point = name

    def compile(self):
        return CompiledGraph(self)

class CompiledGraph:
    def __init__(self, graph: SimulatedStateGraph):
        self.graph = graph

    def invoke(self, state: AgentState) -> AgentState:
        # Run state machine loop step by step until 'completed' or 'waiting_intervention'
        current = state.get("current_agent", self.graph.entry_point)
        state["current_agent"] = current
        
        while current and current != "completed":
            if state.get("human_approval_required", False):
                break
                
            fn = self.graph.nodes.get(current)
            if not fn:
                break
                
            # Execute node
            update = fn(state)
            
            # Apply updates to state
            for k, v in update.items():
                state[k] = v
                
            current = state.get("current_agent")
            
        return state

def create_agent_graph():
    # Attempt using real langgraph first
    try:
        from langgraph.graph import StateGraph, END
        
        workflow = StateGraph(AgentState)
        
        # Add Nodes
        workflow.add_node("Requirement Agent", run_requirement_agent)
        workflow.add_node("Planner Agent", run_planner_agent)
        workflow.add_node("Architecture Agent", run_architecture_agent)
        workflow.add_node("Backend Agent", run_backend_agent)
        workflow.add_node("Frontend Agent", run_frontend_agent)
        workflow.add_node("Testing Agent", run_testing_agent)
        workflow.add_node("Fix Agent", run_fix_agent)
        workflow.add_node("Deployment Agent", run_deployment_agent)
        workflow.add_node("Monitoring Agent", run_monitoring_agent)
        
        # Define transitions
        # In a real LangGraph setup, node transitions are managed by edges or conditional paths.
        # We model them based on the current_agent value updated inside node functions
        workflow.set_entry_point("Requirement Agent")
        
        # Connect nodes directly for linear progression
        workflow.add_edge("Requirement Agent", "Planner Agent")
        workflow.add_edge("Planner Agent", "Architecture Agent")
        workflow.add_edge("Architecture Agent", "Backend Agent")
        workflow.add_edge("Backend Agent", "Frontend Agent")
        workflow.add_edge("Frontend Agent", "Testing Agent")
        
        # Testing conditional routing
        # In this mock graph, we manage state routing explicitly in our runner.
        # For full LangGraph compatibility, we can define standard connections:
        workflow.add_edge("Testing Agent", "Deployment Agent")
        workflow.add_edge("Fix Agent", "Testing Agent")
        workflow.add_edge("Deployment Agent", "Monitoring Agent")
        workflow.add_edge("Monitoring Agent", END)
        
        # Compile graph
        return workflow.compile()
    
    except ImportError:
        # Fall back to high fidelity simulated graph
        sim = SimulatedStateGraph()
        sim.add_node("Requirement Agent", run_requirement_agent)
        sim.add_node("Planner Agent", run_planner_agent)
        sim.add_node("Architecture Agent", run_architecture_agent)
        sim.add_node("Backend Agent", run_backend_agent)
        sim.add_node("Frontend Agent", run_frontend_agent)
        sim.add_node("Testing Agent", run_testing_agent)
        sim.add_node("Fix Agent", run_fix_agent)
        sim.add_node("Deployment Agent", run_deployment_agent)
        sim.add_node("Monitoring Agent", run_monitoring_agent)
        
        sim.set_entry_point("Requirement Agent")
        return sim.compile()

agent_graph = create_agent_graph()
