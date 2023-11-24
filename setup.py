from cx_Freeze import setup, Executable

# 运行指令  python setup.py build
setup(
    name="EbookDatabase",
    version="0.0.4.3",
    description="EbooDatabase自由开源",
    executables=[Executable("app.py", base="Console", icon="static/logo.ico")],
    options={
        "build_exe": {
            "packages": [
                "fastapi", "uvicorn", "databases", "sqlalchemy", "aiosqlite",
                "jinja2", "starlette", "pydantic", "module", "search", "httpx",
                "markdown2", "anyio._backends._asyncio"
            ],
            "include_files": ["templates", "log", "instance","static"],
        }
    },

)
