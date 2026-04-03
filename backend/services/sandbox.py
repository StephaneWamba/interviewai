import httpx
from core.config import settings

LANGUAGE_MAP = {
    "python": ("python", "3.10.0"),
    "javascript": ("javascript", "18.15.0"),
    "typescript": ("typescript", "5.0.3"),
    "java": ("java", "15.0.2"),
    "go": ("go", "1.16.2"),
    "cpp": ("c++", "10.2.0"),
}

EXT_MAP = {
    "python": "py", "javascript": "js", "typescript": "ts",
    "java": "java", "go": "go", "cpp": "cpp",
}


async def execute_code(code: str, language: str, stdin: str = "") -> dict:
    """
    Execute code via E2B code interpreter (managed sandbox).
    Falls back to error dict on timeout or failure.
    """
    try:
        from e2b_code_interpreter import Sandbox

        with Sandbox(api_key=settings.e2b_api_key, timeout=30) as sandbox:
            if language == "python":
                execution = sandbox.run_code(code)
                stdout = "".join(execution.logs.stdout) if execution.logs.stdout else ""
                stderr = execution.error.traceback if execution.error else "".join(execution.logs.stderr) if execution.logs.stderr else ""
                exit_code = 1 if execution.error else 0
            else:
                # For non-Python, write file and run via bash
                ext = EXT_MAP.get(language, "txt")
                sandbox.files.write(f"solution.{ext}", code)
                result = sandbox.process.start_and_wait(f"cd /home/user && cat solution.{ext} | timeout 10 {_get_run_cmd(language)}")
                stdout = result.stdout or ""
                stderr = result.stderr or ""
                exit_code = result.exit_code

            return {"stdout": stdout, "stderr": stderr, "exit_code": exit_code}

    except ImportError:
        return {"stdout": "", "stderr": "E2B not configured", "exit_code": -1}
    except Exception as e:
        return {"stdout": "", "stderr": f"Execution error: {str(e)}", "exit_code": -1}


def _get_run_cmd(language: str) -> str:
    return {
        "javascript": "node solution.js",
        "typescript": "ts-node solution.ts",
        "go": "go run solution.go",
        "java": "javac solution.java && java solution",
    }.get(language, "echo 'Unsupported language'")
