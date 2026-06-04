from pydantic import BaseModel, Field
from typing import List, Dict, Any

# Structured LLM Output Schemas
class ProgramGenerationResult(BaseModel):
    code: str = Field(description="The complete, working source code.")
    explanation: str = Field(description="Brief explanation of the algorithm and code structure.")
    complexity: str = Field(description="Time and space complexity (e.g. O(N log N) time, O(1) space).")
    test_cases: List[Dict[str, str]] = Field(description="2-3 sample test cases with 'input' and 'expected' keys.")

class BugFixResult(BaseModel):
    fixed_code: str = Field(description="The corrected complete source code.")
    explanation: str = Field(description="Explanation of the fix.")
    what_was_wrong: str = Field(description="What was causing the bug/error.")
    how_fixed: str = Field(description="How the code was corrected to resolve the issue.")

class ProjectFilesResult(BaseModel):
    files: Dict[str, str] = Field(description="A dictionary mapping relative file paths to their full file contents.")

class PlannerResult(BaseModel):
    tasks: List[str] = Field(description="List of tasks to complete the project.")

# Prompt Formatting Helpers
class PromptBuilder:
    @staticmethod
    def build_program_gen_prompt(language: str, prompt: str) -> str:
        return f"""Write a complete, optimized {language} program for the following request:
"{prompt}"

Ensure it is robust and compilation-ready. Do not include mock functions that do not work; the script must run and output results on console.
"""

    @staticmethod
    def build_bug_fix_prompt(language: str, buggy_code: str, error_logs: str) -> str:
        return f"""Analyze the following {language} code containing errors/bugs.
        
Buggy Code:
```
{buggy_code}
```

Console Error / Stacktrace Logs:
```
{error_logs}
```

Provide the fixed code that corrects this bug and passes execution.
"""

    @staticmethod
    def build_prd_prompt(project_name: str, description: str, stack: str) -> str:
        return f"""Draft a concise Product Requirements Document (PRD) in Markdown format for:
Project Name: "{project_name}"
Description: {description}
Tech Stack: {stack}

Focus on:
1. Core features and user stories.
2. REST API endpoint specifications.
3. Database schema requirements.
4. UI and layout guidelines.
"""

    @staticmethod
    def build_planner_prompt(project_name: str, prd_content: str, stack: str) -> str:
        return f"""Given the PRD for project "{project_name}" and tech stack "{stack}":
---
PRD:
{prd_content}
---

Provide a list of step-by-step milestones/tasks needed to build the project.
"""

    @staticmethod
    def build_architecture_prompt(project_name: str, prd_content: str, plan_content: str, stack: str) -> str:
        return f"""Design the architecture specification in Markdown for project "{project_name}" using stack "{stack}":
---
PRD:
{prd_content}
---
Plan:
{plan_content}
---

Output a clean specification including:
1. File structure layout tree.
2. API endpoint routes with request/response payloads.
3. Database schema details (tables, fields, relations).
"""

    @staticmethod
    def build_backend_prompt(project_name: str, prd: str, plan: str, arch: str, stack: str) -> str:
        return f"""Write the complete backend implementation files for project "{project_name}" using stack "{stack}".

Context:
PRD:
{prd}
---
Plan:
{plan}
---
Architecture:
{arch}

Instructions:
- If stack is Python: You MUST generate a working FastAPI or Flask server file (e.g. `server.py`) and a `requirements.txt`.
- If stack is MERN: You MUST generate a working Node/Express server file (e.g. `server.js`) and a `package.json` with standard dependencies (express, cors, etc.).
- Ensure all endpoints are fully coded (do not write empty placeholders or mock comments like '# implement here').
- Include real in-memory data store handling or SQLite database integration.
"""

    @staticmethod
    def build_frontend_prompt(project_name: str, prd: str, arch: str, backend_files: Dict[str, str], stack: str) -> str:
        backend_info = "\n\n".join([f"--- File: {path} ---\n{code}" for path, code in backend_files.items()])
        return f"""Write the complete frontend files using Next.js (App Router), TypeScript, and TailwindCSS for project "{project_name}".

Context:
PRD:
{prd}
---
Architecture:
{arch}
---
Backend Code:
{backend_info}

Instructions:
- You MUST generate modular Next.js components and pages using TypeScript (.tsx or .ts) and Tailwind styling.
- Create at least the following file structure:
  1. `app/layout.tsx` (Main layout rendering children and importing global styles)
  2. `app/page.tsx` (Core Next.js page component rendering a premium, modern dashboard, using Lucide Icons and standard React hooks to fetch the backend API routes)
  3. `components/dashboard-widget.tsx` or similar modular components.
  4. `components/ui/button.tsx` or `components/ui/card.tsx` (shadcn-compatible custom UI primitives styled with Tailwind CSS)
- Ensure all API fetches use relative endpoints (e.g. fetching `/api/items`) to route traffic properly.
- Return a dictionary mapping file paths (e.g. `app/page.tsx`, `components/dashboard-widget.tsx`) to their full code content.
"""

    @staticmethod
    def build_testing_prompt(project_name: str, files: Dict[str, str], stack: str) -> str:
        files_info = "\n\n".join([f"--- File: {path} ---\n{code}" for path, code in files.items()])
        return f"""Write a comprehensive test suite file for project "{project_name}" (Stack: {stack}).

Context:
Files in workspace:
{files_info}

Instructions:
- If stack is Python: Generate a test file named `test_server.py` compatible with `pytest`. It should use FastAPI's `TestClient` to make HTTP requests to the API endpoints in `server.py` and assert responses (status code, data, keys).
- If stack is Node/MERN: Generate a test file named `test.js` containing assertions that start the server or test functions, outputting verification logs to the console.
- Make sure the test assertions are real and correct based on the generated code.
"""

    @staticmethod
    def build_fix_prompt(project_name: str, files: Dict[str, str], test_output: str, stack: str) -> str:
        files_info = "\n\n".join([f"--- File: {path} ---\n{code}" for path, code in files.items()])
        return f"""The test suite for project "{project_name}" has failed. Analyze the failure and provide corrected files to resolve the issue.

Current Files:
{files_info}

Test Output Logs:
```
{test_output}
```

Instructions:
- Identify the source of the test failure.
- Modify the backend code or the tests to resolve the assertions.
- Return ONLY the updated files that need modifications.
"""
