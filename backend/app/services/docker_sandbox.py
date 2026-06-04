import os
import sys
import tempfile
import subprocess
import shutil
from typing import Dict, Any

class DockerSandbox:
    def __init__(self):
        self.use_docker = False
        try:
            import docker
            self.client = docker.from_env()
            self.client.ping()
            self.use_docker = True
        except Exception:
            self.use_docker = False

        # Find local executables
        self.python_bin = sys.executable
        # Use virtual environment python if running in one
        venv_python = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(self.python_bin))), "venv", "bin", "python")
        if os.path.exists(venv_python):
            self.python_bin = venv_python
        
        self.node_bin = shutil.which("node")

    def execute_code(self, language: str, code: str) -> Dict[str, Any]:
        """
        Executes a single code snippet in a sandbox.
        """
        lang = language.lower()
        if lang in ["python", "py"]:
            return self._run_python(code)
        elif lang in ["javascript", "js", "node"]:
            return self._run_javascript(code)
        else:
            return {
                "success": False,
                "output": f"Unsupported language for sandbox execution: {language}",
                "exit_code": -1
            }

    def execute_workspace_tests(self, workspace_files: Dict[str, str], language: str) -> Dict[str, Any]:
        """
        Writes workspace files to a temporary directory, executes the test suite,
        captures output, and cleans up the temporary files.
        """
        lang = language.lower()
        temp_dir = tempfile.mkdtemp(prefix="devops_sandbox_")
        
        try:
            # Write all files to the sandbox directory
            for rel_path, content in workspace_files.items():
                dest_path = os.path.join(temp_dir, rel_path)
                os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                with open(dest_path, "w", encoding="utf-8") as f:
                    f.write(content)

            if "python" in lang or "py" in lang:
                # Run pytest against test_server.py or any test_*.py / *_test.py
                test_file = "test_server.py"
                # Locate any file starting with test_
                for f in workspace_files.keys():
                    if f.startswith("test_") and f.endswith(".py"):
                        test_file = f
                        break
                
                # Check if pytest is available, fallback to python -m unittest or python execution
                cmd = [self.python_bin, "-m", "pytest", test_file, "-v"]
                return self._run_local_cmd(cmd, cwd=temp_dir)
                
            elif "javascript" in lang or "js" in lang or "node" in lang:
                # If there's a package.json, we might run npm test, otherwise run test.js
                test_file = "test.js"
                for f in workspace_files.keys():
                    if f.startswith("test") and f.endswith(".js"):
                        test_file = f
                        break
                
                if "package.json" in workspace_files and self.node_bin:
                    # Run node test.js directly or npm install first if package.json has dependencies
                    # For performance and offline safety in local sandbox, run node directly if test.js exists
                    if os.path.exists(os.path.join(temp_dir, test_file)):
                        cmd = [self.node_bin, test_file]
                    else:
                        cmd = ["npm", "test"]
                else:
                    if not self.node_bin:
                        return {
                            "success": False,
                            "output": "Node.js executable not found on host system.",
                            "exit_code": -1
                        }
                    cmd = [self.node_bin, test_file]
                
                return self._run_local_cmd(cmd, cwd=temp_dir)
            
            else:
                return {
                    "success": False,
                    "output": f"Sandbox workspace tests not supported for language: {language}",
                    "exit_code": -1
                }
                
        finally:
            # Clean up sandbox
            shutil.rmtree(temp_dir, ignore_errors=True)

    def _run_python(self, code: str) -> Dict[str, Any]:
        if self.use_docker:
            return self._run_in_docker("python:3.10-slim", ["python", "-c", code])
        else:
            with tempfile.NamedTemporaryFile(suffix=".py", delete=False) as f:
                f.write(code.encode("utf-8"))
                temp_name = f.name
            try:
                return self._run_local_cmd([self.python_bin, temp_name])
            finally:
                if os.path.exists(temp_name):
                    os.unlink(temp_name)

    def _run_javascript(self, code: str) -> Dict[str, Any]:
        if self.use_docker:
            with tempfile.NamedTemporaryFile(suffix=".js", delete=False) as f:
                f.write(code.encode("utf-8"))
                temp_name = f.name
            try:
                dest = "/app/script.js"
                container = self.client.containers.create(
                    image="node:18-alpine",
                    command=f"node {dest}",
                    volumes={temp_name: {"bind": dest, "mode": "ro"}},
                    network_disabled=True,
                    mem_limit="128m",
                    nano_cpus=1000000000
                )
                container.start()
                res = container.wait(timeout=5)
                logs = container.logs(stdout=True, stderr=True).decode("utf-8")
                container.remove()
                return {
                    "success": res.get("StatusCode") == 0,
                    "output": logs,
                    "exit_code": res.get("StatusCode")
                }
            except Exception as e:
                return {"success": False, "output": f"Docker Error: {str(e)}", "exit_code": -1}
            finally:
                if os.path.exists(temp_name):
                    os.unlink(temp_name)
        else:
            if not self.node_bin:
                return {
                    "success": False,
                    "output": "Node.js not installed on host machine.",
                    "exit_code": -1
                }
            with tempfile.NamedTemporaryFile(suffix=".js", delete=False) as f:
                f.write(code.encode("utf-8"))
                temp_name = f.name
            try:
                return self._run_local_cmd([self.node_bin, temp_name])
            finally:
                if os.path.exists(temp_name):
                    os.unlink(temp_name)

    def _run_in_docker(self, image: str, cmd_args: list) -> Dict[str, Any]:
        try:
            container = self.client.containers.create(
                image=image,
                command=cmd_args,
                network_disabled=True,
                mem_limit="128m",
                nano_cpus=1000000000
            )
            container.start()
            res = container.wait(timeout=5)
            logs = container.logs(stdout=True, stderr=True).decode("utf-8")
            container.remove()
            return {
                "success": res.get("StatusCode") == 0,
                "output": logs,
                "exit_code": res.get("StatusCode")
            }
        except Exception as e:
            return {"success": False, "output": f"Docker Sandbox Error: {str(e)}", "exit_code": -1}

    def _run_local_cmd(self, cmd: list, cwd: str = None) -> Dict[str, Any]:
        try:
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=10,
                cwd=cwd
            )
            return {
                "success": proc.returncode == 0,
                "output": proc.stdout + proc.stderr,
                "exit_code": proc.returncode
            }
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "output": "Execution timed out (Limit: 10 seconds)",
                "exit_code": -2
            }
        except Exception as e:
            return {
                "success": False,
                "output": f"Sandbox execution error: {str(e)}",
                "exit_code": -3
            }

sandbox = DockerSandbox()
