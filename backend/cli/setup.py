"""Setup for the Mirror CLI tool — pip installable."""

from setuptools import setup

setup(
    name="mirror-cli",
    version="0.1.0",
    description="Mirror UX Testing CLI",
    py_modules=["mirror_cli"],
    install_requires=[
        "click>=8.1.0",
        "httpx>=0.27.0",
    ],
    entry_points={
        "console_scripts": [
            "mirror=mirror_cli:cli",
        ],
    },
)
