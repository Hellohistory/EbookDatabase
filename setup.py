from cx_Freeze import setup, Executable

# 运行指令  python setup.py build
setup(
    name="EbookDatabase",
    version="0.0.2",
    description="Local EBook Search",
    executables=[Executable("app.py", base="Console", icon="templates/logo.ico")],
    options={
        "build_exe": {
            "packages": [
                "fastapi", "uvicorn", "databases", "sqlalchemy", "aiosqlite",
                "jinja2", "starlette", "pydantic"
            ],
            "include_files": ["templates", "log", "instance"],
        }
    },

)
