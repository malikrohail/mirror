"""Demo website with intentionally planted UX issues for Mirror testing.

This serves a simple SaaS landing page with 10 specific UX problems
that Mirror's AI personas should reliably detect. Run with:

    python demo_site/app.py

Serves on http://localhost:5001
"""

import os
from pathlib import Path

from flask import Flask, render_template, request, jsonify, redirect, url_for

app = Flask(
    __name__,
    template_folder=str(Path(__file__).parent / "templates"),
    static_folder=str(Path(__file__).parent / "static"),
)
app.secret_key = "mirror-demo-secret"


@app.route("/")
def landing():
    """Landing page with jargon and hidden social login."""
    return render_template("landing.html")


@app.route("/pricing")
def pricing():
    """Pricing page with low-contrast text (#999 on #fff)."""
    return render_template("pricing.html")


@app.route("/signup", methods=["GET", "POST"])
def signup():
    """Signup page with 'Workspace' label, required phone, small close button."""
    if request.method == "POST":
        # Simulate validation: if email missing, reset form (planted issue #10)
        email = request.form.get("email", "").strip()
        name = request.form.get("name", "").strip()
        phone = request.form.get("phone", "").strip()
        workspace = request.form.get("workspace", "").strip()

        errors = []
        if not email:
            errors.append("Email is required")
        if not name:
            errors.append("Name is required")
        if not phone:
            errors.append("Phone number is required")
        if not workspace:
            errors.append("Workspace name is required")

        if errors:
            # Planted issue #10: form resets on validation error
            return render_template("signup.html", errors=errors)

        return redirect(url_for("verify_email"))

    return render_template("signup.html", errors=[])


@app.route("/verify-email")
def verify_email():
    """Email verification page — no confirmation message (planted issue #5)."""
    return render_template("verify_email.html")


@app.route("/onboarding")
def onboarding():
    """7-step onboarding wizard (planted issue #3)."""
    step = request.args.get("step", "1")
    return render_template("onboarding.html", step=int(step))


@app.route("/dashboard")
def dashboard():
    """Simple dashboard (task completion destination)."""
    return render_template("dashboard.html")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
